use std::process::Command;
use std::str;
use std::fs::{self, File};
use std::io::{self, Write, Read};
use std::path::{Path, PathBuf};
use serde::Deserialize;

// --- Configuration Structure ---
#[derive(Deserialize, Debug, Default)] // Added Default
struct Config {
    #[serde(default = "default_output_file")]
    output_file: String,
    #[serde(default)]
    ag: AgConfig,
}

#[derive(Deserialize, Debug, Default)]
struct AgConfig {
    #[serde(default = "default_search_paths")]
    paths: Vec<String>,
    #[serde(default)]
    ignore: Option<Vec<String>>,
    #[serde(default)]
    file_types: Option<Vec<String>>,
}

fn default_output_file() -> String {
    "all.todo".to_string()
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

// --- Main Logic ---
fn main() -> io::Result<()> {
    let config = load_config()?;
    println!("Using config: {:?}", config);

    // Construct the command to run `ag`
    let mut command = Command::new("ag");
    command.arg("TODO"); // The search pattern

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

    // Execute the command and capture its output
    println!("Running command: {:?}", command); // Debug: show the command being run
    let output = command.output()?;

    // Check if the command executed successfully
    if output.status.success() {
        match str::from_utf8(&output.stdout) {
            Ok(stdout_str) => {
                let mut formatted_output = String::new();
                for line in stdout_str.lines() {
                    // Find the *first* colon to split path and content
                    if let Some(colon_index) = line.find(':') {
                        // Check if it's likely a drive letter (e.g., C:) and find the next colon
                        let effective_colon_index = 
                            if colon_index == 1 && line.chars().nth(2) == Some('\\') { // Windows path like C:\...
                                line[colon_index + 1..].find(':').map(|i| i + colon_index + 1).unwrap_or(colon_index)
                            } else {
                                colon_index
                            };

                        let (file_part, rest_part) = line.split_at(effective_colon_index);
                        
                        // The rest_part likely starts with ':<line_number>:<col_number>:' or just ':<line_number>:'
                        // Find the colon *after* the line/col numbers
                        let mut content_start_index = 0;
                        let mut colon_count = 0;
                        for (i, c) in rest_part.char_indices() {
                            if c == ':' {
                                colon_count += 1;
                                // Expecting at least 2 colons (line, column) or sometimes just 1 (line)
                                // We want the content *after* the line/col number segment
                                if colon_count >= 1 { // Adjusted logic based on ag output format
                                    // Check if the next part looks like the start of the actual code line
                                    if let Some(next_char) = rest_part.chars().nth(i + 1) {
                                        // Heuristic: code lines usually start with whitespace or non-digit
                                        if next_char.is_whitespace() || !next_char.is_digit(10) {
                                            content_start_index = i + 1;
                                            break;
                                         }
                                     }
                                     // If it's just one colon and it's the last char, we take everything after it (edge case)
                                     if colon_count == 1 && i == rest_part.len() - 1 {
                                        content_start_index = i + 1;
                                        break;
                                     } 
                                }
                            } 
                        }
                        
                        // If we couldn't reliably find the content start, skip this line or handle differently
                        if content_start_index == 0 && !rest_part.is_empty() {
                             // Fallback: assume content starts after the first colon if heuristic fails
                            content_start_index = 1; 
                        }

                        let content_part = rest_part[content_start_index..].trim_start();


                        if let Some(todo_index) = content_part.find("TODO") {
                            let todo_content = content_part[todo_index..].trim(); // Get everything from TODO onwards
                            formatted_output.push_str(&format!("{} @ {}\n", todo_content, file_part));
                        }
                    }
                }

                // Create/open the output file using the name from config
                let mut file = File::create(&config.output_file)?;
                // Write the reformatted output to the file
                file.write_all(formatted_output.as_bytes())?;
                println!(
                    "Successfully wrote formatted TODOs to {}",
                    config.output_file
                );
            }
            Err(e) => {
                eprintln!("Error converting ag output to UTF-8: {}", e);
            }
        }
    } else {
        // If the command failed, print the error output (stderr)
        match str::from_utf8(&output.stderr) {
            Ok(stderr_str) => {
                eprintln!("ag command failed:\n{}", stderr_str);
            }
            Err(e) => {
                eprintln!("Error converting ag stderr to UTF-8: {}", e);
            }
        }
        // You might want to return an error here as well
         return Err(io::Error::new(io::ErrorKind::Other, "ag command failed")); // Return error
    }

    Ok(())
} 