#![allow(clippy::all)]
use crate::config_models::Config;
use crate::utils::{extract_cleaned_content_from_line, generate_short_timestamp, find_git_repo_root, get_append_file_path_in_dir};

use std::fs::{self, OpenOptions};
use std::io::{self, BufReader, Read, Write, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use regex::Regex;
use fs2::FileExt;

// --- Core File Operation Logic (uses active_profile_config) ---
#[rustfmt::skip]
pub fn edit_todo_in_file_grpc(active_profile_config: &Config, location: &str, new_content: &str, original_content: &str, _completed: bool) -> io::Result<()> {
    let location_parts: Vec<&str> = location.splitn(2, ':').collect();
    if location_parts.len() != 2 { return Err(io::Error::new(io::ErrorKind::InvalidInput, "Invalid location format")); }
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
        BufReader::new(&file).read_to_string(&mut file_content_string)?;
        let mut lines: Vec<String> = file_content_string.lines().map(String::from).collect();
        if line_index >= lines.len() { return Err(io::Error::new(io::ErrorKind::InvalidInput, "Line number out of bounds")); }

        let original_line = &lines[line_index];
        let effective_rg_pattern = active_profile_config.get_effective_rg_pattern();
        let todo_pattern_re = Regex::new(&effective_rg_pattern).map_err(|_| io::Error::new(io::ErrorKind::InvalidData, "Bad regex for edit pattern"))?;

        if let Some(mat) = todo_pattern_re.find(original_line) {
            let prefix = &original_line[..mat.start()];
            let pattern_match_str = mat.as_str();
            let content_start_idx = original_line[mat.end()..].find(|c: char| !c.is_whitespace()).map_or(original_line.len(), |i| mat.end() + i);
            let current_on_disk_content = original_line[content_start_idx..].trim();

            if current_on_disk_content != original_content.trim() { 
                let error_msg = format!("Content has been modified. Expected: '{}', Found: '{}'", original_content.trim(), current_on_disk_content);
                return Err(io::Error::new(io::ErrorKind::Other, error_msg)); 
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
            Err(io::Error::new(io::ErrorKind::NotFound, "TODO pattern not found on line for edit")) // UNITODO_IGNORE_LINE
        }
    })();
    fs2::FileExt::unlock(&file)?;
    result
}

#[rustfmt::skip]
pub fn add_todo_to_file_grpc(active_profile_config: &Config, category_type: &str, category_name: &str, content: &str, example_item_location: Option<&str>) -> io::Result<()> {
    let target_append_file_path: PathBuf = match category_type {
        "git" => {
            let ex_loc = example_item_location.ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "Git add requires example_item_location"))?;
            let ex_path_str = ex_loc.split(':').next().ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "Invalid example_item_location format for git add"))?;
            let repo_root = find_git_repo_root(Path::new(ex_path_str))?.ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "Could not find git repo root for add"))?;
            get_append_file_path_in_dir(&repo_root, &active_profile_config.default_append_basename)
        }
        "project" => {
            let proj_conf = active_profile_config.projects.get(category_name).ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, format!("Project config not found for '{}'", category_name)))?;
            PathBuf::from(proj_conf.append_file_path.as_ref().ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, format!("append_file_path not configured for project '{}'", category_name)))?)
        }
        _ => return Err(io::Error::new(io::ErrorKind::InvalidInput, "Invalid category_type for add_todo"))
    };

    let timestamp_str = generate_short_timestamp();
    let sanitized_content = content.replace('\n', " ").trim().to_string();
    if sanitized_content.is_empty() { return Err(io::Error::new(io::ErrorKind::InvalidInput, "Cannot add empty TODO")); } // UNITODO_IGNORE_LINE
    
    let priority_marker = active_profile_config.todo_done_pairs.get(0)
        .and_then(|pair| pair.get(0))
        .map_or("- [ ] ", |marker_str| marker_str.as_str()); // UNITODO_IGNORE_LINE

    let (effective_priority_segment, content_segment) = {
        let trimmed_content = sanitized_content.trim();
        let parts: Vec<&str> = trimmed_content.splitn(2, ' ').collect();
        let first_word = parts.get(0).copied().unwrap_or("");
        let user_priority_re = Regex::new(r"^[a-zA-Z0-9][a-zA-Z0-9-]*$").unwrap();
        if !first_word.is_empty() && user_priority_re.is_match(first_word) {
            (first_word.to_string(), parts.get(1).copied().unwrap_or("").trim().to_string())
        } else {
            ("1".to_string(), trimmed_content.to_string())
        }
    };

    let base_line_to_append = format!("{}{}@{} {}", priority_marker, effective_priority_segment, timestamp_str, content_segment).trim_end().to_string();

    if let Some(parent_dir) = target_append_file_path.parent() { fs::create_dir_all(parent_dir)?; }
    else { return Err(io::Error::new(io::ErrorKind::InvalidInput, "Invalid target append file path (no parent dir)")); }

    let mut file = OpenOptions::new().read(true).write(true).append(true).create(true).open(&target_append_file_path)?;
    file.lock_exclusive()?;
    let mut needs_newline = false;
    if file.metadata()?.len() > 0 {
        file.seek(SeekFrom::End(-1))?;
        let mut last_char_buf = [0;1];
        file.read_exact(&mut last_char_buf)?;
        if last_char_buf[0] != b'\n' { needs_newline = true; }
    }
    let final_append_str = if needs_newline { format!("\n{}", base_line_to_append) } else { base_line_to_append };
    writeln!(file, "{}", final_append_str)?;
    fs2::FileExt::unlock(&file)?;
    Ok(())
}

