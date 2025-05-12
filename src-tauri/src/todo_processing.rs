#![allow(clippy::all)]
use crate::config_models::{Config, ProjectConfig};
use crate::todo_models::{TodoItem, TodoCategoryEnum, TodoCategoryData, ProcessedTodosOutput};
use crate::utils::{find_git_repo_root, get_char_rank};

use grep_regex::RegexMatcher;
use grep_searcher::{Searcher, Sink, SinkMatch};
use ignore::WalkBuilder;
use globset::{Glob, GlobSetBuilder};
use regex::Regex;
use std::collections::HashMap;
use std::io;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Instant;
use parking_lot::Mutex as ParkingMutex;

// --- Sink for grep-searcher ---
#[derive(Debug)]
pub struct TodoSink {
    pub effective_rg_pattern: String,
    pub grouped_todos: Arc<ParkingMutex<HashMap<TodoCategoryEnum, Vec<TodoItem>>>>,
    pub current_path: PathBuf,
    pub debug: bool,
    pub start_time: Instant,
    pub projects: HashMap<String, ProjectConfig>,
}

impl Sink for TodoSink {
    type Error = io::Error;

    fn matched(&mut self, _searcher: &Searcher, mat: &SinkMatch<'_>) -> Result<bool, io::Error> {
        let line_bytes = mat.bytes();
        let line_num = mat.line_number().unwrap_or(0);
        let file_path_str = self.current_path.to_string_lossy().to_string();
        let file_path: &Path = &self.current_path;

        let line = match std::str::from_utf8(line_bytes) {
            Ok(s) => s.trim_end(),
            Err(_) => {
                if self.debug {
                    eprintln!(
                        "[{:.2?}] Warning: Skipping non-UTF8 line in file: {}",
                        self.start_time.elapsed(),
                        self.current_path.display()
                    );
                }
                return Ok(true);
            }
        };

        if line.contains("UNITODO_IGNORE_LINE") {
            if self.debug {
                println!(
                    "[{:.2?}] Ignoring TODO on line {} of {} due to UNITODO_IGNORE_LINE",
                    self.start_time.elapsed(),
                    line_num,
                    file_path_str
                );
            }
            return Ok(true);
        }

        let todo_pattern_re = Regex::new(&self.effective_rg_pattern)
            .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, format!("Invalid regex in sink: {}",e)))?;

        if let Some(found_match) = todo_pattern_re.find(line) {
            let raw_todo_content = line[found_match.end()..].trim();
            let completed =
                raw_todo_content.starts_with("[x]") || raw_todo_content.starts_with("[X]");
            let mut cleaned_content = raw_todo_content;
            if cleaned_content.starts_with("[ ]") || cleaned_content.starts_with("[x]") || cleaned_content.starts_with("[X]") {
                cleaned_content = cleaned_content[3..].trim_start();
            }
            cleaned_content = cleaned_content
                .trim_start_matches(|c: char| c == '-' || c == '*' || c.is_whitespace())
                .trim();

            let location = format!("{}:{}", file_path_str, line_num);
            let mut category = TodoCategoryEnum::Other;
            let mut project_match = false;

            for (project_name, project_config) in &self.projects {
                for pattern_str in &project_config.patterns {
                    match glob::Pattern::new(pattern_str) {
                        Ok(pattern) => {
                            if pattern.matches_path(file_path) { 
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
                if let Ok(Some(repo_root_pathbuf)) = find_git_repo_root(file_path) {
                    if let Some(repo_name_osstr) = repo_root_pathbuf.file_name() {
                        let repo_name_string = repo_name_osstr.to_string_lossy().into_owned();
                        category = TodoCategoryEnum::GitRepo(repo_name_string);
                    } else {
                        if self.debug {
                            eprintln!("[{:.2?}] Could not determine repo name from path: {}", self.start_time.elapsed(), repo_root_pathbuf.display());
                        }
                    }
                }
            }

            let todo_item = TodoItem { content: cleaned_content.to_string(), location, completed };
            let mut todos_map = self.grouped_todos.lock();
            todos_map.entry(category).or_insert_with(Vec::new).push(todo_item);
        }
        Ok(true)
    }
}

// --- Core todo Finding Logic --- (Accepts &Config from active profile)
pub fn find_and_process_todos(active_profile_config: &Config, debug: bool) -> io::Result<ProcessedTodosOutput> {
    let start_time = Instant::now();
    if debug { println!("[{:.2?}] Starting TODO processing for active profile", start_time.elapsed()); }

    if active_profile_config.rg.paths.is_empty() {
        if debug {
            println!(
                "[{:.2?}] No search paths configured in rg.paths. Returning empty results.",
                start_time.elapsed()
            );
        }
        return Ok(ProcessedTodosOutput { categories: Vec::new() });
    }

    let effective_pattern = active_profile_config.get_effective_rg_pattern();
    if debug { println!("[{:.2?}] Using effective search pattern: {}", start_time.elapsed(), effective_pattern); }

    let matcher = RegexMatcher::new(&effective_pattern)
        .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, format!("Invalid regex from active profile: {}",e)))?;

    let mut custom_ignore_builder = GlobSetBuilder::new();
    if let Some(items_to_ignore) = &active_profile_config.rg.ignore {
        for pattern_str in items_to_ignore {
            if let Ok(glob) = Glob::new(pattern_str) { custom_ignore_builder.add(glob); }
            else if debug { eprintln!("[{:.2?}] Warning: Invalid custom ignore glob pattern '{}'", start_time.elapsed(), pattern_str); }
        }
    }
    let custom_ignores = Arc::new(custom_ignore_builder.build().unwrap_or_else(|e| {
        if debug { eprintln!("[{:.2?}] Warning: Failed to build custom ignore GlobSet: {}", start_time.elapsed(), e); }
        GlobSetBuilder::new().build().unwrap()
    }));
    
    let mut builder = WalkBuilder::new(&active_profile_config.rg.paths[0]);
    for path_str in active_profile_config.rg.paths.iter().skip(1) { builder.add(path_str); }
    builder.git_ignore(true).ignore(true).parents(true);

    if let Some(types) = &active_profile_config.rg.file_types {
        if debug { eprintln!("Warning: config `rg.file_types` ('{:?}') not supported with internal search.", types); }
    }

    let search_start_time = Instant::now();
    let grouped_todos = Arc::new(ParkingMutex::new(HashMap::<TodoCategoryEnum, Vec<TodoItem>>::new()));
    let sink_projects_clone = active_profile_config.projects.clone();

    builder.build_parallel().run(|| {
        let current_matcher_clone = matcher.clone();
        let current_todos_arc_clone = Arc::clone(&grouped_todos);
        let sink_effective_pattern_clone = effective_pattern.clone();
        let sink_projects_closure_clone = sink_projects_clone.clone();
        let current_custom_ignores_arc_clone = Arc::clone(&custom_ignores);
        let closure_debug = debug;
        let closure_start_time = start_time;

        Box::new(move |result| {
            let entry = match result { Ok(e) => e, Err(_) => return ignore::WalkState::Continue };
            let path = entry.path();
            if current_custom_ignores_arc_clone.is_match(path) { return ignore::WalkState::Continue; }
            
            if entry.file_type().map_or(false, |ft| ft.is_file()) {
                let mut searcher = Searcher::new();
                let mut sink = TodoSink {
                    effective_rg_pattern: sink_effective_pattern_clone.clone(),
                    grouped_todos: Arc::clone(&current_todos_arc_clone),
                    current_path: path.to_path_buf(),
                    debug: closure_debug,
                    start_time: closure_start_time, 
                    projects: sink_projects_closure_clone.clone(),
                };
                if let Err(err) = searcher.search_path(&current_matcher_clone, path, &mut sink) {
                    if closure_debug { eprintln!("[{:.2?}] Error searching {}: {}", closure_start_time.elapsed(), path.display(), err); }
                }
            }
            ignore::WalkState::Continue
        })
    });
    
    if debug { println!("[{:.2?}] Search completed in {:.2?}", start_time.elapsed(), search_start_time.elapsed()); }

    let format_output_start = Instant::now();
    let final_grouped_todos = match Arc::try_unwrap(grouped_todos) {
        Ok(mutex) => mutex.into_inner(),
        Err(_) => return Err(io::Error::new(io::ErrorKind::Other, "Mutex unwrap error after parallel walk")),
    };
    let mut categories_keys: Vec<TodoCategoryEnum> = final_grouped_todos.keys().cloned().collect();
    categories_keys.sort();
    
    let output_categories: Vec<TodoCategoryData> = categories_keys.into_iter().filter_map(|key| {
        final_grouped_todos.get(&key).map(|todos_vec| {
            let mut sorted_todos = todos_vec.clone();
            sorted_todos.sort_by(|a, b| { 
                use std::cmp::Ordering;
                let mut a_iter = a.content.chars();
                let mut b_iter = b.content.chars();
                loop {
                    match (a_iter.next(), b_iter.next()) {
                        (Some(ca), Some(cb)) => {
                            if ca == cb { continue; }
                            let rank_a = get_char_rank(ca); let rank_b = get_char_rank(cb);
                            if rank_a == rank_b { return ca.cmp(&cb); } else { return rank_a.cmp(&rank_b); }
                        }
                        (Some(_), None) => return Ordering::Greater, 
                        (None, Some(_)) => return Ordering::Less,
                        (None, None) => return Ordering::Equal,
                    }
                }
            });
            let (name, icon) = key.get_details();
            TodoCategoryData { name, icon, todos: sorted_todos }
        })
    }).collect();

    if debug { println!("[{:.2?}] Output processed in {:.2?}. Total: {:.2?}", start_time.elapsed(), format_output_start.elapsed(), start_time.elapsed()); }
    Ok(ProcessedTodosOutput { categories: output_categories })
} 