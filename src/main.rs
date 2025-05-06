use actix_web::{web, App, HttpServer, Responder, Result as ActixResult, middleware, error::ErrorInternalServerError, HttpResponse, error::ErrorBadRequest, error::ErrorNotFound};
use std::sync::Arc;
use std::str;
use std::fs::{self, File};
use std::io::{self, Read, Write, Seek, SeekFrom, BufReader};
use std::path::{Path, PathBuf};
use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use serde_json;
use glob::Pattern;
use grep_searcher::{Searcher, Sink, SinkMatch};
use grep_regex::RegexMatcher;
use ignore::WalkBuilder;
use globset::{Glob, GlobSetBuilder};
use regex::Regex;
use std::time::Instant;
use std::fs::OpenOptions;
use fs2::FileExt;
use parking_lot::{Mutex as ParkingMutex, RwLock};
use lazy_static::lazy_static;

// --- Helper Functions ---
fn get_primary_config_path() -> io::Result<PathBuf> {
    home::home_dir()
        .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "Could not find home directory"))
        .map(|h| h.join(".config").join("unitodo").join("config.toml"))
}

fn get_append_file_path_in_dir(dir_path: &Path) -> PathBuf {
    dir_path.join("unitodo.append.md")
}

fn generate_short_timestamp() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let now = SystemTime::now();
    let current_unix_timestamp = now.duration_since(UNIX_EPOCH).expect("Time went backwards").as_secs();
    let custom_epoch: u64 = 1735689600;
    let seconds_since_custom_epoch = current_unix_timestamp.saturating_sub(custom_epoch);
    let url_safe_base64_chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let mut base64_timestamp = String::with_capacity(5);
    let mask6bit = 0x3F;
    let timestamp_value = seconds_since_custom_epoch & 0x3FFFFFFF;
    base64_timestamp.push(url_safe_base64_chars.chars().nth(((timestamp_value >> 24) & mask6bit) as usize).unwrap_or('A'));
    base64_timestamp.push(url_safe_base64_chars.chars().nth(((timestamp_value >> 18) & mask6bit) as usize).unwrap_or('A'));
    base64_timestamp.push(url_safe_base64_chars.chars().nth(((timestamp_value >> 12) & mask6bit) as usize).unwrap_or('A'));
    base64_timestamp.push(url_safe_base64_chars.chars().nth(((timestamp_value >> 6) & mask6bit) as usize).unwrap_or('A'));
    base64_timestamp.push(url_safe_base64_chars.chars().nth((timestamp_value & mask6bit) as usize).unwrap_or('A'));
    base64_timestamp
}

fn get_parent_dir(p: &Path) -> Option<PathBuf> {
    if p.is_file() {
        p.parent().map(|pd| pd.to_path_buf())
    } else if p.is_dir() {
        Some(p.to_path_buf())
    } else {
        None
    }
}

fn find_git_repo_root(start_path: &Path) -> io::Result<Option<PathBuf>> {
    let mut current_path = match get_parent_dir(start_path) {
        Some(p) => p,
        None => return Ok(None),
    };
    loop {
        let git_dir = current_path.join(".git");
        if git_dir.exists() && git_dir.is_dir() {
            return Ok(Some(current_path));
        }
        if let Some(parent) = current_path.parent() {
            if parent == current_path {
                break;
            }
            current_path = parent.to_path_buf();
        } else {
            break;
        }
    }
    Ok(None)
}

// Helper function to extract cleaned content from a line, similar to TodoSink logic
fn extract_cleaned_content_from_line(line: &str, config_pattern: &str) -> Result<String, io::Error> {
    let todo_pattern_re = Regex::new(config_pattern)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, format!("Invalid regex pattern in config for extraction: {}", e)))?;

    if let Some(found_match) = todo_pattern_re.find(line) {
        let raw_todo_content = line[found_match.end()..].trim_start(); // Trim start here, full trim later
        let mut cleaned_content = raw_todo_content;

        // Order matters: specific markers like "[ ]" before general ones like "-"
        if cleaned_content.starts_with("[ ]") || cleaned_content.starts_with("[x]") || cleaned_content.starts_with("[X]") {
            cleaned_content = cleaned_content[3..].trim_start();
        }
        // Remove other common list markers if they are at the beginning of the content part
        cleaned_content = cleaned_content.trim_start_matches(|c: char| c == '-' || c == '*' || c.is_whitespace()).trim();
        Ok(cleaned_content.to_string())
    } else {
        // This case should ideally not be hit if the line was correctly identified as a todo.
        // For verification, if the pattern isn't found, it's a mismatch.
        Err(io::Error::new(io::ErrorKind::NotFound, "TODO pattern not found in line for content extraction"))
    }
}

// --- End Helper Functions ---