#[rustfmt::skip]
pub fn mark_todo_as_done_in_file_grpc(active_profile_config: &Config, location: &str, original_content_payload: &str) -> Result<(String, bool), io::Error> {
    let location_parts: Vec<&str> = location.splitn(2, ':').collect();
    if location_parts.len() != 2 { return Err(io::Error::new(io::ErrorKind::InvalidInput, "Invalid location format for mark_done")); }
    let file_path_str = location_parts[0];
    let line_number: usize = location_parts[1].parse().map_err(|_| io::Error::new(io::ErrorKind::InvalidInput, "Invalid line number for mark_done"))?;
    if line_number == 0 { return Err(io::Error::new(io::ErrorKind::InvalidInput, "Line number cannot be 0 for mark_done"));}
    let line_index = line_number - 1;
    let file_path = Path::new(file_path_str);
    if !file_path.is_file() { return Err(io::Error::new(io::ErrorKind::NotFound, "File not found for mark_done")); }

    let mut file = OpenOptions::new().read(true).write(true).open(file_path)?;
    file.lock_exclusive()?;
    let result: Result<(String, bool), io::Error> = (|| {
        let mut original_file_content_string = String::new();
        BufReader::new(&file).read_to_string(&mut original_file_content_string)?;
        let mut lines: Vec<String> = original_file_content_string.lines().map(String::from).collect();
        if line_index >= lines.len() { return Err(io::Error::new(io::ErrorKind::InvalidInput, "Line number out of bounds for mark_done")); }

        let original_line_on_disk = lines[line_index].clone();
        let effective_rg_pattern = active_profile_config.get_effective_rg_pattern();
        let current_disk_cleaned_content = extract_cleaned_content_from_line(&original_line_on_disk, &effective_rg_pattern)?;
        
        if current_disk_cleaned_content.trim() != original_content_payload.trim() { 
            let error_msg = format!("Content modified. Expected: '{}', Found on disk: '{}'", original_content_payload.trim(), current_disk_cleaned_content.trim());
            return Err(io::Error::new(io::ErrorKind::Other, error_msg)); 
        }

        let todo_done_pairs = if active_profile_config.todo_done_pairs.is_empty() { 
            crate::config_models::default_todo_done_pairs() 
        } else { 
            active_profile_config.todo_done_pairs.clone() 
        };
        let mut marker_transformed = false;
        let marker_re = Regex::new(&effective_rg_pattern).map_err(|_| io::Error::new(io::ErrorKind::InvalidData, "Bad regex for mark_done marker pattern"))?;
        
        let final_line_to_write: String;
        let final_content_for_frontend: String;

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

            let actual_content_to_timestamp = content_after_marker_with_space.trim_start();
            let leading_space_after_marker_len = content_after_marker_with_space.len() - actual_content_to_timestamp.len();
            let leading_space_after_marker = &content_after_marker_with_space[0..leading_space_after_marker_len];
            
            let parts: Vec<&str> = actual_content_to_timestamp.splitn(2, ' ').collect();
            let mut first_word_of_content = parts.get(0).map_or_else(String::new, |s| (*s).to_string());
            let rest_of_content = parts.get(1).copied().unwrap_or("");
            
            let done_ts_str = format!("@@{}", generate_short_timestamp());
            let done_ts_regex = Regex::new(r"@@[A-Za-z0-9\-_]{5}").unwrap();
            if done_ts_regex.is_match(&first_word_of_content) {
                first_word_of_content = done_ts_regex.replace(&first_word_of_content, &done_ts_str).to_string();
            } else {
                first_word_of_content.push_str(&done_ts_str);
            }
            
            let final_content_part_with_timestamp = if rest_of_content.is_empty() { first_word_of_content } else { format!("{} {}", first_word_of_content, rest_of_content) };
            final_line_to_write = format!("{}{}{}{}", prefix_before_marker, transformed_marker_str, leading_space_after_marker, final_content_part_with_timestamp);
            final_content_for_frontend = final_content_part_with_timestamp;
        } else { return Err(io::Error::new(io::ErrorKind::NotFound, "TODO pattern not found on line for mark_done")); } // UNITODO_IGNORE_LINE

        lines[line_index] = final_line_to_write;
        let new_full_content = lines.join("\n");
        let final_write_content = if original_file_content_string.ends_with('\n') && !new_full_content.is_empty() { format!("{}\n", new_full_content) } else { new_full_content };
        file.set_len(0)?;
        file.seek(SeekFrom::Start(0))?;
        file.write_all(final_write_content.as_bytes())?;
        
        Ok((final_content_for_frontend, marker_transformed))
    })();
    fs2::FileExt::unlock(&file)?;
    result
} 