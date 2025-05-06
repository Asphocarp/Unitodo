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
use std::sync::Mutex;
use std::fs::OpenOptions;
use fs2::FileExt;
use parking_lot::Mutex as ParkingMutex;
use lazy_static::lazy_static;

// --- Configuration Structure ---
#[derive(Serialize, Deserialize, Debug, Clone)]
struct Config {
    #[serde(default)]
    rg: RgConfig,
    #[serde(default)]
    projects: HashMap<String, Vec<String>>,
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

// Add a default implementation
impl Default for Config {
    fn default() -> Self {
        Config {
            rg: RgConfig::default(),
            projects: HashMap::new(),
            refresh_interval: default_refresh_interval(),
            editor_uri_scheme: default_editor_uri_scheme(),
        }
    }
}

// --- Configuration Loading & Saving ---

// Define the primary config path (~/.config/unitodo/config.toml)
fn get_primary_config_path() -> io::Result<PathBuf> {
    home::home_dir()
        .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "Could not find home directory"))
        .map(|h| h.join(".config").join("unitodo").join("config.toml"))
}

fn find_config_path() -> Option<PathBuf> {
    let primary_path = get_primary_config_path().ok();

    let paths_to_check: [Option<PathBuf>; 3] = [
        // 1. Primary path
        primary_path.clone(), // Clone Option<PathBuf>
        // 2. Fallback ~/.unitodo (legacy?) - Consider removing later
        home::home_dir().map(|h| h.join(".unitodo")), // Use map directly
        // 3. Fallback ./unitodo.toml (local override)
        Some(PathBuf::from("./unitodo.toml")),
    ];

    paths_to_check.iter().filter_map(|p| p.as_ref()).find(|p| p.exists() && p.is_file()).cloned()
}

// Global Mutex to protect config file access
lazy_static! {
    static ref CONFIG_FILE_MUTEX: ParkingMutex<()> = ParkingMutex::new(());
}

fn load_config() -> io::Result<Config> {
    let _guard = CONFIG_FILE_MUTEX.lock(); // Lock before accessing file system
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

            // Write the default config
            write_config_to_path(&default_config, &primary_path)?;
            println!("Created default config at: {}", primary_path.display());

            Ok(default_config)
        }
    }
}

// Helper to write config to a specific path
fn write_config_to_path(config: &Config, path: &Path) -> io::Result<()> {
    let toml_string = toml::to_string_pretty(config)
        .map_err(|e| io::Error::new(io::ErrorKind::Other, format!("Failed to serialize config to TOML: {}", e)))?;

    // Write atomically: write to temp file, then rename
    let temp_path = path.with_extension("tmp");
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
    config: &'a Config, // Need config to access the pattern regex
    matcher: RegexMatcher,
    grouped_todos: Arc<Mutex<HashMap<TodoCategory, Vec<TodoItem>>>>,
    current_path: PathBuf,
    debug: bool,
    start_time: Instant,
}

impl<'a> Sink for TodoSink<'a> {
    type Error = io::Error;