// --- Configuration Structure ---
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
struct Config {
    #[serde(default)]
    rg: RgConfig,
    #[serde(default)]
    projects: HashMap<String, ProjectConfig>,
    #[serde(default = "default_refresh_interval")]
    refresh_interval: u32,
    #[serde(default = "default_editor_uri_scheme")]
    editor_uri_scheme: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
struct RgConfig {
    #[serde(default = "default_rg_pattern")]
    pattern: String,
    #[serde(default = "default_search_paths")]
    paths: Vec<String>,
    #[serde(default)]
    ignore: Option<Vec<String>>,
    #[serde(default)]
    file_types: Option<Vec<String>>,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
struct ProjectConfig {
    patterns: Vec<String>,
    append_file_path: Option<String>,
}

fn default_rg_pattern() -> String {
    "TODO".to_string() // UNITODO_IGNORE_LINE
}

fn default_search_paths() -> Vec<String> {
    // Default to searching the current directory if no paths are specified
    vec![".".to_string()] 
}

// --- Defaults for Frontend settings ---
fn default_refresh_interval() -> u32 {
    5000 // Default 5 seconds
}

fn default_editor_uri_scheme() -> String {
    "vscode://file/".to_string() // Default VSCode URI
}

// --- Configuration Loading & Saving ---

// Helper function to find the configuration file path
fn find_config_path() -> Option<PathBuf> {
    let primary_path = get_primary_config_path().ok();

    let paths_to_check: [Option<PathBuf>; 3] = [
        // 1. Primary path
        primary_path.clone(), // Clone Option<PathBuf>
        // 2. Fallback ~/.unitodo (legacy?) - Consider removing later
        home::home_dir().map(|h| h.join(".unitodo")),
        // 3. Fallback ./unitodo.toml (local override)
        Some(PathBuf::from("./unitodo.toml")),
    ];

    paths_to_check.iter().filter_map(|p| p.as_ref()).find(|p| p.exists() && p.is_file()).cloned()
}

// Global Mutex to protect config *file* access during writes
lazy_static! {
    static ref CONFIG_FILE_MUTEX: ParkingMutex<()> = ParkingMutex::new(());
}

// Load config from file system
fn load_config_from_file() -> io::Result<Config> {
    match find_config_path() {
        Some(path) => {
            println!("Loading config from: {}", path.display());
            let mut file = File::open(path)?;
            let mut contents = String::new();
            file.read_to_string(&mut contents)?;
            toml::from_str(&contents)
                .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, format!("Failed to parse TOML: {}", e)))
        }
        None => {
            println!("No config file found. Attempting to create default config...");
            let default_config = Config::default();
            let primary_path = get_primary_config_path()?;

            // Ensure the directory exists
            if let Some(parent) = primary_path.parent() {
                fs::create_dir_all(parent)?;
                println!("Created config directory: {}", parent.display());
            }

            // Write the default config using the helper, acquiring the lock there
            // We acquire lock here temporarily to ensure file creation is safe
            let _guard = CONFIG_FILE_MUTEX.lock();
            write_config_to_path(&default_config, &primary_path)?;
            drop(_guard); // Release lock immediately after write
            println!("Created default config at: {}", primary_path.display());

            Ok(default_config)
        }
    }
}

// Helper to write config to a specific path
fn write_config_to_path(config: &Config, path: &Path) -> io::Result<()> {
    // This function is called internally by update_config_handler which holds the RwLock write guard
    // and also holds the CONFIG_FILE_MUTEX lock.
    let toml_string = toml::to_string_pretty(config)
        .map_err(|e| io::Error::new(io::ErrorKind::Other, format!("Failed to serialize config to TOML: {}", e)))?;

    // Write atomically: write to temp file, then rename
    let temp_path = path.with_extension("tmp");

    // Create parent directory if it doesn't exist
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    let mut temp_file = File::create(&temp_path)?;
    temp_file.write_all(toml_string.as_bytes())?;
    temp_file.sync_all()?; // Ensure data is written to disk

    fs::rename(&temp_path, path)?; // Atomic rename

    Ok(())
}

// --- Git Repository Helper ---

/// Walks up from the given path to find the root of a Git repository 
/// (containing a .git directory) and returns the repository's directory name.
fn find_git_repo_name(start_path: &Path) -> io::Result<Option<String>> {
    let mut current_path = start_path.to_path_buf();

    // Ensure we start by checking the parent directory of the file itself,
    // or the directory itself if the start_path is a directory.
    if current_path.is_file() {
        if let Some(parent) = current_path.parent() {
            current_path = parent.to_path_buf();
        } else {
            // Cannot get parent (e.g., root directory or relative path with no parent)
            return Ok(None); // Return Ok(None) if no parent
        }
    }

    loop {
        let git_dir = current_path.join(".git");
        if git_dir.exists() && git_dir.is_dir() {
            // Found .git directory, return the name of the current path
            let repo_name = current_path.file_name()
                .and_then(|name| name.to_str())
                .map(String::from);
            return Ok(repo_name); // Return Ok(Some(repo_name)) or Ok(None)
        }

        // Move up to the parent directory
        if let Some(parent) = current_path.parent() {
            // Check if we've reached the root to avoid infinite loops on certain filesystems
            if parent == current_path {
                break;
            }
            current_path = parent.to_path_buf();
        } else {
            // Reached the root or cannot go further up
            break;
        }
    }

    Ok(None) // No .git directory found in ancestor paths
}

// --- todo Data Structures for JSON Output ---
#[derive(Serialize, Debug, Clone, Eq, PartialEq, Ord, PartialOrd)]
struct TodoItem {
    content: String,
    location: String,
    completed: bool, // Added for consistency, though not currently parsed
}

#[derive(Serialize, Debug, Clone, Eq, PartialEq)]
struct TodoCategoryData {
    name: String,
    icon: String,
    todos: Vec<TodoItem>,
}

// Helper to implement sorting for TodoCategoryData based on name
impl Ord for TodoCategoryData {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        self.name.cmp(&other.name)
    }
}

impl PartialOrd for TodoCategoryData {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}


#[derive(Serialize, Debug)]
struct OutputData {
    categories: Vec<TodoCategoryData>,
}

// --- Request Payload for Editing ---
#[derive(Deserialize, Debug)]
struct EditTodoPayload {
    location: String, // "path/to/file.rs:123"
    new_content: String, // The new text content for the todo item
    original_content: String, // The original content to verify it hasn't changed
    completed: bool, // The new completion status
}

// --- Request Payload for Adding ---
#[derive(Deserialize, Debug)]
struct AddTodoPayload {
    category_type: String, // "git" or "project"
    category_name: String, // Name of the repo or project
    content: String, // The raw content for the new todo item
    // Used to find git repo root if category_type is "git"
    example_item_location: Option<String>,
}

// --- Request Payload for Marking Done ---
#[derive(Deserialize, Debug)]
struct MarkDonePayload {
    location: String, // "path/to/file.rs:123"
    original_content: String, // The 'content' field from the frontend's TodoItemType, used for verification
}

// --- todo Category Enum ---
#[derive(Debug, PartialEq, Eq, Hash, Clone, PartialOrd, Ord)]
enum TodoCategory {
    Project(String),
    GitRepo(String),
    Other,
}

impl TodoCategory {
    // Helper to get name and icon for JSON output
    fn get_details(&self) -> (String, String) {
        match self {
            TodoCategory::Project(name) => (name.clone(), "".to_string()), // Nerd Font icon for project
            TodoCategory::GitRepo(name) => (name.clone(), "󰊢".to_string()), // Nerd Font icon for git repo
            TodoCategory::Other => ("Other".to_string(), "".to_string()),  // Nerd Font icon for other files
        }
    }
}

