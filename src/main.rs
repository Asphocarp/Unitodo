use std::sync::Arc;
use std::str;
use std::fs::{self, File};
use std::io::{self, Read, Write, Seek, SeekFrom, BufReader};
use std::path::{Path, PathBuf};
use std::collections::HashMap;
use serde::{Deserialize, Serialize};
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
use tokio_stream;

// Tonic imports
use tonic::{transport::Server, Request, Response, Status};

// Protobuf generated code module
// The actual name depends on your .proto package name and build script output.
// Assuming 'unitodo' package name in .proto and it generates unitodo.rs in OUT_DIR
pub mod unitodo_proto {
    tonic::include_proto!("unitodo"); // Matches the package name in unitodo.proto
}

// Use generated types
use unitodo_proto::{
    todo_service_server::{TodoService, TodoServiceServer},
    config_service_server::{ConfigService, ConfigServiceServer},
    GetTodosRequest, GetTodosResponse,
    EditTodoRequest, EditTodoResponse,
    AddTodoRequest, AddTodoResponse,
    MarkDoneRequest, MarkDoneResponse,
    GetConfigRequest, GetConfigResponse,
    UpdateConfigRequest, UpdateConfigResponse,
    TodoItem as ProtoTodoItem, // Alias to avoid conflict with internal TodoItem
    TodoCategory as ProtoTodoCategory, // Alias
    ConfigMessage as ProtoConfigMessage,
    RgConfigMessage as ProtoRgConfigMessage,
    ProjectConfigMessage as ProtoProjectConfigMessage,
    TodoDonePair as ProtoTodoDonePair,
};

// --- Mapping functions ---
fn to_proto_todo_item(item: &TodoItem) -> ProtoTodoItem {
    ProtoTodoItem {
        content: item.content.clone(),
        location: item.location.clone(),
        completed: item.completed,
    }
}

fn to_proto_todo_category(category_data: &TodoCategoryData) -> ProtoTodoCategory {
    ProtoTodoCategory {
        name: category_data.name.clone(),
        icon: category_data.icon.clone(),
        todos: category_data.todos.iter().map(to_proto_todo_item).collect(),
    }
}

fn from_proto_config(proto_config: ProtoConfigMessage) -> Config {
    Config {
        rg: RgConfig {
            paths: proto_config.rg.as_ref().map_or_else(Vec::new, |rg| rg.paths.clone()),
            ignore: proto_config.rg.as_ref().map_or_else(|| None, |rg| if rg.ignore.is_empty() { None } else { Some(rg.ignore.clone()) }),
            file_types: proto_config.rg.as_ref().map_or_else(|| None, |rg| if rg.file_types.is_empty() { None } else { Some(rg.file_types.clone()) }),
        },
        projects: proto_config.projects.into_iter().map(|(k, v)| {
            (k, ProjectConfig {
                patterns: v.patterns.clone(),
                append_file_path: v.append_file_path.clone(),
            })
        }).collect(),
        refresh_interval: proto_config.refresh_interval,
        editor_uri_scheme: proto_config.editor_uri_scheme,
        todo_done_pairs: proto_config.todo_done_pairs.into_iter().map(|p| vec![p.todo_marker, p.done_marker]).collect(),
        default_append_basename: proto_config.default_append_basename,
    }
}

fn to_proto_config(config: &Config) -> ProtoConfigMessage {
    ProtoConfigMessage {
        rg: Some(ProtoRgConfigMessage {
            paths: config.rg.paths.clone(),
            ignore: config.rg.ignore.clone().unwrap_or_default(),
            file_types: config.rg.file_types.clone().unwrap_or_default(),
        }),
        projects: config.projects.iter().map(|(k, v)| {
            (k.clone(), ProtoProjectConfigMessage {
                patterns: v.patterns.clone(),
                append_file_path: v.append_file_path.clone(),
            })
        }).collect(),
        refresh_interval: config.refresh_interval,
        editor_uri_scheme: config.editor_uri_scheme.clone(),
        todo_done_pairs: config.todo_done_pairs.iter().filter_map(|p| {
            if p.len() == 2 {
                Some(ProtoTodoDonePair { todo_marker: p[0].clone(), done_marker: p[1].clone() })
            } else { None }
        }).collect(),
        default_append_basename: config.default_append_basename.clone(),
    }
}

