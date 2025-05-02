use clap::Parser;
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

// --- CLI Arguments ---
#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Enable debug mode
    #[arg(short, long, default_value_t = false)]
    debug: bool,
}

// --- Configuration Structure ---
#[derive(Deserialize, Debug, Default)] // Added Default
struct Config {
    #[serde(default = "default_output_file")]
    output_file: String,
    #[serde(default)]
    ag: AgConfig,
    #[serde(default)] // Projects map: Project name -> List of glob patterns
    projects: HashMap<String, Vec<String>>,
}

#[derive(Deserialize, Debug, Default)]
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

// --- Main Logic ---
fn main() -> io::Result<()> {
    let args = Args::parse(); // Parse CLI arguments
    let start_time = Instant::now(); // Record start time

    if args.debug {
        println!("Debug mode enabled.");
        println!("[{:.2?}] Starting execution", start_time.elapsed());
    }

    let config = load_config()?;
    if args.debug {
         println!("[{:.2?}] Config loaded: {:?}", start_time.elapsed(), config); // Moved debug print here
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
    if args.debug {
        println!("[{:.2?}] Command constructed in {:.2?}", start_time.elapsed(), build_command_start.elapsed());
    }

    // Execute the command and capture its output
    let run_ag_start = Instant::now();
    if args.debug {
        println!("[{:.2?}] Running command: {:?}", start_time.elapsed(), command); // Moved debug print here
    }
    let output = command.output()?;
    if args.debug {
        println!("[{:.2?}] ag command finished in {:.2?}", start_time.elapsed(), run_ag_start.elapsed());
    }

    // Check if the command executed successfully
    if output.status.success() {
        let process_output_start = Instant::now();
        if args.debug {
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
                                            if args.debug {
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
                                        if args.debug {
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
                            if args.debug {
                                eprintln!("Warning: Skipping line where pattern '{}' was not found (ag output discrepancy?): {}", config.ag.pattern, line);
                            }
                        }
                    } else if !line.trim().is_empty() {
                         if args.debug {
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

                if args.debug {
                    println!("[{:.2?}] Output processed and structured in {:.2?}", start_time.elapsed(), process_output_start.elapsed());
                    println!("[{:.2?}] Structuring/sorting took {:.2?}", start_time.elapsed(), format_output_start.elapsed());
                }

                // Write JSON output
                let write_output_start = Instant::now();
                let output_file_path = Path::new(&config.output_file);
                let file = File::create(&output_file_path)?;

                // Use serde_json to write pretty-printed JSON
                match serde_json::to_writer_pretty(file, &final_data) {
                    Ok(_) => {
                        println!("Successfully wrote JSON TODOs to {}", output_file_path.display());
                        if args.debug {
                             println!("[{:.2?}] JSON output file written in {:.2?}", start_time.elapsed(), write_output_start.elapsed());
                        }
                    }
                    Err(e) => {
                        eprintln!("Error writing JSON to {}: {}", output_file_path.display(), e);
                        return Err(io::Error::new(io::ErrorKind::Other, format!("Failed to write JSON: {}", e)));
                    }
                }
            }
            Err(e) => {
                if args.debug {
                    eprintln!("Error converting ag output to UTF-8: {}", e);
                }
                return Err(io::Error::new(io::ErrorKind::InvalidData, format!("Failed to convert ag stdout to UTF-8: {}", e)));
            }
        }
    } else {
        // If the command failed, print the error output (stderr)
        // This should always be printed if the command fails, regardless of debug mode
        match str::from_utf8(&output.stderr) {
            Ok(stderr_str) => {
                eprintln!("ag command failed:\n{}", stderr_str);
            }
            Err(e) => {
                eprintln!("ag command failed and error converting ag stderr to UTF-8: {}", e);
            }
        }
        return Err(io::Error::new(io::ErrorKind::Other, "ag command failed"));
    }

    if args.debug {
        println!("[{:.2?}] Total execution time: {:.2?}", start_time.elapsed(), start_time.elapsed());
    }
    Ok(())
}