// --- Sink for grep-searcher ---
#[derive(Debug)]
struct TodoSink<'a> {
    // config is now borrowed for the duration of the search from the read lock
    config: &'a Config, 
    matcher: RegexMatcher,
    // No change needed here, result aggregation is separate
    grouped_todos: Arc<ParkingMutex<HashMap<TodoCategory, Vec<TodoItem>>>>, 
    current_path: PathBuf,
    debug: bool,
    start_time: Instant,
}

impl<'a> Sink for TodoSink<'a> {
    type Error = io::Error;

    fn matched(&mut self, _searcher: &Searcher, mat: &SinkMatch<'_>) -> Result<bool, io::Error> {
        let line_bytes = mat.bytes();
        let line_num = mat.line_number().unwrap_or(0);
        let file_path_str = self.current_path.to_string_lossy().to_string();
        let file_path = &self.current_path;

        let line = match str::from_utf8(line_bytes) {
             Ok(s) => s.trim_end(),
             Err(_) => {
                 if self.debug {
                    eprintln!("[{:.2?}] Warning: Skipping non-UTF8 line in file: {}", self.start_time.elapsed(), self.current_path.display());
                 }
                 return Ok(true);
             }
        };

        // --- IGNORE LINE CHECK ---
        if line.contains("UNITODO_IGNORE_LINE") {
            if self.debug {
                println!("[{:.2?}] Ignoring TODO on line {} of {} due to UNITODO_IGNORE_LINE", self.start_time.elapsed(), line_num, file_path_str);
            }
            return Ok(true);
        }
        // --- END IGNORE LINE CHECK ---

        // Use the *config* regex from the borrowed config reference (using self.config)
        let todo_pattern_re = match Regex::new(&self.config.rg.pattern) {
            Ok(re) => re,
            Err(_) => {
                 eprintln!("Error: Invalid regex pattern in config during sink processing ('{}')", self.config.rg.pattern);
                 return Err(io::Error::new(io::ErrorKind::InvalidData, "Invalid regex pattern"));
             }
        };

        if let Some(found_match) = todo_pattern_re.find(line) {
            let raw_todo_content = line[found_match.end()..].trim();
            let completed = raw_todo_content.starts_with("[x]") || raw_todo_content.starts_with("[X]");
            let mut cleaned_content = raw_todo_content;
            if cleaned_content.starts_with("[ ]") || cleaned_content.starts_with("[x]") || cleaned_content.starts_with("[X]") {
                cleaned_content = cleaned_content[3..].trim_start();
            }
            cleaned_content = cleaned_content.trim_start_matches(|c: char| c == '-' || c == '*' || c.is_whitespace()).trim();

            let location = format!("{}:{}", file_path_str, line_num);

            // Determine category (using self.config)
            let mut category = TodoCategory::Other;
            let mut project_match = false;
            // Use the borrowed config's projects
            for (project_name, project_config) in &self.config.projects {
                for pattern_str in &project_config.patterns {
                    match Pattern::new(pattern_str) {
                        Ok(pattern) => {
                            if pattern.matches(&file_path_str) {
                                category = TodoCategory::Project(project_name.clone());
                                project_match = true;
                                break;
                            }
                        }
                        Err(e) => {
                            if self.debug {
                                eprintln!("Warning: Invalid glob pattern for project '{}' ('{}'): {}", project_name, pattern_str, e);
                            }
                        }
                    }
                }
                if project_match { break; }
            }
            if !project_match {
                match find_git_repo_name(file_path) {
                    Ok(Some(repo_name)) => category = TodoCategory::GitRepo(repo_name),
                    Ok(None) => {} // Stays Other
                    Err(e) => {
                        if self.debug {
                            eprintln!("Warning: Failed to check git repo for {}: {}", file_path.display(), e);
                        }
                    }
                }
            }

            let todo_item = TodoItem {
                content: cleaned_content.to_string(),
                location,
                completed,
            };

            // Lock the *separate* mutex for the results map
            let mut todos_map = self.grouped_todos.lock(); // Use ParkingMutex lock
            todos_map.entry(category)
                         .or_insert_with(Vec::new)
                         .push(todo_item);
        }

        Ok(true) // Continue searching
    }
}

