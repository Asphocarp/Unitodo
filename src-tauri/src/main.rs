#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![allow(non_snake_case)]

// Define the gRPC proto module directly in the crate root (main.rs)
pub mod unitodo {
    tonic::include_proto!("unitodo");
}

// Declare other application modules
mod config_io;
mod config_models;
mod file_operations;
mod grpc_services;
mod tauri_commands;
mod todo_models;
mod todo_processing;
mod utils;

// Use statements for items directly used in this main.rs file
use crate::config_io::load_config_from_file;
use crate::config_models::AppConfiguration; 
use crate::grpc_services::{MyConfigService, MyTodoService};
use crate::tauri_commands::app_updates; 

use std::fs::File;
use std::io::Write;
use std::net::TcpListener;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;
use tauri::{Emitter, Manager, TitleBarStyle, WebviewUrl, WebviewWindowBuilder};
use tonic::transport::Server;

// Server traits for gRPC services
use crate::unitodo::config_service_server::ConfigServiceServer;
use crate::unitodo::todo_service_server::TodoServiceServer;

#[derive(Debug)]
pub struct AppState {
    pub grpc_port: Arc<RwLock<Option<u16>>>,
}

fn try_bind_port(port: u16) -> bool {
    TcpListener::bind(("127.0.0.1", port)).is_ok() || TcpListener::bind(("::1", port)).is_ok()
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();

    let mut found_port: Option<u16> = None;
    for port_candidate in 50051..=50100 {
        if try_bind_port(port_candidate) {
            found_port = Some(port_candidate);
            break;
        }
    }
    let chosen_port =
        found_port.expect("Failed to find an available port for gRPC server.");
    log::info!("[Rust Backend] gRPC server will use port: {}", chosen_port);

    let env_file_path = PathBuf::from(".env.local");
    match File::create(&env_file_path) {
        Ok(mut file) => {
            if let Err(e) = writeln!(file, "GRPC_PORT={}", chosen_port) {
                log::error!("[Rust Backend] Failed to write to .env.local: {}", e);
            }
        }
        Err(e) => {
            log::error!("[Rust Backend] Failed to create/overwrite .env.local: {}", e);
        }
    }

    let app_state = AppState {
        grpc_port: Arc::new(RwLock::new(Some(chosen_port))),
    };

    let initial_app_config = load_config_from_file().unwrap_or_else(|e| {
        log::error!("Failed to load AppConfiguration: {}, using default.", e);
        AppConfiguration {
            active_profile: crate::config_models::default_active_profile(), 
            profiles: crate::config_models::default_profiles_map(),
        }
    });
    let app_config_state = Arc::new(RwLock::new(initial_app_config));
    
    let grpc_config_state_clone = Arc::clone(&app_config_state);
    let grpc_app_state_port_clone = Arc::clone(&app_state.grpc_port);

    tokio::spawn(async move {
        let port_to_use = grpc_app_state_port_clone.read().await.expect("gRPC port set in AppState");
        let addr = format!("[::1]:{}", port_to_use).parse().expect("Failed to parse gRPC server address");
        
        let todo_service = MyTodoService {
            config_state: Arc::clone(&grpc_config_state_clone),
        };
        let config_service = MyConfigService {
            config_state: Arc::clone(&grpc_config_state_clone),
        };
        log::info!("[Rust Backend] gRPC Server listening on {}", addr);
        if let Err(e) = Server::builder()
            .add_service(TodoServiceServer::new(todo_service))
            .add_service(ConfigServiceServer::new(config_service))
            .serve(addr)
            .await
        {
            log::error!("[Rust Backend] gRPC server failed: {}", e);
        }
    });

    let mut tauri_builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        tauri_builder = tauri_builder
            .plugin(tauri_plugin_updater::Builder::new().build())
            .manage(app_updates::PendingUpdate::default());
    }

    tauri_builder
        .plugin(tauri_plugin_opener::init())
        .manage(app_config_state) 
        .manage(app_state)       
        .invoke_handler(tauri::generate_handler![
            crate::tauri_commands::get_config_command,
            crate::tauri_commands::update_config_command,
            crate::tauri_commands::get_todos_command,
            crate::tauri_commands::edit_todo_command,
            crate::tauri_commands::add_todo_command,
            crate::tauri_commands::mark_done_command,
            crate::tauri_commands::cycle_todo_state_command,
            crate::tauri_commands::get_grpc_port_command,
            crate::tauri_commands::get_active_profile_command,
            crate::tauri_commands::set_active_profile_command,
            crate::tauri_commands::list_profiles_command,
            crate::tauri_commands::add_profile_command,
            crate::tauri_commands::delete_profile_command,
            #[cfg(desktop)]
            crate::tauri_commands::app_updates::fetch_update,
            #[cfg(desktop)]
            crate::tauri_commands::app_updates::install_update
        ])
        .setup(move |app| {
            let handle = app.handle().clone();
            let main_app_state_clone = handle.state::<AppState>();

            if let Ok(port_guard) = main_app_state_clone.grpc_port.try_read() {
                if let Some(port_val) = *port_guard {
                    log::info!("[Rust Backend] Emitting grpc_port_discovered event with port: {}", port_val);
                    if let Err(e) = handle.emit("grpc_port_discovered", port_val) {
                        log::error!("[Rust Backend] Failed to emit grpc_port_discovered event: {}", e);
                    }
                } else {
                    log::warn!("[Rust Backend] gRPC port is None during setup emit.");
                }
            } else {
                log::warn!("[Rust Backend] Failed to acquire read lock on grpc_port during setup emit.");
            }
            
            let mut main_window_builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
                .title("Unitodo")
                .inner_size(1700.0, 1080.0)
                .resizable(true)
                .fullscreen(false)
                .devtools(true) 
                .hidden_title(true);

            #[cfg(target_os = "macos")]
            {
                main_window_builder = main_window_builder.title_bar_style(TitleBarStyle::Overlay);
            }
            
            if let Err(e) = main_window_builder.build() {
                 log::error!("Failed to build main window: {}", e);
            }
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    Ok(())
}