// --- Helper Functions ---
fn get_primary_config_path() -> io::Result<PathBuf> {
    home::home_dir()
        .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "Could not find home directory"))
        .map(|h| h.join(".config").join("unitodo").join("config.toml"))
}

fn get_append_file_path_in_dir(dir_path: &Path, default_basename: &str) -> PathBuf {
    dir_path.join(default_basename)
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
fn extract_cleaned_content_from_line(line: &str, effective_rg_pattern: &str) -> Result<String, io::Error> {
    let todo_pattern_re = Regex::new(effective_rg_pattern)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, format!("Invalid effective regex pattern in config for extraction: {}", e)))?;

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
        Err(io::Error::new(io::ErrorKind::NotFound, "TODO pattern not found in line for content extraction")) // UNITODO_IGNORE_LINE
    }
}

// --- Configuration Structure ---
#[derive(Deserialize, Serialize, Debug, Clone, Default)]
struct Config {
    #[serde(default)]
    rg: RgConfig,
    #[serde(default)]
    projects: HashMap<String, ProjectConfig>,
    #[serde(default = "default_refresh_interval")]
    refresh_interval: u32,
    #[serde(default = "default_editor_uri_scheme")]
    editor_uri_scheme: String,
    #[serde(default = "default_todo_done_pairs")]
    todo_done_pairs: Vec<Vec<String>>,
    #[serde(default = "default_append_basename")]
    default_append_basename: String,
}

impl Config {
    // Method to derive the rg search pattern from todo_done_pairs
    fn get_effective_rg_pattern(&self) -> String {
        if self.todo_done_pairs.is_empty() {
            // Return a pattern that is unlikely to match anything if no pairs are defined
            // This case should ideally not be hit due to serde(default) for todo_done_pairs
            return "^$".to_string(); // Matches an empty line, effectively finding nothing for todos
        }

        let patterns: Vec<String> = self.todo_done_pairs
            .iter()
            .filter_map(|pair| pair.get(0)) // Get the "todo" part of the pair
            .map(|p| regex::escape(p)) // Escape regex special characters
            .collect();
        
        patterns.join("|") // Join with OR operator for regex
    }
}

#[derive(Deserialize, Serialize, Debug, Clone, Default)]
struct RgConfig {
    // `pattern` field is removed
    #[serde(default = "default_search_paths")]
    paths: Vec<String>,
    #[serde(default)]
    ignore: Option<Vec<String>>,
    #[serde(default)]
    file_types: Option<Vec<String>>,
}

#[derive(Deserialize, Serialize, Debug, Clone, Default)]
struct ProjectConfig {
    patterns: Vec<String>,
    append_file_path: Option<String>,
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

fn default_todo_done_pairs() -> Vec<Vec<String>> {
    vec![
        vec!["- [ ] ".to_string(), "- [x] ".to_string()], // UNITODO_IGNORE_LINE
        vec!["TODO:".to_string(), "DONE:".to_string()], // UNITODO_IGNORE_LINE
        vec!["TODO".to_string(), "DONE".to_string()],   // General fallback // UNITODO_IGNORE_LINE
    ]
}

fn default_append_basename() -> String {
    "unitodo.append.md".to_string()
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
            write_config_to_path_internal(&default_config, &primary_path)?;
            drop(_guard); // Release lock immediately after write
            println!("Created default config at: {}", primary_path.display());

            Ok(default_config)
        }
    }
}