// --- Core todo Finding Logic --- (Accepts &Config)
fn find_and_process_todos(config: &Config, debug: bool) -> io::Result<OutputData> {
    let start_time = Instant::now();
    if debug {
        println!("[{:.2?}] Starting TODO processing using grep-searcher", start_time.elapsed()); // UNITODO_IGNORE_LINE
    }

    // 1. Compile the Regex Matcher (using config reference)
    let matcher = match RegexMatcher::new(&config.rg.pattern) {
        Ok(m) => m,
        Err(e) => {
            eprintln!("Error: Invalid regex pattern in config ('{}'): {}", config.rg.pattern, e);
            return Err(io::Error::new(io::ErrorKind::InvalidData, format!("Invalid regex pattern in config: {}", e)));
        }
    };

    // 2. Build GlobSet for custom ignore patterns (using config reference)
    let mut custom_ignore_builder = GlobSetBuilder::new();
    if let Some(items_to_ignore) = &config.rg.ignore {
        for pattern_str in items_to_ignore {
            match Glob::new(pattern_str) {
                Ok(glob) => { custom_ignore_builder.add(glob); },
                Err(e) => {
                     if debug {
                         eprintln!("[{:.2?}] Warning: Invalid custom ignore glob pattern '{}': {}", start_time.elapsed(), pattern_str, e);
                     }
                 }
            }
        }
    }
    let custom_ignores = match custom_ignore_builder.build() {
        Ok(gs) => {
             if debug && !gs.is_empty() {
                 println!("[{:.2?}] Using custom ignore patterns from config.", start_time.elapsed());
             }
             gs
         },
         Err(e) => {
             if debug {
                eprintln!("[{:.2?}] Warning: Failed to build custom ignore GlobSet: {}", start_time.elapsed(), e);
             }
             GlobSetBuilder::new().build().unwrap() // Build empty set on error
         }
     };
     let custom_ignores = Arc::new(custom_ignores);


    // 3. Prepare the WalkBuilder (using config reference)
    let mut builder = WalkBuilder::new(&config.rg.paths[0]);
    for path in config.rg.paths.iter().skip(1) {
        builder.add(path);
    }
    builder.git_ignore(true);
    builder.ignore(true);
    builder.parents(true);

    // Still warn about file_types being unsupported (using config reference)
    if let Some(types) = &config.rg.file_types {
         if debug {
             eprintln!("Warning: config `rg.file_types` ('{:?}') not yet supported with internal search.", types);
         }
    }

    // 4. Execute the search in parallel
    let search_start = Instant::now();
    // Use ParkingMutex for potentially better contention performance
    let grouped_todos = Arc::new(ParkingMutex::new(HashMap::<TodoCategory, Vec<TodoItem>>::new())); 

    builder.build_parallel().run(|| {
        let current_matcher = matcher.clone();
        let current_todos = Arc::clone(&grouped_todos);
        // Pass the borrowed config reference into the closure
        let config_ref = config; 
        let is_debug = debug;
        let start_time_ref = start_time;
        let current_custom_ignores = Arc::clone(&custom_ignores);

        Box::new(move |result| {
            let entry = match result { Ok(e) => e, Err(_) => return ignore::WalkState::Continue };
            let path = entry.path();
            if current_custom_ignores.is_match(path) { return ignore::WalkState::Continue; }

            if entry.file_type().map_or(false, |ft| ft.is_file()) {
                let mut searcher = Searcher::new();
                // Pass the borrowed config_ref to the sink
                let mut sink = TodoSink {
                    config: config_ref,
                    matcher: current_matcher.clone(),
                    grouped_todos: Arc::clone(&current_todos),
                    current_path: path.to_path_buf(),
                    debug: is_debug,
                    start_time: start_time_ref,
                 };

                let result = searcher.search_path(&current_matcher, path, &mut sink);
                if let Err(err) = result {
                     if is_debug {
                         eprintln!("[{:.2?}] Warning: Error searching file {}: {}", start_time_ref.elapsed(), path.display(), err);
                     }
                 }
            }
            ignore::WalkState::Continue
        })
    });

    if debug {
        println!("[{:.2?}] Search completed in {:.2?}", start_time.elapsed(), search_start.elapsed());
        println!("[{:.2?}] Processing found TODOs...", start_time.elapsed()); // UNITODO_IGNORE_LINE
    }

    // 5. Process and Format Output
    let format_output_start = Instant::now();
    let mut output_categories: Vec<TodoCategoryData> = Vec::new();
    // Lock the mutex and get the final map
    let final_grouped_todos = match Arc::try_unwrap(grouped_todos) {
        Ok(mutex) => mutex.into_inner(), // No unwrap needed for ParkingMutex
        Err(_) => {
            eprintln!("Error: Could not obtain exclusive access to grouped_todos after parallel walk.");
            return Err(io::Error::new(io::ErrorKind::Other, "Failed to finalize TODO grouping"));
        }
    };
    let mut categories: Vec<TodoCategory> = final_grouped_todos.keys().cloned().collect();

    // Sort categories: Project(A-Z), GitRepo(A-Z), Other
    categories.sort();

    for category_key in categories {
        if let Some(todos) = final_grouped_todos.get(&category_key) {
            let mut sorted_todos = todos.clone();
            sorted_todos.sort_by(|a, b| natord::compare(&a.content, &b.content));
            let (name, icon) = category_key.get_details();
            let category_data = TodoCategoryData {
                name,
                icon,
                todos: sorted_todos,
            };
            output_categories.push(category_data);
        }
    }

    let final_data = OutputData {
        categories: output_categories,
    };

    if debug {
        println!("[{:.2?}] Output processed and structured in {:.2?}", start_time.elapsed(), format_output_start.elapsed());
        println!("[{:.2?}] Total processing time: {:.2?}", start_time.elapsed(), start_time.elapsed());
    }

    Ok(final_data)
}

// --- Core todo Editing Logic --- (Accepts &Config)
fn edit_todo_in_file(config: &Config, payload: &EditTodoPayload) -> io::Result<()> {
    let location_parts: Vec<&str> = payload.location.splitn(2, ':').collect();
    if location_parts.len() != 2 {
        return Err(io::Error::new(io::ErrorKind::InvalidInput, "Invalid location format. Expected 'path/to/file:line_number'"));
    }
    let file_path_str = location_parts[0];
    let line_number: usize = match location_parts[1].parse() {
        Ok(num) if num > 0 => num,
        _ => return Err(io::Error::new(io::ErrorKind::InvalidInput, "Invalid line number in location")),
    };
    let line_index = line_number - 1; // Convert to 0-based index

    let file_path = Path::new(file_path_str);
    if !file_path.exists() || !file_path.is_file() {
         return Err(io::Error::new(io::ErrorKind::NotFound, format!("File not found: {}", file_path_str)));
    }

    // 2. Open file with exclusive lock
    let mut file = OpenOptions::new().read(true).write(true).open(file_path)?;
    file.lock_exclusive()?;
    
    let result = (|| {
        // Read the file content
        let mut original_content = String::new();
        let mut file_reader = io::BufReader::new(&file);
        file_reader.read_to_string(&mut original_content)?;
        
        let lines: Vec<String> = original_content.lines().map(String::from).collect();

        // 3. Find and verify the line
        if line_index >= lines.len() {
            return Err(io::Error::new(io::ErrorKind::InvalidInput, 
                format!("Line number {} is out of bounds for file {}", line_number, file_path_str)));
        }

        let original_line = &lines[line_index];

        // Re-compile the todo pattern regex from the config to find the start of the todo text
        let todo_pattern_re = match Regex::new(&config.rg.pattern) {
            Ok(re) => re,
            Err(e) => {
                // Use eprintln for internal errors, let handler return generic server error
                eprintln!("Error: Invalid regex pattern in config ('{}'): {}", config.rg.pattern, e);
                return Err(io::Error::new(io::ErrorKind::InvalidData, "Invalid regex pattern in config"));
            }
        };

        // Find the match of the todo pattern on the target line
        if let Some(mat) = todo_pattern_re.find(original_line) {
            let prefix = &original_line[..mat.start()]; // Indentation and any preceding text
            let pattern_match = mat.as_str(); // The matched pattern (e.g., "TODO", "FIXME") // UNITODO_IGNORE_LINE
            
            // Find the index of the first non-whitespace character after the pattern match
            let content_start_index = original_line[mat.end()..]
                .find(|c: char| !c.is_whitespace())
                .map(|i| mat.end() + i)
                .unwrap_or(original_line.len()); // Use end of line if only whitespace follows pattern
            
            // Extract the current todo content to compare with the original content from the payload
            let current_content = original_line[content_start_index..].trim();
            
            // Verify the content hasn't changed since it was loaded in the UI
            if current_content != payload.original_content.trim() {
                return Err(io::Error::new(io::ErrorKind::Other, 
                    "Content has been modified since it was loaded. Edit aborted."));
            }
            
            // Capture the original spacing between the pattern and the content/checkbox
            let original_spacing = &original_line[mat.end()..content_start_index];

            // Create modified lines array
            let mut modified_lines = lines.clone();
            
            // Construct the new line using the captured original spacing and the new content
            // Format: prefix + pattern + original_spacing + new_content
            let new_line_content = format!("{}{}{}{}",
                prefix,
                pattern_match,
                original_spacing,
                payload.new_content.trim() // Directly use the new content
            );

            modified_lines[line_index] = new_line_content;
            
            // 4. Write the modified content back to the file
            let new_file_content = modified_lines.join("\n");
            // Add a trailing newline if the original file had one (important for many tools)
            let final_content = if original_content.ends_with('\n') && !new_file_content.is_empty() {
                format!("{}\n", new_file_content)
            } else {
                new_file_content
            };

            // Truncate the file and write the new content
            file.set_len(0)?;
            file.seek(io::SeekFrom::Start(0))?;
            io::Write::write_all(&mut &file, final_content.as_bytes())?;
            
            Ok(())
        } else {
            // Pattern not found on the specified line - this shouldn't happen if location came from `find_and_process_todos`
            Err(io::Error::new(io::ErrorKind::NotFound, 
                format!("TODO pattern '{}' not found on line {} of file {}", // UNITODO_IGNORE_LINE
                config.rg.pattern, line_number, file_path_str))) // UNITODO_IGNORE_LINE
        }
    })();
    
    // Ensure we unlock the file regardless of the result
    file.unlock()?;
    
    result
}

