use actix_web::{web, App, HttpServer, Responder, Result as ActixResult, middleware, error::ErrorInternalServerError, HttpResponse};
use std::sync::Arc;
use std::process::Command;
use std::str;
use std::fs::File;
use std::io::{self, Write, Read};
use std::path::{Path, PathBuf};
use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use serde_json;
use glob::Pattern;
use regex::Regex;
use std::time::Instant;

// --- Configuration Structure ---
#[derive(Deserialize, Debug, Default, Clone)] // Added Clone
struct Config {
    #[serde(default = "default_output_file")]
    output_file: String,
    #[serde(default)]
    ag: AgConfig,
    #[serde(default)] // Projects map: Project name -> List of glob patterns
    projects: HashMap<String, Vec<String>>,
}

#[derive(Deserialize, Debug, Default, Clone)] // Add Clone here
struct AgConfig {
    #[serde(default = "default_ag_pattern")]
    pattern: String,
    #[serde(default = "default_search_paths")]
    paths: Vec<String>,
    #[serde(default)]
    ignore: Option<Vec<String>>,
    #[serde(default)]
    file_types: Option<Vec<String>>,
}

fn default_output_file() -> String {
    "unitodo.sync.json".to_string()
}

fn default_ag_pattern() -> String {
    "TODO".to_string()
}

fn default_search_paths() -> Vec<String> {
    // Default to searching the current directory if no paths are specified
    vec![".".to_string()] 
}

// --- Configuration Loading ---
fn find_config_path() -> Option<PathBuf> {
    let home_dir = home::home_dir();

    let paths_to_check = [
        // ~/.config/unitodo/config.toml
        home_dir.as_ref().map(|h| h.join(".config").join("unitodo").join("config.toml")),
        // ~/.unitodo
        home_dir.as_ref().map(|h| h.join(".unitodo")),
        // ./unitodo.toml
        Some(PathBuf::from("./unitodo.toml")),
    ];

    paths_to_check.iter().flatten().find(|p| p.exists() && p.is_file()).cloned()
}