// Helper to write config to a specific path
fn write_config_to_path_internal(config: &Config, path: &Path) -> io::Result<()> {
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
#[derive(Debug, Clone, Eq, PartialEq, Ord, PartialOrd)]
struct TodoItem {
    content: String,
    location: String,
    completed: bool, // Added for consistency, though not currently parsed
}

#[derive(Debug, Clone, Eq, PartialEq)]
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


#[derive(Debug)]
struct ProcessedTodosOutput {
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
enum TodoCategoryEnum {
    Project(String),
    GitRepo(String),
    Other,
}

impl TodoCategoryEnum {
    // Helper to get name and icon for JSON output
    fn get_details(&self) -> (String, String) {
        match self {
            TodoCategoryEnum::Project(name) => (name.clone(), "".to_string()), // Nerd Font icon for project
            TodoCategoryEnum::GitRepo(name) => (name.clone(), "󰊢".to_string()), // Nerd Font icon for git repo
            TodoCategoryEnum::Other => ("Other".to_string(), "".to_string()),  // Nerd Font icon for other files
        }
    }
}

// --- Sink for grep-searcher ---
#[derive(Debug)]
struct TodoSink {
    effective_rg_pattern: String,
    matcher: RegexMatcher,
    grouped_todos: Arc<ParkingMutex<HashMap<TodoCategoryEnum, Vec<TodoItem>>>>,
    current_path: PathBuf,
    debug: bool,
    start_time: Instant,
    projects: HashMap<String, ProjectConfig>,
}

impl Sink for TodoSink {
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

        // Use the *effective_rg_pattern* that was passed to the Sink
        let todo_pattern_re = match Regex::new(&self.effective_rg_pattern) {
            Ok(re) => re,
            Err(_) => {
                 eprintln!("Error: Invalid regex pattern in sink ('{}')", self.effective_rg_pattern);
                 return Err(io::Error::new(io::ErrorKind::InvalidData, "Invalid regex pattern in sink"));
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

            let mut category = TodoCategoryEnum::Other;
            let mut project_match = false;
            
            // Reinstate project-based categorization using self.projects
            for (project_name, project_config) in &self.projects {
                for pattern_str in &project_config.patterns {
                    match Pattern::new(pattern_str) {
                        Ok(pattern) => {
                            if pattern.matches(&file_path_str) {
                                category = TodoCategoryEnum::Project(project_name.clone());
                                project_match = true;
                                break;
                            }
                        }
                        Err(e) => {
                            if self.debug {
                                eprintln!("[Sink] Warning: Invalid glob pattern for project '{}' ('{}'): {}", project_name, pattern_str, e);
                            }
                        }
                    }
                }
                if project_match { break; }
            }

            if !project_match {
                match find_git_repo_name(file_path) {
                    Ok(Some(repo_name)) => category = TodoCategoryEnum::GitRepo(repo_name),
                    Ok(None) => {} // Stays Other
                    Err(e) => {
                        if self.debug {
                            eprintln!("[Sink] Warning: Failed to check git repo for {}: {}", file_path.display(), e);
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
fn find_and_process_todos(config: &Config, debug: bool) -> io::Result<ProcessedTodosOutput> {
    let start_time = Instant::now();
    if debug {
        println!("[{:.2?}] Starting TODO processing using grep-searcher", start_time.elapsed()); // UNITODO_IGNORE_LINE
    }

    let effective_pattern = config.get_effective_rg_pattern();
    if debug {
        println!("[{:.2?}] Using effective search pattern: {}", start_time.elapsed(), effective_pattern);
    }

    // 1. Compile the Regex Matcher (using derived effective_pattern)
    let matcher = match RegexMatcher::new(&effective_pattern) {
        Ok(m) => m,
        Err(e) => {
            eprintln!("Error: Invalid effective regex pattern derived from config ('{}'): {}", effective_pattern, e);
            return Err(io::Error::new(io::ErrorKind::InvalidData, format!("Invalid effective regex pattern: {}", e)));
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
    let grouped_todos = Arc::new(ParkingMutex::new(HashMap::<TodoCategoryEnum, Vec<TodoItem>>::new())); 

    builder.build_parallel().run(|| {
        let current_matcher = matcher.clone();
        let current_todos = Arc::clone(&grouped_todos);
        let sink_effective_pattern = effective_pattern.clone(); // Clone for the sink
        let sink_projects = config.projects.clone(); // Clone projects for the sink
        let is_debug = debug;
        let start_time_ref = start_time;
        let current_custom_ignores = Arc::clone(&custom_ignores);

        Box::new(move |result| {
            let entry = match result { Ok(e) => e, Err(_) => return ignore::WalkState::Continue };
            let path = entry.path();
            if current_custom_ignores.is_match(path) { return ignore::WalkState::Continue; }

            if entry.file_type().map_or(false, |ft| ft.is_file()) {
                let mut searcher = Searcher::new();
                let mut sink = TodoSink {
                    effective_rg_pattern: sink_effective_pattern.clone(), // Clone if used multiple times or further nested
                    matcher: current_matcher.clone(),
                    grouped_todos: Arc::clone(&current_todos),
                    current_path: path.to_path_buf(),
                    debug: is_debug,
                    start_time: start_time_ref,
                    projects: sink_projects.clone(), // Pass cloned projects to the sink
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
            return Err(io::Error::new(io::ErrorKind::Other, "Failed to finalize TODO grouping")); // UNITODO_IGNORE_LINE
        }
    };
    let mut categories: Vec<TodoCategoryEnum> = final_grouped_todos.keys().cloned().collect();

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

    let final_data = ProcessedTodosOutput {
        categories: output_categories,
    };

    if debug {
        println!("[{:.2?}] Output processed and structured in {:.2?}", start_time.elapsed(), format_output_start.elapsed());
        println!("[{:.2?}] Total processing time: {:.2?}", start_time.elapsed(), start_time.elapsed());
    }

    Ok(final_data)
}

// --- Core todo Editing Logic --- (Accepts &Config)
fn edit_todo_in_file_grpc(config: &Config, location: &str, new_content: &str, original_content: &str, _completed: bool ) -> io::Result<()> {
    let location_parts: Vec<&str> = location.splitn(2, ':').collect();
    if location_parts.len() != 2 {
        return Err(io::Error::new(io::ErrorKind::InvalidInput, "Invalid location format"));
    }
    let file_path_str = location_parts[0];
    let line_number: usize = location_parts[1].parse().map_err(|_| io::Error::new(io::ErrorKind::InvalidInput, "Invalid line number"))?;
    if line_number == 0 { return Err(io::Error::new(io::ErrorKind::InvalidInput, "Line number cannot be 0")); }
    let line_index = line_number - 1;

    let file_path = Path::new(file_path_str);
    if !file_path.is_file() { return Err(io::Error::new(io::ErrorKind::NotFound, "File not found")); }

    let mut file = OpenOptions::new().read(true).write(true).open(file_path)?;
    file.lock_exclusive()?;
    let result = (|| {
        let mut file_content_string = String::new();
        let mut reader = BufReader::new(&file); 
        reader.read_to_string(&mut file_content_string)?;
        let mut lines: Vec<String> = file_content_string.lines().map(String::from).collect();
        if line_index >= lines.len() { return Err(io::Error::new(io::ErrorKind::InvalidInput, "Line number out of bounds")); }

        let original_line = &lines[line_index];
        let effective_rg_pattern = config.get_effective_rg_pattern();
        let todo_pattern_re = Regex::new(&effective_rg_pattern).map_err(|_| io::Error::new(io::ErrorKind::InvalidData, "bad regex"))?;

        if let Some(mat) = todo_pattern_re.find(original_line) {
            let prefix = &original_line[..mat.start()];
            let pattern_match_str = mat.as_str();
            let content_start_idx = original_line[mat.end()..].find(|c: char| !c.is_whitespace()).map_or(original_line.len(), |i| mat.end() + i);
            let current_on_disk_content = original_line[content_start_idx..].trim();

            if current_on_disk_content != original_content.trim() {
                return Err(io::Error::new(io::ErrorKind::Other, "Content has been modified"));
            }
            let spacing = &original_line[mat.end()..content_start_idx];
            lines[line_index] = format!("{}{}{}{}", prefix, pattern_match_str, spacing, new_content.trim());
            
            let new_full_content = lines.join("\n");
            let final_write_content = if file_content_string.ends_with('\n') && !new_full_content.is_empty() {
                format!("{}\n", new_full_content)
            } else {
                new_full_content
            };
            file.set_len(0)?;
            file.seek(SeekFrom::Start(0))?;
            file.write_all(final_write_content.as_bytes())?;
            Ok(())
        } else {
            Err(io::Error::new(io::ErrorKind::NotFound, "TODO pattern not found on line"))
        }
    })();
    fs2::FileExt::unlock(&file)?;
    result
}

// --- Core todo Adding Logic ---
fn add_todo_to_file_grpc(config: &Config, category_type: &str, category_name: &str, content: &str, example_item_location: Option<&str>) -> io::Result<()> {
    let target_append_file_path: PathBuf = match category_type {
        "git" => {
            let ex_loc = example_item_location.ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "Missing example_item_location for git"))?;
            let ex_path_str = ex_loc.split(':').next().ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "Invalid example_item_location format"))?;
            let repo_root = find_git_repo_root(Path::new(ex_path_str))?.ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "Could not find git repo root"))?;
            get_append_file_path_in_dir(&repo_root, &config.default_append_basename)
        }
        "project" => {
            let proj_conf = config.projects.get(category_name).ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "Project config not found"))?;
            PathBuf::from(proj_conf.append_file_path.as_ref().ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "append_file_path not configured"))?)
        }
        _ => return Err(io::Error::new(io::ErrorKind::InvalidInput, "Invalid category_type")),
    };

    let timestamp = generate_short_timestamp();
    let sanitized_content = content.replace('\n', " ").trim().to_string();
    if sanitized_content.is_empty() { return Err(io::Error::new(io::ErrorKind::InvalidInput, "Cannot add empty TODO")); } // UNITODO_IGNORE_LINE
    
    let base_line_to_append = format!("- [ ] 1@{} {}", timestamp, sanitized_content);

    if let Some(parent_dir) = target_append_file_path.parent() { fs::create_dir_all(parent_dir)?; }
    else { return Err(io::Error::new(io::ErrorKind::InvalidInput, "Invalid target append path")); }

    let mut file = OpenOptions::new().read(true).write(true).append(true).create(true).open(&target_append_file_path)?;
    file.lock_exclusive()?;
    let final_append_str = {
        let mut needs_newline = false;
        if file.metadata()?.len() > 0 {
        file.seek(SeekFrom::End(-1))?;
        let mut last_char_buf = [0; 1];
        file.read_exact(&mut last_char_buf)?;
            if last_char_buf[0] != b'\n' { needs_newline = true; }
        }
        if needs_newline { format!("\n{}", base_line_to_append) } else { base_line_to_append }
    };
    writeln!(file, "{}", final_append_str)?;
    fs2::FileExt::unlock(&file)?;
    Ok(())
}

// --- Core Logic for Marking Todo as Done ---
fn mark_todo_as_done_in_file_grpc(config: &Config, location: &str, original_content_payload: &str) -> Result<(String, bool), io::Error> {
    let location_parts: Vec<&str> = location.splitn(2, ':').collect();
    if location_parts.len() != 2 { return Err(io::Error::new(io::ErrorKind::InvalidInput, "Invalid location format")); }
    let file_path_str = location_parts[0];
    let line_number: usize = location_parts[1].parse().map_err(|_| io::Error::new(io::ErrorKind::InvalidInput, "Invalid line num"))?;
    if line_number == 0 { return Err(io::Error::new(io::ErrorKind::InvalidInput, "Line number cannot be 0")); }
    let line_index = line_number - 1;

    let file_path = Path::new(file_path_str);
    if !file_path.is_file() { return Err(io::Error::new(io::ErrorKind::NotFound, "File not found")); }

    let mut file = OpenOptions::new().read(true).write(true).open(file_path)?;
    file.lock_exclusive()?;
    let result: Result<(String, bool), io::Error> = (|| {
        let mut original_file_content_string = String::new();
        let mut reader = BufReader::new(&file);
        reader.read_to_string(&mut original_file_content_string)?;
        let mut lines: Vec<String> = original_file_content_string.lines().map(String::from).collect();
        if line_index >= lines.len() { return Err(io::Error::new(io::ErrorKind::InvalidInput, "Line out of bounds")); }
        
        let original_line_on_disk = lines[line_index].clone();
        let effective_rg_pattern = config.get_effective_rg_pattern();
        let current_disk_cleaned_content = extract_cleaned_content_from_line(&original_line_on_disk, &effective_rg_pattern)?;
        if current_disk_cleaned_content.trim() != original_content_payload.trim() {
            return Err(io::Error::new(io::ErrorKind::Other, "Content modified since load"));
        }

        let todo_done_pairs = if config.todo_done_pairs.is_empty() { default_todo_done_pairs() } else { config.todo_done_pairs.clone() };
        let mut new_line_for_file = original_line_on_disk.clone();
        let mut marker_transformed = false; 
        
        let marker_re = Regex::new(&effective_rg_pattern).map_err(|_| io::Error::new(io::ErrorKind::InvalidData, "marker regex error"))?;
        if let Some(mat) = marker_re.find(&original_line_on_disk) {
            let prefix_before_marker = &original_line_on_disk[..mat.start()];
            let matched_todo_marker = mat.as_str();
            let content_after_marker_with_space = &original_line_on_disk[mat.end()..];
            let mut transformed_marker_str = matched_todo_marker.to_string(); 

            for pair in &todo_done_pairs {
                if pair.len() == 2 && pair[0] == matched_todo_marker {
                    transformed_marker_str = pair[1].clone();
                    marker_transformed = true;
                    break;
                }
            }
            new_line_for_file = format!("{}{}{}", prefix_before_marker, transformed_marker_str, content_after_marker_with_space);
        } else {
             return Err(io::Error::new(io::ErrorKind::NotFound, "TODO pattern not found for marking done"));
        }

        let (marker_part, content_part_for_ts) = if let Some(mat) = marker_re.find(&new_line_for_file) {
            (new_line_for_file[..mat.end()].to_string(), new_line_for_file[mat.end()..].trim_start().to_string())
        } else {
            (String::new(), new_line_for_file.trim_start().to_string())
        };

        let mut parts: Vec<&str> = content_part_for_ts.splitn(2, ' ').collect();
        let mut first_word = parts.get_mut(0).map_or(String::new(), |s| s.to_string());
        let rest_of_content = parts.get(1).map_or("", |s| *s);
        
        let done_ts = format!("@@{}", generate_short_timestamp());
        let done_ts_regex = Regex::new(r"@@[A-Za-z0-9\-_]{5}").unwrap();
        if done_ts_regex.is_match(&first_word) {
            first_word = done_ts_regex.replace(&first_word, &done_ts).to_string();
        } else {
            first_word.push_str(&done_ts);
        }

        let final_content_part = if rest_of_content.is_empty() {
            first_word
        } else {
            format!("{} {}", first_word, rest_of_content)
        };
        
        let leading_space_len = new_line_for_file[marker_part.len()..].len() - content_part_for_ts.len();
        let leading_space = &new_line_for_file[marker_part.len()..marker_part.len() + leading_space_len];

        new_line_for_file = format!("{}{}{}", marker_part, leading_space, final_content_part);
        lines[line_index] = new_line_for_file;
        
        let new_full_content = lines.join("\n");
        let final_write_content = if original_file_content_string.ends_with('\n') && !new_full_content.is_empty() {
            format!("{}\n", new_full_content)
        } else {
            new_full_content
        };
        file.set_len(0)?;
        file.seek(SeekFrom::Start(0))?;
        file.write_all(final_write_content.as_bytes())?;
        
        let new_cleaned_content_for_frontend = extract_cleaned_content_from_line(
            &lines[line_index], 
            &effective_rg_pattern 
        )?;

        Ok((new_cleaned_content_for_frontend, marker_transformed))
    })();
    fs2::FileExt::unlock(&file)?;
    result
}

// --- Tonic Service Implementations ---
#[derive(Debug)]
pub struct MyTodoService {
    config_state: Arc<RwLock<Config>>,
}

#[tonic::async_trait]
impl TodoService for MyTodoService {
    async fn get_todos(&self, _request: Request<GetTodosRequest>) -> Result<Response<GetTodosResponse>, Status> {
        let config_guard = self.config_state.read();
        match find_and_process_todos(&config_guard, false) {
            Ok(processed_data) => {
                let proto_categories = processed_data.categories.iter()
                    .map(to_proto_todo_category)
                    .collect();
                Ok(Response::new(GetTodosResponse { categories: proto_categories }))
            }
            Err(e) => Err(Status::internal(format!("Failed to process todos: {}", e))),
        }
    }

    async fn edit_todo(&self, request: Request<EditTodoRequest>) -> Result<Response<EditTodoResponse>, Status> {
        let payload = request.into_inner();
        let config_guard = self.config_state.read();
        match edit_todo_in_file_grpc(&config_guard, &payload.location, &payload.new_content, &payload.original_content, payload.completed) {
            Ok(()) => Ok(Response::new(EditTodoResponse { status: "success".to_string(), message: "Todo edited successfully".to_string() })),
        Err(e) => {
                let (code, msg) = match e.kind() {
                    io::ErrorKind::NotFound => (tonic::Code::NotFound, e.to_string()),
                    io::ErrorKind::InvalidInput => (tonic::Code::InvalidArgument, e.to_string()),
                    io::ErrorKind::PermissionDenied => (tonic::Code::PermissionDenied, e.to_string()),
                    io::ErrorKind::Other if e.to_string().contains("Content has been modified") => (tonic::Code::Aborted, e.to_string()),
                    _ => (tonic::Code::Internal, format!("Failed to edit todo: {}", e)),
                };
                Err(Status::new(code, msg))
            }
        }
    }

    async fn add_todo(&self, request: Request<AddTodoRequest>) -> Result<Response<AddTodoResponse>, Status> {
        let payload = request.into_inner();
        let config_guard = self.config_state.read();
        match add_todo_to_file_grpc(&config_guard, &payload.category_type, &payload.category_name, &payload.content, payload.example_item_location.as_deref()) {
            Ok(()) => Ok(Response::new(AddTodoResponse { status: "success".to_string(), message: "Todo added successfully".to_string() })),
            Err(e) => {
                 let (code, msg) = match e.kind() {
                    io::ErrorKind::NotFound => (tonic::Code::NotFound, e.to_string()),
                    io::ErrorKind::InvalidInput => (tonic::Code::InvalidArgument, e.to_string()),
                    io::ErrorKind::PermissionDenied => (tonic::Code::PermissionDenied, e.to_string()),
                    _ => (tonic::Code::Internal, format!("Failed to add todo: {}", e)),
                };
                Err(Status::new(code, msg))
            }
        }
    }

    async fn mark_done(&self, request: Request<MarkDoneRequest>) -> Result<Response<MarkDoneResponse>, Status> {
        let payload = request.into_inner();
        let config_guard = self.config_state.read();
        match mark_todo_as_done_in_file_grpc(&config_guard, &payload.location, &payload.original_content) {
            Ok((new_content, completed_status_changed)) => { // Assuming completed_status_changed means the marker itself changed to a "done" one
                Ok(Response::new(MarkDoneResponse {
                    status: "success".to_string(),
                    message: "Todo marked as done successfully".to_string(),
                    new_content,
                    completed: completed_status_changed, // Or derive from new_content if more reliable
                }))
            }
        Err(e) => {
                 let (code, msg) = match e.kind() {
                    io::ErrorKind::NotFound => (tonic::Code::NotFound, e.to_string()),
                    io::ErrorKind::InvalidInput => (tonic::Code::InvalidArgument, e.to_string()),
                    io::ErrorKind::PermissionDenied => (tonic::Code::PermissionDenied, e.to_string()),
                    io::ErrorKind::Other if e.to_string().contains("Content modified since load") => (tonic::Code::Aborted, e.to_string()),
                    _ => (tonic::Code::Internal, format!("Failed to mark todo as done: {}", e)),
                };
                Err(Status::new(code, msg))
            }
        }
    }
}

#[derive(Debug)]
pub struct MyConfigService {
    config_state: Arc<RwLock<Config>>,
}

#[tonic::async_trait]
impl ConfigService for MyConfigService {
    async fn get_config(&self, _request: Request<GetConfigRequest>) -> Result<Response<GetConfigResponse>, Status> {
        let config_guard = self.config_state.read();
        let proto_config = to_proto_config(&config_guard);
        Ok(Response::new(GetConfigResponse { config: Some(proto_config) }))
    }

    async fn update_config(&self, request: Request<UpdateConfigRequest>) -> Result<Response<UpdateConfigResponse>, Status> {
        let proto_config_to_save = request.into_inner().config.ok_or_else(|| Status::invalid_argument("Config message is missing"))?;
        let new_config = from_proto_config(proto_config_to_save);

        let config_arc_clone = Arc::clone(&self.config_state);

        // Blocking file I/O should be offloaded
        let result = tokio::task::spawn_blocking(move || {
            let _file_guard = CONFIG_FILE_MUTEX.lock();
            let target_path = get_primary_config_path()?; // io::Result
            write_config_to_path_internal(&new_config, &target_path)?; // io::Result
            
            // If file write succeeds, update in-memory state
            let mut config_guard = config_arc_clone.write();
            *config_guard = new_config;
            Ok::<(), io::Error>(())
    }).await;

    match result {
            Ok(Ok(())) => {
            println!("Configuration updated successfully (in-memory and file).");
                Ok(Response::new(UpdateConfigResponse {
                    status: "success".to_string(),
                    message: "Configuration saved successfully.".to_string(),
                }))
            }
            Ok(Err(e)) => { // io::Error from the blocking task
                eprintln!("Error saving config: {}", e);
                Err(Status::internal(format!("Failed to save configuration: {}", e)))
            }
            Err(e) => { // JoinError from spawn_blocking (task panicked)
                eprintln!("Task panic while saving config: {}", e);
                Err(Status::internal(format!("Internal server error during config save: {}", e)))
            }
        }
    }
}

// --- Main Function (Tonic Server Setup) ---
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));
    lazy_static::initialize(&CONFIG_FILE_MUTEX);

    println!("Loading initial configuration...");
    let initial_config = load_config_from_file().expect("Fatal: Failed to load initial configuration"); 
    
    println!("Initial configuration loaded successfully.");

    let shared_config_state = Arc::new(RwLock::new(initial_config));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:0").await?;
    let addr = listener.local_addr()?;
    println!("UNITODO_GRPC_PORT={}", addr.port()); // Print the dynamically assigned port

    let todo_service = MyTodoService { config_state: Arc::clone(&shared_config_state) };
    let config_service = MyConfigService { config_state: Arc::clone(&shared_config_state) };

    println!("Unitodo gRPC server listening on {}", addr);

    Server::builder()
        .add_service(TodoServiceServer::new(todo_service))
        .add_service(ConfigServiceServer::new(config_service))
        .serve_with_incoming(tokio_stream::wrappers::TcpListenerStream::new(listener))
        .await?;
    
    Ok(())
}

// --- Removed Actix Handlers: get_todos_handler, edit_todo_handler, etc. ---