// --- Core todo Adding Logic ---
fn add_todo_to_file(config: &Config, payload: &AddTodoPayload) -> io::Result<()> {
    let target_append_file_path: PathBuf;

    // 1. Determine the target file path based on category type
    match payload.category_type.as_str() {
        "git" => {
            // Need an example location to start the search for .git
            let example_loc = payload.example_item_location.as_ref()
                .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "Missing 'example_item_location' for git category type"))?;

            let example_path_str = example_loc.split(':').next()
                .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "Invalid 'example_item_location' format"))?;

            let example_path = Path::new(example_path_str);

            let repo_root = find_git_repo_root(example_path)?
                .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, format!("Could not find git repository root starting from {}", example_path_str)))?;

            target_append_file_path = get_append_file_path_in_dir(&repo_root);
            println!("Determined git append path: {}", target_append_file_path.display()); // Debug
        }
        "project" => {
            let project_config = config.projects.get(&payload.category_name)
                .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, format!("Project configuration not found for '{}'", payload.category_name)))?;

            let append_path_str = project_config.append_file_path.as_ref()
                .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, format!("'append_file_path' not configured for project '{}'", payload.category_name)))?;

            target_append_file_path = PathBuf::from(append_path_str);
            println!("Determined project append path: {}", target_append_file_path.display()); // Debug
        }
        _ => {
            return Err(io::Error::new(io::ErrorKind::InvalidInput, format!("Invalid category_type: '{}'. Must be 'git' or 'project'.", payload.category_type)));
        }
    }

    // 2. Prepare the base content to append
    let timestamp = generate_short_timestamp();
    let sanitized_content = payload.content.replace('\n', " ").trim().to_string();
    if sanitized_content.is_empty() {
         return Err(io::Error::new(io::ErrorKind::InvalidInput, "Cannot add an empty TODO item"));
    }
    let base_line_to_append = format!("- [ ] 1@{} {}", timestamp, sanitized_content);

    // 3. Open the file, lock it, determine if newline prefix is needed, then write once.
    if let Some(parent_dir) = target_append_file_path.parent() {
        fs::create_dir_all(parent_dir)?;
        println!("Ensured directory exists: {}", parent_dir.display());
    } else {
         return Err(io::Error::new(io::ErrorKind::InvalidInput, format!("Invalid target append file path (no parent directory): {}", target_append_file_path.display())));
    }

    let mut file = OpenOptions::new()
        .read(true)   // Explicitly enable read for checking last char
        .write(true)  // Explicitly enable write
        .append(true) // Writes go to the end
        .create(true) // Create if not exists
        .open(&target_append_file_path)?;
    
    println!("Opened/Created file for R/W/Append: {}", target_append_file_path.display());

    file.lock_exclusive()?;
    println!("Locked file: {}", target_append_file_path.display());

    let final_line_to_append: String;
    let needs_initial_newline_before_write: bool;

    // Determine if a newline is needed *before* our content
    let metadata = file.metadata()?;
    if metadata.len() > 0 {
        // File has content, check last character
        println!("DEBUG: File has content (len {}), checking last char.", metadata.len());
        // Seek to the last byte of the file for reading
        // Note: append mode affects writes; reads can be from anywhere after seeking.
        file.seek(SeekFrom::End(-1))?;
        let mut last_char_buf = [0; 1];
        file.read_exact(&mut last_char_buf)?;
        if last_char_buf[0] == b'\n' {
            println!("DEBUG: Last char is already newline.");
            needs_initial_newline_before_write = false;
        } else {
            println!("DEBUG: Last char is NOT newline. Newline will be prepended.");
            needs_initial_newline_before_write = true;
        }
    } else {
        // File is empty, no preceding newline needed from our side
        println!("DEBUG: File is empty.");
        needs_initial_newline_before_write = false;
    }
    
    // Construct the final line, potentially prefixing with a newline
    if needs_initial_newline_before_write {
        final_line_to_append = format!("\n{}", base_line_to_append);
    } else {
        final_line_to_append = base_line_to_append;
    }

    // Perform the single write operation. 
    // O_APPEND (from .append(true)) should ensure this write goes to the current end of file.
    // The file offset might have been changed by previous seek/read_exact, but O_APPEND handles this for writes.
    println!("DEBUG: Attempting to write: [{}]", final_line_to_append);
    // Using writeln! will add another newline *after* final_line_to_append.
    // If final_line_to_append already starts with \n, we get \nTODO\n.
    // If file was empty, we get TODO\n.
    // If file had content ending in no newline, we get \nTODO\n.
    // If file had content ending in newline, we get TODO\n.
    // This seems correct for ensuring each TODO is on its own line and files end with newline.
    if let Err(e) = writeln!(file, "{}", final_line_to_append) {
        eprintln!("ERROR: Failed to write to file {}: {}", target_append_file_path.display(), e);
        file.unlock()?; // Attempt to unlock before propagating error
        return Err(e);
    }
    println!("Successfully wrote to file: {}", target_append_file_path.display());

    file.unlock()?;
    println!("Unlocked file: {}", target_append_file_path.display());

    Ok(())
}

