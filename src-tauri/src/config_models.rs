#![allow(clippy::all)] 
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// --- Profile-aware Configuration Structures ---
#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct AppConfiguration {
    #[serde(default = "default_active_profile")]
    pub active_profile: String,
    #[serde(default = "default_profiles_map")]
    pub profiles: HashMap<String, Config>, 
}

pub fn default_active_profile() -> String { // Made public
    "default".to_string()
}

pub fn default_profiles_map() -> HashMap<String, Config> { // Made public
    let mut map = HashMap::new();
    map.insert("default".to_string(), Config::default());
    map
}

impl AppConfiguration {
    pub fn get_active_config(&self) -> Option<&Config> {
        self.profiles.get(&self.active_profile)
    }

    #[allow(dead_code)]
    pub fn get_active_config_mut(&mut self) -> Option<&mut Config> {
        self.profiles.get_mut(&self.active_profile)
    }
}

#[derive(Deserialize, Serialize, Debug, Clone, Default)]
pub struct Config {
    #[serde(default)]
    pub rg: RgConfig,
    #[serde(default)]
    pub projects: HashMap<String, ProjectConfig>,
    #[serde(default = "default_refresh_interval")]
    pub refresh_interval: u32,
    #[serde(default = "default_editor_uri_scheme")]
    pub editor_uri_scheme: String,
    #[serde(default = "default_todo_states")]
    pub todo_states: Vec<Vec<String>>,
    #[serde(default = "default_append_basename")]
    pub default_append_basename: String,
}

impl Config {
    pub fn get_effective_rg_pattern(&self) -> String {
        if self.todo_states.is_empty() {
            return "^$".to_string(); 
        }
        let patterns: Vec<String> = self
            .todo_states
            .iter()
            .filter_map(|state_set| state_set.get(0))
            .map(|p| regex::escape(p)) 
            .collect();
        patterns.join("|") 
    }
}

#[derive(Deserialize, Serialize, Debug, Clone, Default)]
pub struct RgConfig {
    #[serde(default = "default_search_paths")]
    pub paths: Vec<String>,
    #[serde(default)]
    pub ignore: Option<Vec<String>>,
    #[serde(default)]
    pub file_types: Option<Vec<String>>,
}

#[derive(Deserialize, Serialize, Debug, Clone, Default)]
pub struct ProjectConfig {
    pub patterns: Vec<String>,
    pub append_file_path: Option<String>,
}


pub fn default_search_paths() -> Vec<String> { vec![".".to_string()] } // Made public
pub fn default_refresh_interval() -> u32 { 5000 } // Made public
pub fn default_editor_uri_scheme() -> String { "vscode://file/".to_string() } // Made public
pub fn default_todo_states() -> Vec<Vec<String>> { 
    vec![
        vec!["- [ ] ".to_string(), "- [-] ".to_string(), "- [x] ".to_string(), "- [/] ".to_string()], // UNITODO_IGNORE_LINE
        vec!["TODO:".to_string(), "DOING:".to_string(), "DONE:".to_string(), "CANCELLED:".to_string()], // UNITODO_IGNORE_LINE
        vec!["TODO".to_string(), "DOING".to_string(), "DONE".to_string(), "CANCELLED".to_string()], // UNITODO_IGNORE_LINE
    ]
}
pub fn default_append_basename() -> String { "unitodo.append.md".to_string() } // Made public 