    fn matched(&mut self, _searcher: &Searcher, mat: &SinkMatch<'_>) -> Result<bool, io::Error> {
        let line_bytes = mat.bytes();
        let line_num = mat.line_number().unwrap_or(0); // Should always have line number

        // Use the path stored in the sink state
        let file_path_str = self.current_path.to_string_lossy().to_string();
        let file_path = &self.current_path; // Use the PathBuf directly for categorization

        let line = match str::from_utf8(line_bytes) {
            Ok(s) => s.trim_end(), // Trim trailing newline if present
            Err(_) => {
                if self.debug {
                    eprintln!("[{:.2?}] Warning: Skipping non-UTF8 line in file: {}", self.start_time.elapsed(), self.current_path.display());
                }
                return Ok(true); // Continue searching
            }
        };

        // --- IGNORE LINE CHECK ---
        if line.contains("UNITODO_IGNORE_LINE") {
            if self.debug {
                println!("[{:.2?}] Ignoring TODO on line {} of {} due to UNITODO_IGNORE_LINE", self.start_time.elapsed(), line_num, file_path_str);
            }
            return Ok(true); // Skip this match, continue searching file
        }
        // --- END IGNORE LINE CHECK ---

        // Now, use the *config* regex to extract the content *after* the pattern
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

            // Use file_path_str derived from self.current_path
            let location = format!("{}:{}", file_path_str, line_num);

            // Determine category using file_path (&PathBuf)
            let mut category = TodoCategory::Other;
            let mut project_match = false;
            for (project_name, glob_patterns) in &self.config.projects {
                for pattern_str in glob_patterns {
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
                // Use file_path (&PathBuf) for find_git_repo_name
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

            // Lock the mutex to safely insert the item
            let mut todos_map = self.grouped_todos.lock().unwrap();
            todos_map.entry(category)
                         .or_insert_with(Vec::new)
                         .push(todo_item);

        }

        Ok(true) // Continue searching
    }
}

// --- Core todo Finding Logic ---
fn find_and_process_todos(config: &Config, debug: bool) -> io::Result<OutputData> {
    let start_time = Instant::now();
    if debug {
        println!("[{:.2?}] Starting TODO processing using grep-searcher", start_time.elapsed()); // UNITODO_IGNORE_LINE
    }

    // 1. Compile the Regex Matcher for TODO pattern // UNITODO_IGNORE_LINE
    let matcher = match RegexMatcher::new(&config.rg.pattern) {
        Ok(m) => m,
        Err(e) => {
            eprintln!("Error: Invalid regex pattern in config ('{}'): {}", config.rg.pattern, e);
            return Err(io::Error::new(io::ErrorKind::InvalidData, format!("Invalid regex pattern in config: {}", e)));
        }
    };

    // 2. Build GlobSet for custom ignore patterns from config
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
     let custom_ignores = Arc::new(custom_ignores); // Wrap in Arc for sharing


    // 3. Prepare the WalkBuilder (without overrides)
    let mut builder = WalkBuilder::new(&config.rg.paths[0]);
    for path in config.rg.paths.iter().skip(1) {
        builder.add(path);
    }
    builder.git_ignore(true);  // Standard gitignore handling
    builder.ignore(true);  // Standard .ignore handling
    builder.parents(true); // Standard parent ignore handling

    // Still warn about file_types being unsupported
    if let Some(types) = &config.rg.file_types {
         if debug {
             eprintln!("Warning: config `rg.file_types` ('{:?}') not yet supported with internal search.", types);
         }
    }

    // 4. Execute the search in parallel
    let search_start = Instant::now();
    let grouped_todos = Arc::new(Mutex::new(HashMap::<TodoCategory, Vec<TodoItem>>::new()));

    builder.build_parallel().run(|| {
        let current_matcher = matcher.clone();
        let current_todos = Arc::clone(&grouped_todos);
        let config_ref = config;
        let is_debug = debug;
        let start_time_ref = start_time;
        let current_custom_ignores = Arc::clone(&custom_ignores); // Clone Arc<GlobSet>

        Box::new(move |result| {
            let entry = match result {
                Ok(e) => e,
                Err(err) => {
                    if is_debug { eprintln!("[{:.2?}] Warning: Error walking directory: {}", start_time_ref.elapsed(), err); }
                    return ignore::WalkState::Continue;
                }
            };

            // Check custom ignores *after* standard ignores have passed the entry
            let path = entry.path();
            if current_custom_ignores.is_match(path) {
                 if is_debug {
                     println!("[{:.2?}] Ignoring {} due to custom pattern match.", start_time_ref.elapsed(), path.display());
                 }
                 return ignore::WalkState::Continue; // Skip this entry
            }

            // Proceed only if it's a file and not matched by custom ignores
            if entry.file_type().map_or(false, |ft| ft.is_file()) {
                // Create a new searcher for each thread/task
                let mut searcher = Searcher::new();
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
        Ok(mutex) => mutex.into_inner().unwrap(), // Handle potential poisoning
        Err(_) => {
             // This should ideally not happen if all threads finished, but handle defensively
             eprintln!("Error: Could not obtain exclusive access to grouped_todos after parallel walk.");
             return Err(io::Error::new(io::ErrorKind::Other, "Failed to finalize TODO grouping")); // UNITODO_IGNORE_LINE
        }
    };
    let mut categories: Vec<TodoCategory> = final_grouped_todos.keys().cloned().collect();

    // Sort categories: Project(A-Z), GitRepo(A-Z), Other
    categories.sort();

    for category_key in categories {
        // Use final_grouped_todos directly
        if let Some(todos) = final_grouped_todos.get(&category_key) { // Use get, no mut needed now
            // Sort TodoItems alphabetically by content using natural sort
            let mut sorted_todos = todos.clone();
            sorted_todos.sort_by(|a, b| natord::compare(&a.content, &b.content));


            let (name, icon) = category_key.get_details();
            let category_data = TodoCategoryData {
                name,
                icon,
                // Use the sorted clone
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

// --- Core todo Editing Logic ---
fn edit_todo_in_file(config: &Config, payload: &EditTodoPayload) -> io::Result<()> {
    // 1. Parse location
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

    // 2. Open file with exclusive lock to prevent concurrent modifications
    let mut file = OpenOptions::new()
        .read(true)
        .write(true)
        .open(file_path)?;
    
    // Acquire an exclusive lock on the file - this will block if another process has it locked
    file.lock_exclusive()?;
    
    // Ensure we unlock the file when we're done, even if there's an error
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

// --- API Handler ---
async fn get_todos_handler(config: web::Data<Arc<Config>>) -> ActixResult<impl Responder> {
    // For simplicity, always run in non-debug mode for the API
    // Could make this configurable later if needed
    let debug_mode = false;

    // Run the core logic
    // Use web::block for potentially blocking operations like running `ag`
    let result = web::block(move || find_and_process_todos(&config, debug_mode)).await;

    match result {
        Ok(output_data_result) => match output_data_result {
             Ok(data) => Ok(web::Json(data)),
             Err(e) => {
                 eprintln!("Error processing TODOs: {}", e); // UNITODO_IGNORE_LINE
                 // Convert the io::Error into an Actix error
                 Err(ErrorInternalServerError(format!("Failed to process TODOs: {}", e))) // UNITODO_IGNORE_LINE
             }
        },
        Err(e) => {
             eprintln!("Error running blocking task: {}", e);
             Err(ErrorInternalServerError(format!("Internal server error: {}", e)))
        }
    }
}

// --- API Handler for Editing todos ---
async fn edit_todo_handler(config: web::Data<Arc<Config>>, payload: web::Json<EditTodoPayload>) -> ActixResult<impl Responder> {
    let config_clone = config.clone();
    let payload_inner = payload.into_inner(); // Move payload into the closure

    // Use web::block for file system operations
    let result = web::block(move || edit_todo_in_file(&config_clone, &payload_inner)).await;

    match result {
        Ok(Ok(())) => Ok(HttpResponse::Ok().json(serde_json::json!({ "status": "success" }))),
        Ok(Err(e)) => {
            eprintln!("Error editing TODO in file: {}", e); // UNITODO_IGNORE_LINE
            // Map specific IO errors to HTTP status codes
            let status_code = match e.kind() {
                io::ErrorKind::NotFound => actix_web::http::StatusCode::NOT_FOUND,
                io::ErrorKind::InvalidInput => actix_web::http::StatusCode::BAD_REQUEST,
                io::ErrorKind::PermissionDenied => actix_web::http::StatusCode::FORBIDDEN,
                io::ErrorKind::Other if e.to_string().contains("Content has been modified") => {
                    // Special handling for content modification conflicts
                    actix_web::http::StatusCode::CONFLICT // 409 Conflict
                },
                _ => actix_web::http::StatusCode::INTERNAL_SERVER_ERROR,
            };
            
            // Create a more detailed error response
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

// --- API Handler for Getting Config ---
async fn get_config_handler() -> ActixResult<impl Responder> {
    // Use web::block as loading might involve file I/O
    let result = web::block(|| load_config()).await;

    match result {
        Ok(Ok(config)) => Ok(HttpResponse::Ok().json(config)), // Return config as JSON
        Ok(Err(e)) => {
            eprintln!("Error loading config for GET /config: {}", e);
            Err(ErrorInternalServerError(format!("Failed to load configuration: {}", e)))
        },
        Err(e) => {
             eprintln!("Error running blocking task for GET /config: {}", e);
             Err(ErrorInternalServerError(format!("Internal server error loading config: {}", e)))
        }
    }
}

// --- API Handler for Updating Config ---
async fn update_config_handler(new_config: web::Json<Config>) -> ActixResult<impl Responder> {
    let config_to_save = new_config.into_inner();

    // Use web::block as saving involves file I/O
    let result = web::block(move || {
        let _guard = CONFIG_FILE_MUTEX.lock(); // Lock before writing
        // Determine the path to write to (use the primary path)
        let target_path = get_primary_config_path()?;
        // Ensure the directory exists
        if let Some(parent) = target_path.parent() {
            fs::create_dir_all(parent)?;
        }
        write_config_to_path(&config_to_save, &target_path)
    }).await;

    match result {
        Ok(Ok(())) => {
            println!("Configuration updated successfully.");
             Ok(HttpResponse::Ok().json(serde_json::json!({
                 "status": "success",
                 "message": "Configuration saved. Please restart the backend service for changes to take effect."
             })))
        },
        Ok(Err(e)) => {
            eprintln!("Error saving config for POST /config: {}", e);
            Err(ErrorInternalServerError(format!("Failed to save configuration: {}", e)))
        },
        Err(e) => {
             eprintln!("Error running blocking task for POST /config: {}", e);
             Err(ErrorInternalServerError(format!("Internal server error saving config: {}", e)))
        }
    }
}

// --- Main Function (Actix Server Setup) ---
#[actix_web::main]
async fn main() -> io::Result<()> {
    // Initialize logging
    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));
    // Ensure lazy_static initialization (optional, usually happens on first use)
    lazy_static::initialize(&CONFIG_FILE_MUTEX);

    println!("Loading configuration...");
    let config = match load_config() {
        Ok(cfg) => Arc::new(cfg), // Wrap config in Arc for sharing across threads
        Err(e) => {
            eprintln!("Fatal: Failed to load configuration: {}", e);
            return Err(e);
        }
    };
    println!("Configuration loaded successfully.");
    //println!("Config loaded: {:?}", *config); // Debug print if needed

    let server_address = "127.0.0.1";
    let server_port = 8080; // Example port, make configurable later if needed

    println!("Starting server at http://{}:{}", server_address, server_port);

    HttpServer::new(move || {
        App::new()
            // Enable logger middleware
            .wrap(middleware::Logger::default())
            // Share config with handlers
            .app_data(web::Data::new(config.clone()))
            // Define API routes
            .route("/todos", web::get().to(get_todos_handler))       // Route to get all todos
            .route("/edit-todo", web::post().to(edit_todo_handler))  // Route to edit a todo
            .route("/config", web::get().to(get_config_handler))     // Route to get config
            .route("/config", web::post().to(update_config_handler)) // Route to update config
    })
    .bind((server_address, server_port))?
    .run()
    .await
}