// --- Core Logic for Marking Todo as Done ---
fn mark_todo_as_done_in_file(config: &Config, payload: &MarkDonePayload) -> Result<(String, bool), io::Error> {
    let location_parts: Vec<&str> = payload.location.splitn(2, ':').collect();
    if location_parts.len() != 2 {
        return Err(io::Error::new(io::ErrorKind::InvalidInput, "Invalid location format. Expected 'path/to/file:line_number'"));
    }
    let file_path_str = location_parts[0];
    let line_number: usize = match location_parts[1].parse() {
        Ok(num) if num > 0 => num,
        _ => return Err(io::Error::new(io::ErrorKind::InvalidInput, "Invalid line number in location")),
    };
    let line_index = line_number - 1;

    let file_path = Path::new(file_path_str);
    if !file_path.exists() || !file_path.is_file() {
        return Err(io::Error::new(io::ErrorKind::NotFound, format!("File not found: {}", file_path_str)));
    }

    let mut file = OpenOptions::new().read(true).write(true).open(file_path)?;
    file.lock_exclusive()?;

    let result: Result<(String, bool), io::Error> = (|| {
        let mut original_file_content_string = String::new();
        let mut reader = BufReader::new(&file);
        reader.read_to_string(&mut original_file_content_string)?;
        let mut lines: Vec<String> = original_file_content_string.lines().map(String::from).collect();

        if line_index >= lines.len() {
            return Err(io::Error::new(io::ErrorKind::InvalidInput, format!("Line {} out of bounds", line_number)));
        }
        let original_line = lines[line_index].clone(); // Clone to modify

        // 1. Verification
        let current_disk_cleaned_content = extract_cleaned_content_from_line(&original_line, &config.rg.pattern)?;
        if current_disk_cleaned_content.trim() != payload.original_content.trim() {
            eprintln!("Content mismatch: Disk='{}', Payload='{}'", current_disk_cleaned_content.trim(), payload.original_content.trim());
            return Err(io::Error::new(io::ErrorKind::Other, "Content has been modified since it was loaded. Edit aborted."));
        }

        // 2. Transformation
        let todo_done_pairs = vec![
            ("- [ ]", "- [x]"),
            ("TODO:", "DONE:"),
            ("T0DO", "D0NE"), // Assuming T0DO is literal, adjust if 0 is a placeholder
            ("TODO", "DONE"), // General fallback
        ];

        let mut new_line_for_file = original_line.clone();
        let mut marker_changed = false;
        let mut original_marker_len = 0;
        let mut new_marker_str = "".to_string();
        let mut prefix_before_marker_len = 0;

        for (todo_marker, done_marker) in todo_done_pairs {
            if let Some(marker_start_idx) = original_line.find(todo_marker) {
                new_line_for_file = original_line.replacen(todo_marker, done_marker, 1);
                marker_changed = true;
                original_marker_len = todo_marker.len();
                new_marker_str = done_marker.to_string();
                prefix_before_marker_len = marker_start_idx;
                break;
            }
        }

        if !marker_changed {
            // If no specific marker was changed (e.g. rg.pattern is "FIXME" and not in pairs),
            // we might still want to append the timestamp.
            // For now, let's assume if no pair matches, we don't alter the prefix.
            // The user request implies specific pattern changes.
            // However, we MUST have a conceptual "marker end" to find where the content starts for timestamping.
            // Fallback to config.rg.pattern match end.
            let rg_pattern_re = Regex::new(&config.rg.pattern).map_err(|_| io::Error::new(io::ErrorKind::InvalidData, "Bad rg.pattern"))?;
            if let Some(mat) = rg_pattern_re.find(&original_line) {
                 prefix_before_marker_len = mat.start(); // This is the prefix before the general pattern
                 original_marker_len = mat.len(); // Length of the general pattern itself
                 new_marker_str = mat.as_str().to_string(); // No change to marker string itself
            } else {
                return Err(io::Error::new(io::ErrorKind::NotFound, "TODO pattern (rg.pattern) not found on line for timestamping."));
            }
        }
        
        // 3. Timestamp and First Word Modification
        // The content for timestamping starts after the original marker.
        let content_starts_at = prefix_before_marker_len + original_marker_len;
        let content_part_from_original_line = original_line.get(content_starts_at..).unwrap_or("").trim_start();
        
        let parts: Vec<&str> = content_part_from_original_line.splitn(2, ' ').collect();
        let mut first_word_segment = parts.get(0).map_or("", |s| *s).to_string();
        let actual_task_description = parts.get(1).map_or("", |s| *s);

        let done_ts_str = format!("@@{}", generate_short_timestamp());
        let done_ts_regex = Regex::new(r"@@[A-Za-z0-9\-_]{5}").unwrap();

        if done_ts_regex.is_match(&first_word_segment) {
            first_word_segment = done_ts_regex.replace(&first_word_segment, &done_ts_str).to_string();
        } else {
            if !first_word_segment.is_empty() && !first_word_segment.ends_with(char::is_whitespace) {
                 // No space if first_word_segment exists and is not just whitespace.
                 // e.g. "prio@id" becomes "prio@id@@ts"
            } else if !first_word_segment.is_empty() && first_word_segment.ends_with(char::is_whitespace) {
                // If it ends with whitespace, just append: "prio@id " becomes "prio@id @@ts"
            } else {
                // If first_word_segment is empty, the timestamp becomes the first word.
                // No leading space needed.
            }
            first_word_segment.push_str(&done_ts_str);
        }
        
        let new_cleaned_content_for_frontend = if actual_task_description.is_empty() {
            first_word_segment.clone()
        } else {
            format!("{} {}", first_word_segment, actual_task_description)
        }.trim().to_string();

        // Reconstruct the line for the file
        // Prefix + new_marker_str + (space after marker from original) + first_word_segment + (space) + actual_task_description
        let prefix_str = &original_line[..prefix_before_marker_len];
        
        // Determine original spacing after marker
        let mut spacing_after_original_marker = "";
        if content_starts_at < original_line.len() { // Ensure content_starts_at is a valid index
            let potential_spacing_and_content = &original_line[content_starts_at..];
            if let Some(content_start_char_idx) = potential_spacing_and_content.find(|c: char| !c.is_whitespace()) {
                 spacing_after_original_marker = &potential_spacing_and_content[..content_start_char_idx];
            } else if !potential_spacing_and_content.is_empty() { // All whitespace after marker
                 spacing_after_original_marker = potential_spacing_and_content;
            }
        }


        let final_task_part = if actual_task_description.is_empty() {
            "".to_string()
        } else {
            // Ensure a space separates first_word from description if description exists
            format!(" {}", actual_task_description)
        };
        
        new_line_for_file = format!("{}{}{}{}{}", 
            prefix_str, 
            new_marker_str, // This is the 'DONE' or equivalent marker
            spacing_after_original_marker,
            first_word_segment, // This now contains the @@ts
            final_task_part
        );
        
        lines[line_index] = new_line_for_file;
        
        let new_file_content = lines.join("\n");
        let final_content_to_write = if original_file_content_string.ends_with('\n') && !new_file_content.is_empty() {
            format!("{}\n", new_file_content)
        } else {
            new_file_content
        };

        file.set_len(0)?;
        file.seek(io::SeekFrom::Start(0))?;
        io::Write::write_all(&mut &file, final_content_to_write.as_bytes())?;
        
        Ok((new_cleaned_content_for_frontend, true))
    })();

    file.unlock()?;
    result
}

