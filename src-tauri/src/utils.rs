#![allow(clippy::all)]
use std::io;
use std::path::{Path, PathBuf};
use regex::Regex;

// This function might be more appropriate in config_io.rs if only used there.
// If it's generally useful, it can stay here.
// pub fn get_primary_config_path() -> io::Result<PathBuf> { 
//     home::home_dir()
//         .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "Could not find home directory"))
//         .map(|h| h.join(".config").join("unitodo").join("config.toml"))
// }

pub fn get_append_file_path_in_dir(dir_path: &Path, default_basename: &str) -> PathBuf {
    dir_path.join(default_basename)
}

pub fn generate_short_timestamp() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let now = SystemTime::now();
    let current_unix_timestamp = now.duration_since(UNIX_EPOCH).expect("Time went backwards").as_secs();
    let custom_epoch: u64 = 1735689600; // Jan 1, 2025, 00:00:00 UTC
    let seconds_since_custom_epoch = current_unix_timestamp.saturating_sub(custom_epoch);
    let url_safe_base64_chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let mut base64_timestamp = String::with_capacity(5);
    let mask6bit = 0x3F;
    let timestamp_value = seconds_since_custom_epoch & 0x3FFFFFFF; // Ensure it fits in 30 bits

    base64_timestamp.push(url_safe_base64_chars.chars().nth(((timestamp_value >> 24) & mask6bit) as usize).unwrap_or('A'));
    base64_timestamp.push(url_safe_base64_chars.chars().nth(((timestamp_value >> 18) & mask6bit) as usize).unwrap_or('A'));
    base64_timestamp.push(url_safe_base64_chars.chars().nth(((timestamp_value >> 12) & mask6bit) as usize).unwrap_or('A'));
    base64_timestamp.push(url_safe_base64_chars.chars().nth(((timestamp_value >> 6) & mask6bit) as usize).unwrap_or('A'));
    base64_timestamp.push(url_safe_base64_chars.chars().nth((timestamp_value & mask6bit) as usize).unwrap_or('A'));
    base64_timestamp
}

pub fn get_parent_dir(p: &Path) -> Option<PathBuf> {
    if p.is_file() {
        p.parent().map(|pd| pd.to_path_buf())
    } else if p.is_dir() {
        Some(p.to_path_buf())
    } else {
        None
    }
}

pub fn find_git_repo_root(start_path: &Path) -> io::Result<Option<PathBuf>> {
    let mut current_path = get_parent_dir(start_path)
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "Invalid start path for git root search. Cannot get parent directory."))?;
    loop {
        let git_dir = current_path.join(".git");
        if git_dir.exists() && git_dir.is_dir() {
            return Ok(Some(current_path));
        }
        if let Some(parent) = current_path.parent() {
            if parent == current_path { // Reached root or a loop detected
                break;
            }
            current_path = parent.to_path_buf();
        } else {
            break; // No parent, reached filesystem root
        }
    }
    Ok(None)
}

pub fn extract_cleaned_content_from_line(
    line: &str,
    effective_rg_pattern: &str,
) -> Result<String, io::Error> {
    let todo_pattern_re = Regex::new(effective_rg_pattern).map_err(|e| {
        io::Error::new(
            io::ErrorKind::InvalidData,
            format!("Invalid effective regex pattern for extraction: {}", e),
        )
    })?;

    if let Some(found_match) = todo_pattern_re.find(line) {
        let raw_todo_content = line[found_match.end()..].trim_start();
        let mut cleaned_content = raw_todo_content;

        if cleaned_content.starts_with("[ ]") || cleaned_content.starts_with("[x]") || cleaned_content.starts_with("[X]") {
            cleaned_content = cleaned_content[3..].trim_start();
        }
        cleaned_content = cleaned_content
            .trim_start_matches(|c: char| c == '-' || c == '*' || c.is_whitespace())
            .trim();
        Ok(cleaned_content.to_string())
    } else {
        Err(io::Error::new(
            io::ErrorKind::NotFound,
            "TODO pattern not found in line for content extraction", // UNITODO_IGNORE_LINE
        ))
    }
}

pub fn get_char_rank(c: char) -> u8 {
    if c.is_ascii_uppercase() { (c as u8) - b'A' }
    else if c.is_ascii_lowercase() { (c as u8 - b'a') + 26 }
    else if c.is_ascii_digit() { (c as u8 - b'0') + 52 }
    else if c == '-' { 62 }
    else if c == '_' { 63 }
    else if c == ' ' { 64 }
    else { 65 } 
} 