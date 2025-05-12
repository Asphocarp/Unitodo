#![allow(clippy::all)]
use crate::config_models::{AppConfiguration, Config, default_profiles_map as app_config_default_profiles_map, default_active_profile as app_config_default_active_profile}; // Qualified imports for default functions
use std::fs::{self, File};
use std::io::{self, Read, Write};
use std::path::{Path, PathBuf};
use parking_lot::Mutex as ParkingMutex;
use lazy_static::lazy_static;
use log; // Added log import

// Helper to get the primary config path (e.g., ~/.config/unitodo/config.toml)
pub fn get_primary_config_path() -> io::Result<PathBuf> { // Made public
    home::home_dir()
        .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "Could not find home directory"))
        .map(|h| h.join(".config").join("unitodo").join("config.toml"))
}

// Helper function to find the configuration file path, checking multiple locations
fn find_config_path() -> Option<PathBuf> { // Stays private to this module
    let primary_path = get_primary_config_path().ok();
    let paths_to_check: [Option<PathBuf>; 3] = [
        primary_path.clone(),
        home::home_dir().map(|h| h.join(".unitodo/config.toml")), 
        Some(PathBuf::from("./unitodo.toml")),      
    ];
    paths_to_check.iter().filter_map(|p| p.as_ref()).find(|p| p.exists() && p.is_file()).cloned()
}

lazy_static! {
    pub static ref CONFIG_FILE_MUTEX: ParkingMutex<()> = ParkingMutex::new(()); // Made public
}

// Load AppConfiguration from file system
pub fn load_config_from_file() -> io::Result<AppConfiguration> { // Made public
    match find_config_path() {
        Some(path) => {
            log::info!("Loading app configuration from: {}", path.display());
            let _lock = CONFIG_FILE_MUTEX.lock(); // Lock before file operations
            let mut file = File::open(path)?;
            let mut contents = String::new();
            file.read_to_string(&mut contents)?;
            let mut app_config: AppConfiguration = toml::from_str(&contents)
                .map_err(|e| io::Error::new(io::ErrorKind::InvalidData, format!("Failed to parse AppConfiguration TOML: {}", e)))?;
            
            if !app_config.profiles.contains_key("default") {
                app_config.profiles.insert("default".to_string(), Config::default());
                log::warn!("Default profile missing from loaded config, added a default one.");
            }
            if !app_config.profiles.contains_key(&app_config.active_profile) {
                log::warn!("Active profile '{}' not found in loaded config, resetting to default.", app_config.active_profile);
                app_config.active_profile = "default".to_string();
            }
            Ok(app_config)
        }
        None => {
            log::info!("No config file found. Creating default AppConfiguration...");
            let default_app_config = AppConfiguration {
                active_profile: app_config_default_active_profile(), // Use qualified default
                profiles: app_config_default_profiles_map(),       // Use qualified default
            };
            let primary_path = get_primary_config_path()?;
            if let Some(parent) = primary_path.parent() {
                fs::create_dir_all(parent)?;
            }
            let _guard = CONFIG_FILE_MUTEX.lock();
            write_config_to_path_internal(&default_app_config, &primary_path)?;
            drop(_guard);
            log::info!("Created default AppConfiguration at: {}", primary_path.display());
            Ok(default_app_config)
        }
    }
}

// Helper to write AppConfiguration to a specific path
pub fn write_config_to_path_internal(app_config: &AppConfiguration, path: &Path) -> io::Result<()> { // Made public
    let toml_string = toml::to_string_pretty(app_config)
        .map_err(|e| io::Error::new(io::ErrorKind::Other, format!("Failed to serialize AppConfiguration to TOML: {}", e)))?;
    let temp_path = path.with_extension("tmp");
    if let Some(parent) = path.parent() { fs::create_dir_all(parent)?; }
    
    let mut temp_file = File::create(&temp_path)?;
    temp_file.write_all(toml_string.as_bytes())?;
    temp_file.sync_all()?;
    fs::rename(&temp_path, path)?;
    Ok(())
} 