// --- API Handler - Get Todos --- (Uses Read Lock)
async fn get_todos_handler(shared_config: web::Data<Arc<RwLock<Config>>>) -> ActixResult<impl Responder> {
    let debug_mode = false; // Keep debug off for API

    // Clone Arc for the blocking task
    let config_arc_clone = shared_config.clone();

    let result = web::block(move || {
        // Acquire read lock inside the blocking task
        let config_guard = config_arc_clone.read(); 
        // Pass a reference from the guard to the processing function
        find_and_process_todos(&config_guard, debug_mode) 
    }).await;

    match result {
        // Correctly handle nested Result from web::block
        Ok(Ok(data)) => Ok(web::Json(data)),
        Ok(Err(e)) => {
            eprintln!("Error processing TODOs: {}", e);
            Err(ErrorInternalServerError(format!("Failed to process TODOs: {}", e)))
        },
        Err(e) => {
            eprintln!("Error running blocking task for get_todos: {}", e);
            Err(ErrorInternalServerError(format!("Internal server error: {}", e)))
        }
    }
}

// --- API Handler - Edit Todo --- (Uses Read Lock)
async fn edit_todo_handler(shared_config: web::Data<Arc<RwLock<Config>>>, payload: web::Json<EditTodoPayload>) -> ActixResult<impl Responder> {
    // Clone Arc for the blocking task
    let config_arc_clone = shared_config.clone(); 
    let payload_inner = payload.into_inner(); // Move payload into the closure

    let result = web::block(move || {
        // Acquire read lock inside the blocking task
        let config_guard = config_arc_clone.read(); 
        // Pass reference from guard and the payload
        edit_todo_in_file(&config_guard, &payload_inner) 
    }).await;

    match result {
        // Correctly handle nested Result
        Ok(Ok(())) => Ok(HttpResponse::Ok().json(serde_json::json!({ "status": "success" }))),
        Ok(Err(e)) => {
            eprintln!("Error editing TODO in file: {}", e);
            let status_code = match e.kind() {
                 io::ErrorKind::NotFound => actix_web::http::StatusCode::NOT_FOUND,
                 io::ErrorKind::InvalidInput => actix_web::http::StatusCode::BAD_REQUEST,
                 io::ErrorKind::PermissionDenied => actix_web::http::StatusCode::FORBIDDEN,
                 io::ErrorKind::Other if e.to_string().contains("Content has been modified") => actix_web::http::StatusCode::CONFLICT,
                 _ => actix_web::http::StatusCode::INTERNAL_SERVER_ERROR,
            };
            let error_response = serde_json::json!({
                 "status": "error",
                 "error": e.to_string(),
                 "code": status_code.as_u16()
            });
            Ok(HttpResponse::build(status_code).json(error_response))
        },
        Err(e) => {
            eprintln!("Error running blocking task for edit: {}", e);
            Err(ErrorInternalServerError(format!("Internal server error during edit task: {}", e)))
        }
    }
}

// --- API Handler - Get Config --- (Uses Read Lock)
async fn get_config_handler(shared_config: web::Data<Arc<RwLock<Config>>>) -> ActixResult<impl Responder> {
    // Acquire read lock
    let config_guard = shared_config.read();
    // Clone the data from the guard to return
    let config_data = config_guard.clone(); 
    Ok(HttpResponse::Ok().json(config_data))
}