fn load_config() -> io::Result<Config> {
    match find_config_path() {
        Some(path) => {
            println!("Loading config from: {}", path.display()); // Info message
            let mut file = File::open(path)?;
            let mut contents = String::new();
            file.read_to_string(&mut contents)?;
            toml::from_str(&contents)
                .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, format!("Failed to parse TOML: {}", e)))
        }
        None => {
            println!("No config file found, using defaults."); // Info message
            Ok(Config::default()) // Return default config if no file found
        }
    }
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
            return Ok(None);
        }
    }

    loop {
        let git_dir = current_path.join(".git");
        if git_dir.exists() && git_dir.is_dir() {
            // Found .git directory, return the name of the current path
            let repo_name = current_path.file_name()
                .and_then(|name| name.to_str())
                .map(String::from);
            return Ok(repo_name);
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

// --- TODO Data Structures for JSON Output ---
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
    new_content: String, // The new text content for the TODO item
    completed: bool, // The new completion status
}

// --- TODO Category Enum ---
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

// --- Core TODO Finding Logic ---
fn find_and_process_todos(config: &Config, debug: bool) -> io::Result<OutputData> {
    let start_time = Instant::now();

    if debug {
        println!("[{:.2?}] Starting TODO processing", start_time.elapsed());
    }

    // Construct the command to run `ag`
    let build_command_start = Instant::now();
    let mut command = Command::new("ag");
    command.arg("--noheading"); // Prevent ag from printing filename headers
    command.arg(&config.ag.pattern); // Use the pattern from config

    // Add ignored patterns/directories
    if let Some(items_to_ignore) = &config.ag.ignore {
        for item in items_to_ignore {
            command.arg("--ignore");
            command.arg(item);
        }
    }

    // Add file types (e.g., --rust, --py)
    if let Some(types) = &config.ag.file_types {
        for ftype in types {
            command.arg(format!("--{}", ftype));
        }
    }

    // Add paths to search (should come after options)
    for path in &config.ag.paths {
        command.arg(path);
    }
    if debug {
        println!("[{:.2?}] Command constructed in {:.2?}", start_time.elapsed(), build_command_start.elapsed());
        println!("[{:.2?}] Running command: {:?}", start_time.elapsed(), command);
    }

    // Execute the command and capture its output
    let run_ag_start = Instant::now();
    let output = command.output()?;
    if debug {
        println!("[{:.2?}] ag command finished in {:.2?}", start_time.elapsed(), run_ag_start.elapsed());
    }

    // Check if the command executed successfully
    if output.status.success() {
        let process_output_start = Instant::now();
        if debug {
            println!("[{:.2?}] Processing ag output...", start_time.elapsed());
        }
        match str::from_utf8(&output.stdout) {
            Ok(stdout_str) => {
                // Group TODOs by category, now storing TodoItem structs
                let mut grouped_todos: HashMap<TodoCategory, Vec<TodoItem>> = HashMap::new();

                // Compile the todo pattern regex from the config
                let todo_pattern_re = match Regex::new(&config.ag.pattern) {
                    Ok(re) => re,
                    Err(e) => {
                        eprintln!("Error: Invalid regex pattern in config ('{}'): {}", config.ag.pattern, e);
                        return Err(io::Error::new(io::ErrorKind::InvalidData,
                            format!("Invalid regex pattern in config: {}", e)));
                    }
                };

                for line in stdout_str.lines() {
                    let parts: Vec<&str> = line.splitn(3, ':').collect();
                    if parts.len() == 3 {
                        let file_path_str = parts[0];
                        let line_number_str = parts[1];
                        let content_part = parts[2].trim_start();

                        if let Some(mat) = todo_pattern_re.find(content_part) {
                             // Extract the raw content *after* the matched pattern
                            let raw_todo_content = content_part[mat.end()..].trim();

                            // Basic check for markdown checkbox completion - enhance as needed
                            let completed = raw_todo_content.starts_with("[x]") || raw_todo_content.starts_with("[X]");

                            // Clean the content: remove pattern, checkbox, leading markers
                            let mut cleaned_content = raw_todo_content.trim_start_matches(&config.ag.pattern).trim();
                            if cleaned_content.starts_with("[ ]") || cleaned_content.starts_with("[x]") || cleaned_content.starts_with("[X]") {
                                cleaned_content = cleaned_content[3..].trim_start();
                            }
                             cleaned_content = cleaned_content.trim_start_matches(|c: char| c == '-' || c == '*' || c.is_whitespace()).trim();


                            let file_path = Path::new(file_path_str);
                            let location = format!("{}:{}", file_path_str, line_number_str);

                            // Determine category (same logic as before)
                            let mut category = TodoCategory::Other;
                            let mut project_match = false;
                            for (project_name, glob_patterns) in &config.projects {
                                for pattern_str in glob_patterns {
                                    match Pattern::new(pattern_str) {
                                        Ok(pattern) => {
                                            if pattern.matches(file_path_str) {
                                                category = TodoCategory::Project(project_name.clone());
                                                project_match = true;
                                                break;
                                            }
                                        }
                                        Err(e) => {
                                            if debug {
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
                                        if debug {
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

                            grouped_todos.entry(category)
                                         .or_insert_with(Vec::new)
                                         .push(todo_item);
                        } // ... (rest of line parsing warnings) ...
                        else if !line.trim().is_empty() {
                            if debug {
                                eprintln!("Warning: Skipping line where pattern '{}' was not found (ag output discrepancy?): {}", config.ag.pattern, line);
                            }
                        }
                    } else if !line.trim().is_empty() {
                         if debug {
                            eprintln!("Warning: Skipping line that might be empty or unexpectedly formatted: {}", line);
                         }
                    }
                }

                // Prepare data for JSON output
                let format_output_start = Instant::now();
                let mut output_categories: Vec<TodoCategoryData> = Vec::new();
                let mut categories: Vec<TodoCategory> = grouped_todos.keys().cloned().collect();

                // Sort categories: Project(A-Z), GitRepo(A-Z), Other (using derived Ord)
                categories.sort();

                for category_key in categories {
                    if let Some(todos) = grouped_todos.get_mut(&category_key) {
                        // Sort the TodoItems alphabetically by content
                        todos.sort_by(|a, b| a.content.cmp(&b.content));

                        let (name, icon) = category_key.get_details(); // Get name and icon

                        let category_data = TodoCategoryData {
                            name,
                            icon,
                            todos: todos.clone(), // Clone the sorted todos
                        };
                        output_categories.push(category_data);
                    }
                }

                 // Sort the final categories list alphabetically by name
                 // output_categories.sort(); // Already sorted by key order which respects Project->Git->Other then alpha


                let final_data = OutputData {
                    categories: output_categories,
                };

                if debug {
                    println!("[{:.2?}] Output processed and structured in {:.2?}", start_time.elapsed(), process_output_start.elapsed());
                    println!("[{:.2?}] Structuring/sorting took {:.2?}", start_time.elapsed(), format_output_start.elapsed());
                    println!("[{:.2?}] Total processing time: {:.2?}", start_time.elapsed(), start_time.elapsed());
                }

                Ok(final_data)
            }
            Err(e) => {
                if debug {
                    eprintln!("Error converting ag output to UTF-8: {}", e);
                }
                Err(io::Error::new(io::ErrorKind::InvalidData, format!("Failed to convert ag stdout to UTF-8: {}", e)))
            }
        }
    } else {
        // If the command failed, print the error output (stderr)
        match str::from_utf8(&output.stderr) {
            Ok(stderr_str) => {
                eprintln!("ag command failed:\n{}", stderr_str);
            }
            Err(e) => {
                eprintln!("ag command failed and error converting ag stderr to UTF-8: {}", e);
            }
        }
        Err(io::Error::new(io::ErrorKind::Other, "ag command failed"))
    }
}

// --- Core TODO Editing Logic ---
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

    // 2. Read the file content
    let original_content = std::fs::read_to_string(file_path)?;
    let mut lines: Vec<String> = original_content.lines().map(String::from).collect();

    // 3. Find and modify the line
    if line_index >= lines.len() {
        return Err(io::Error::new(io::ErrorKind::InvalidInput, format!("Line number {} is out of bounds for file {}", line_number, file_path_str)));
    }

    let original_line = &lines[line_index];

    // Re-compile the todo pattern regex from the config to find the start of the todo text
    let todo_pattern_re = match Regex::new(&config.ag.pattern) {
        Ok(re) => re,
        Err(e) => {
            // Use eprintln for internal errors, let handler return generic server error
            eprintln!("Error: Invalid regex pattern in config ('{}'): {}", config.ag.pattern, e);
            return Err(io::Error::new(io::ErrorKind::InvalidData, "Invalid regex pattern in config"));
        }
    };

    // Find the match of the TODO pattern on the target line
    if let Some(mat) = todo_pattern_re.find(original_line) {
        let prefix = &original_line[..mat.start()]; // Indentation and any preceding text
        let pattern_match = mat.as_str(); // The matched pattern (e.g., "TODO", "FIXME")
        // Find the index of the first non-whitespace character after the pattern match
        let content_start_index = original_line[mat.end()..]
            .find(|c: char| !c.is_whitespace())
            .map(|i| mat.end() + i)
            .unwrap_or(original_line.len()); // Use end of line if only whitespace follows pattern
        // Capture the original spacing between the pattern and the content/checkbox
        let original_spacing = &original_line[mat.end()..content_start_index];

        // Construct the new line using the captured original spacing and the new content
        // Format: prefix + pattern + original_spacing + new_content
        let new_line_content = format!("{}{}{}{}",
            prefix,
            pattern_match,
            original_spacing,
            payload.new_content.trim() // Directly use the new content
        );

        lines[line_index] = new_line_content;
    } else {
        // Pattern not found on the specified line - this shouldn't happen if location came from `find_and_process_todos`
        return Err(io::Error::new(io::ErrorKind::NotFound, format!("TODO pattern '{}' not found on line {} of file {}", config.ag.pattern, line_number, file_path_str)));
    }

    // 4. Write the modified content back to the file
    let new_file_content = lines.join("\n");
    // Add a trailing newline if the original file had one (important for many tools)
    let final_content = if original_content.ends_with('\n') && !new_file_content.is_empty() {
        format!("{}\n", new_file_content)
    } else {
        new_file_content
    };

    // Use write which truncates/overwrites
    std::fs::write(file_path, final_content)?;

    Ok(())
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
                 eprintln!("Error processing TODOs: {}", e);
                 // Convert the io::Error into an Actix error
                 Err(ErrorInternalServerError(format!("Failed to process TODOs: {}", e)))
             }
        },
        Err(e) => {
             eprintln!("Error running blocking task: {}", e);
             Err(ErrorInternalServerError(format!("Internal server error: {}", e)))
        }
    }
}

// --- API Handler for Editing TODOs ---
async fn edit_todo_handler(config: web::Data<Arc<Config>>, payload: web::Json<EditTodoPayload>) -> ActixResult<impl Responder> {
    let config_clone = config.clone();
    let payload_inner = payload.into_inner(); // Move payload into the closure

    // Use web::block for file system operations
    let result = web::block(move || edit_todo_in_file(&config_clone, &payload_inner)).await;

    match result {
        Ok(Ok(())) => Ok(HttpResponse::Ok().json(serde_json::json!({ "status": "success" }))),
        Ok(Err(e)) => {
            eprintln!("Error editing TODO in file: {}", e);
            // Map specific IO errors to HTTP status codes
            let status_code = match e.kind() {
                io::ErrorKind::NotFound => actix_web::http::StatusCode::NOT_FOUND,
                io::ErrorKind::InvalidInput => actix_web::http::StatusCode::BAD_REQUEST,
                io::ErrorKind::PermissionDenied => actix_web::http::StatusCode::FORBIDDEN,
                _ => actix_web::http::StatusCode::INTERNAL_SERVER_ERROR,
            };
            Err(actix_web::error::InternalError::new(e.to_string(), status_code).into())
        },
        Err(e) => {
            eprintln!("Error running blocking task for edit: {}", e);
            Err(ErrorInternalServerError(format!("Internal server error during edit task: {}", e)))
        }
    }
}

// --- Main Function (Actix Server Setup) ---
#[actix_web::main]
async fn main() -> io::Result<()> {
    // Initialize logging
    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));

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
    })
    .bind((server_address, server_port))?
    .run()
    .await
}