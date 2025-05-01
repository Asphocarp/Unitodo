use clap::Parser;
use std::process::Command;
use std::str;
use std::fs::File;
use std::io::{self, Write, Read};
use std::path::{Path, PathBuf};
use std::collections::HashMap;
use serde::Deserialize;
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
    #[serde(default)] // Add projects map, default to empty
    projects: HashMap<String, String>,
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
    "unitodo.sync.md".to_string()
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

// --- TODO Category Enum ---
#[derive(Debug, PartialEq, Eq, Hash, Clone, PartialOrd, Ord)]
enum TodoCategory {
    Project(String), // Highest priority: Belongs to a defined project
    GitRepo(String), // Medium priority: Belongs to a git repo, but no project
    Other,           // Lowest priority: Not in a project or known git repo
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

    // Compile project regexes
    let compile_regex_start = Instant::now();
    let project_regexes: Vec<(String, Regex)> = config.projects.iter().filter_map(|(name, pattern)| {
        match Regex::new(pattern) {
            Ok(re) => Some((name.clone(), re)),
            Err(e) => {
                eprintln!("Warning: Invalid regex for project '{}' ('{}'): {}", name, pattern, e);
                None // Skip invalid regexes
            }
        }
    }).collect();
    if args.debug {
        println!("[{:.2?}] Project regexes compiled in {:.2?}", start_time.elapsed(), compile_regex_start.elapsed());
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

    // --- Debug Mode: Write raw ag output ---
    // if args.debug {
    //     let write_raw_start = Instant::now();
    //     println!("[{:.2?}] Writing raw ag output to ag-output.temp.md", start_time.elapsed());
    //     let mut debug_file = File::create("ag-output.temp.md")?;
    //     debug_file.write_all(&output.stdout)?;
    //     if !output.stderr.is_empty() {
    //         debug_file.write_all(b"\n\n--- STDERR ---\n")?;
    //         debug_file.write_all(&output.stderr)?;
    //     }
    //     println!("[{:.2?}] Raw ag output written in {:.2?}", start_time.elapsed(), write_raw_start.elapsed());
    // }
    // --- End Debug Mode Section ---

    // Check if the command executed successfully
    if output.status.success() {
        let process_output_start = Instant::now();
        if args.debug {
            println!("[{:.2?}] Processing ag output...", start_time.elapsed());
        }
        match str::from_utf8(&output.stdout) {
            Ok(stdout_str) => {
                // Group TODOs by category (Project > Git Repo > Other)
                let mut grouped_todos: HashMap<TodoCategory, Vec<String>> = HashMap::new();

                // Compile the todo pattern regex from the config
                let todo_pattern_re = match Regex::new(&config.ag.pattern) {
                    Ok(re) => re,
                    Err(e) => {
                        eprintln!("Error: Invalid regex pattern in config ('{}'): {}", config.ag.pattern, e);
                        // Return an error indicating invalid config data
                        return Err(io::Error::new(io::ErrorKind::InvalidData,
                            format!("Invalid regex pattern in config: {}", e)));
                    }
                };

                for line in stdout_str.lines() {
                    // Expected format with --noheading: path:line[:column]:content
                    // Split into path, line, and the rest (content, possibly prefixed by column)
                    let parts: Vec<&str> = line.splitn(3, ':').collect();
                    if parts.len() == 3 { // Need at least path, line, and some content
                        let file_path_str = parts[0];
                        let line_number_str = parts[1]; // Line number
                        // Content is the 3rd part; might start with column number, trim whitespace
                        let content_part = parts[2].trim_start();

                        // Use regex to find the *first* match of the pattern in the content
                        if let Some(mat) = todo_pattern_re.find(content_part) {
                            // Extract the content *after* the matched pattern
                            let todo_content = content_part[mat.start()..].trim(); 
                            let file_path = Path::new(file_path_str);

                            // Determine category: Project > Git Repo > Other
                            let mut category = TodoCategory::Other; // Default category

                            // 1. Check projects first
                            let mut project_match = false;
                            for (project_name, project_re) in &project_regexes {
                                // Use the relative path string for matching project patterns
                                if project_re.is_match(file_path_str) {
                                    category = TodoCategory::Project(project_name.clone());
                                    project_match = true;
                                    break; // Assign to the first matching project
                                }
                            }

                            // 2. If no project matched, check git repo
                            if !project_match {
                                match find_git_repo_name(file_path) {
                                    Ok(Some(repo_name)) => {
                                        category = TodoCategory::GitRepo(repo_name);
                                    }
                                    Ok(None) => {
                                        // Already defaults to TodoCategory::Other
                                    }
                                    Err(e) => {
                                        if args.debug {
                                            eprintln!("Warning: Failed to check git repo for {}: {}", file_path.display(), e);
                                        }
                                        // Keep TodoCategory::Other on error
                                    }
                                }
                            }

                            // Format the line including the line number
                            let formatted_line = format!("{} @ {}:{}", todo_content, file_path_str, line_number_str);

                            // Add to the corresponding category group
                            grouped_todos.entry(category)
                                         .or_insert_with(Vec::new)
                                         .push(formatted_line);
                        } else if !line.trim().is_empty() { // Don't warn for empty lines often output by ag
                            // Don't print warning if debug mode is off, as stderr will be shown anyway
                            if args.debug {
                                // This warning might indicate an issue if ag returned a line not matching the pattern
                                eprintln!("Warning: Skipping line where pattern '{}' was not found (ag output discrepancy?): {}", config.ag.pattern, line); 
                            }
                        }
                    } else if !line.trim().is_empty() { // Handle lines that don't even have path:line:content
                         // Don't print warning if debug mode is off, as stderr will be shown anyway
                         if args.debug {
                            eprintln!("Warning: Skipping line that might be empty or unexpectedly formatted: {}", line); 
                         }
                    }
                }

                // Format the final output string
                let format_output_start = Instant::now();
                let mut final_output = String::new();
                let mut categories: Vec<TodoCategory> = grouped_todos.keys().cloned().collect();

                // Sort categories: Project(A-Z), GitRepo(A-Z), Other
                categories.sort(); // Uses the derived Ord for TodoCategory

                for category in categories {
                    // Get mutable access to the vector for sorting
                    if let Some(todos) = grouped_todos.get_mut(&category) {
                        // Sort the TODO items alphabetically by content
                        todos.sort();

                        let header = match &category {
                            TodoCategory::Project(name) => format!("[ {}]", name), // Nerd Font icon for project
                            TodoCategory::GitRepo(name) => format!("[󰊢 {}]", name), // Nerd Font icon for git repo
                            TodoCategory::Other => "[ Other]".to_string(), // Nerd Font icon for other files
                        };
                        final_output.push_str(&header);
                        final_output.push('\n');
                        for todo_line in todos { // Iterate over the now-sorted vector
                            final_output.push_str(todo_line);
                            final_output.push('\n');
                        }
                        final_output.push('\n'); // Add blank line between sections
                    }
                }
                if args.debug {
                    println!("[{:.2?}] Output processed and formatted in {:.2?}", start_time.elapsed(), process_output_start.elapsed()); // Combined processing and formatting time
                    println!("[{:.2?}] Formatting took {:.2?}", start_time.elapsed(), format_output_start.elapsed()); // Specific formatting time
                }

                // Create/open the output file using the name from config
                let write_output_start = Instant::now();
                let output_file_path = Path::new(&config.output_file); // Create Path for display
                let mut file = File::create(&output_file_path)?;
                // Write the grouped and formatted output to the file
                file.write_all(final_output.as_bytes())?;
                println!(
                    "Successfully wrote grouped TODOs to {}",
                    output_file_path.display() // Use display for path
                );
                 if args.debug {
                    println!("[{:.2?}] Output file written in {:.2?}", start_time.elapsed(), write_output_start.elapsed());
                }
            }
            Err(e) => {
                // Only print this specific error if debug is on, otherwise stderr below covers it
                if args.debug {
                    eprintln!("Error converting ag output to UTF-8: {}", e);
                }
                // Still return an error regardless of debug mode
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