// --- API Handler - Update Config --- (Uses Write Lock)
async fn update_config_handler(shared_config: web::Data<Arc<RwLock<Config>>>, new_config_payload: web::Json<Config>) -> ActixResult<impl Responder> {
    let config_to_save = new_config_payload.into_inner();
    let config_arc_clone = shared_config.clone(); // Clone Arc for blocking task

    // Use web::block as saving involves file I/O
    let result = web::block(move || -> Result<(), io::Error> { // Explicitly define closure return type
        // Lock the *file access* mutex first to prevent race conditions during save
        let _file_guard = CONFIG_FILE_MUTEX.lock();
        
        // Now acquire the write lock for the in-memory state
        let mut config_guard = config_arc_clone.write();
        
        // Determine the path to write to (use the primary path)
        let target_path = get_primary_config_path()?; // Returns io::Error
        
        // Write to file using the data we intend to put into memory
        write_config_to_path(&config_to_save, &target_path)?; // Returns io::Error
        
        // If file write succeeds, update the in-memory config state
        *config_guard = config_to_save; 
        
        Ok(()) // Closure returns Ok(()) on success
    }).await;

    match result {
        // Handle Result<Result<(), io::Error>, BlockingError<io::Error>>
        Ok(Ok(())) => { // Blocking task succeeded, and inner operation succeeded
            println!("Configuration updated successfully (in-memory and file).");
             Ok(HttpResponse::Ok().json(serde_json::json!({
                 "status": "success",
                 "message": "Configuration saved successfully."
             })))
        },
        Ok(Err(e)) => { // Blocking task succeeded, but inner operation failed (io::Error)
            eprintln!("Error saving config (file I/O or path error): {}", e);
            Err(ErrorInternalServerError(format!("Failed to save configuration: {}", e)))
        },
        Err(e) => { // Blocking task itself failed (BlockingError)
             eprintln!("Error running blocking task for POST /config: {}", e);
              // Distinguish between Cancelled and Panic if needed, otherwise treat as internal error
             Err(ErrorInternalServerError(format!("Internal server error saving config: {}", e)))
        }
    }
}

// --- API Handler - Add Todo ---
async fn add_todo_handler(shared_config: web::Data<Arc<RwLock<Config>>>, payload: web::Json<AddTodoPayload>) -> ActixResult<impl Responder> {
    let config_arc_clone = shared_config.clone();
    let payload_inner = payload.into_inner();

    println!("Received add_todo request: {:?}", payload_inner); // Debug

    let result = web::block(move || {
        let config_guard = config_arc_clone.read();
        add_todo_to_file(&config_guard, &payload_inner)
    }).await;

    match result {
        Ok(Ok(())) => {
            println!("Successfully added TODO"); // Debug
            Ok(HttpResponse::Ok().json(serde_json::json!({ "status": "success", "message": "TODO added successfully." })))
        },
        Ok(Err(e)) => {
            eprintln!("Error adding TODO: {}", e);
            let status_code = match e.kind() {
                io::ErrorKind::NotFound => actix_web::http::StatusCode::NOT_FOUND,
                io::ErrorKind::InvalidInput => actix_web::http::StatusCode::BAD_REQUEST,
                io::ErrorKind::PermissionDenied => actix_web::http::StatusCode::FORBIDDEN,
                _ => actix_web::http::StatusCode::INTERNAL_SERVER_ERROR,
            };
             let error_response = serde_json::json!({
                 "status": "error",
                 "error": e.to_string(),
                 "code": status_code.as_u16()
            });
            Ok(HttpResponse::build(status_code).json(error_response))
        },
        Err(e) => { // Blocking task error
            eprintln!("Error running blocking task for add_todo: {}", e);
            Err(ErrorInternalServerError(format!("Internal server error during add task: {}", e)))
        }
    }
}

// --- API Handler - Mark Todo as Done ---
async fn mark_done_handler(shared_config: web::Data<Arc<RwLock<Config>>>, payload: web::Json<MarkDonePayload>) -> ActixResult<impl Responder> {
    let config_arc_clone = shared_config.clone();
    let payload_inner = payload.into_inner();

    println!("Received mark_done request: {:?}", payload_inner);

    let result = web::block(move || {
        let config_guard = config_arc_clone.read();
        mark_todo_as_done_in_file(&config_guard, &payload_inner)
    }).await;

    match result {
        Ok(Ok((new_content, completed))) => {
            println!("Successfully marked TODO as done. New content: {}", new_content);
            Ok(HttpResponse::Ok().json(serde_json::json!({
                "status": "success",
                "message": "TODO marked as done successfully.",
                "new_content": new_content,
                "completed": completed
            })))
        },
        Ok(Err(e)) => {
            eprintln!("Error marking TODO as done: {}", e);
            let status_code = match e.kind() {
                io::ErrorKind::NotFound => actix_web::http::StatusCode::NOT_FOUND,
                io::ErrorKind::InvalidInput => actix_web::http::StatusCode::BAD_REQUEST,
                io::ErrorKind::PermissionDenied => actix_web::http::StatusCode::FORBIDDEN,
                io::ErrorKind::Other if e.to_string().contains("Content has been modified") => actix_web::http::StatusCode::CONFLICT,
                _ => actix_web::http::StatusCode::INTERNAL_SERVER_ERROR,
            };
            let error_response = serde_json::json!({
                "status": "error",
                "error": e.to_string(),
                "code": status_code.as_u16()
            });
            Ok(HttpResponse::build(status_code).json(error_response))
        },
        Err(e) => { // Blocking task error
            eprintln!("Error running blocking task for mark_done: {}", e);
            Err(ErrorInternalServerError(format!("Internal server error during mark done task: {}", e)))
        }
    }
}

// --- Main Function (Actix Server Setup) ---
#[actix_web::main]
async fn main() {
    // Initialize logging
    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));
    lazy_static::initialize(&CONFIG_FILE_MUTEX);

    println!("Loading initial configuration...");
    let initial_config = load_config_from_file()
        .expect("Fatal: Failed to load initial configuration"); 
    
    println!("Initial configuration loaded successfully.");

    let shared_config_state: Arc<RwLock<Config>> = Arc::new(RwLock::new(initial_config)); 

    let server_address = "127.0.0.1";
    let server_port = 8080;

    println!("Starting server at http://{}:{}", server_address, server_port);

    HttpServer::new(move || {
        // Explicitly type the app_data being created
        let app_data: web::Data<Arc<RwLock<Config>>> = web::Data::new(shared_config_state.clone());
        App::new()
            .wrap(middleware::Logger::default())
            .app_data(app_data) // Pass the explicitly typed data
            .route("/todos", web::get().to(get_todos_handler))
            .route("/edit-todo", web::post().to(edit_todo_handler))
            .route("/config", web::get().to(get_config_handler))
            .route("/config", web::post().to(update_config_handler))
            .route("/add-todo", web::post().to(add_todo_handler))
            .route("/mark-done", web::post().to(mark_done_handler))
    })
    .bind((server_address, server_port))
    .expect("Failed to bind server")
    .run()
    .await
    .expect("Server failed to run")
}