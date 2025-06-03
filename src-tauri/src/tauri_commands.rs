#![allow(clippy::all)]
use crate::config_models::AppConfiguration;
use crate::grpc_services::{MyTodoService, MyConfigService};
// Import the gRPC service traits for the command functions that call service methods
use crate::unitodo::todo_service_server::TodoService;
use crate::unitodo::config_service_server::ConfigService;
use crate::unitodo::{ // Corrected path to unitodo
    // Import all necessary request/response types for commands
    GetTodosRequest, GetTodosResponse,
    EditTodoRequest, EditTodoResponse,
    AddTodoRequest, AddTodoResponse,
    MarkDoneRequest, MarkDoneResponse,
    GetConfigRequest, GetConfigResponse, // This is the gRPC one, not the internal struct
    UpdateConfigRequest, UpdateConfigResponse,
    GetActiveProfileRequest, GetActiveProfileResponse,
    SetActiveProfileRequest, SetActiveProfileResponse,
    ListProfilesRequest, ListProfilesResponse,
    AddProfileRequest, AddProfileResponse,
    DeleteProfileRequest, DeleteProfileResponse,
    ConfigMessage as ProtoConfigMessage, // For update_config_command
    CycleTodoStateRequest, CycleTodoStateResponse, // Added for the new command
};
use crate::AppState; // Assuming AppState is defined in main.rs or another accessible module

use std::sync::Arc;
use tokio::sync::RwLock;
use tonic::Request; // For creating tonic::Request
use tauri::Manager; // For get_webview_window method

// --- Tauri Commands ---
#[tauri::command]
pub async fn get_config_command(
    app_config_state: tauri::State<'_, Arc<RwLock<AppConfiguration>>>,
) -> Result<GetConfigResponse, String> { // Returns the gRPC GetConfigResponse
    let service = MyConfigService {
        config_state: app_config_state.inner().clone(),
    };
    let request = tonic::Request::new(GetConfigRequest {});
    match service.get_config(request).await {
        Ok(response) => Ok(response.into_inner()),
        Err(status) => Err(status.to_string()),
    }
}

#[tauri::command]
pub async fn update_config_command(
    new_config_payload: ProtoConfigMessage, // This is ProtoConfigMessage for the *active* profile
    app_config_state: tauri::State<'_, Arc<RwLock<AppConfiguration>>>,
) -> Result<UpdateConfigResponse, String> {
    let service = MyConfigService {
        config_state: app_config_state.inner().clone(),
    };
    let request = tonic::Request::new(UpdateConfigRequest {
        config: Some(new_config_payload),
    });
    match service.update_config(request).await {
        Ok(response) => Ok(response.into_inner()),
        Err(status) => Err(status.to_string()),
    }
}

#[tauri::command]
pub async fn get_todos_command(
    app_config_state: tauri::State<'_, Arc<RwLock<AppConfiguration>>>,
) -> Result<GetTodosResponse, String> {
    let service = MyTodoService {
        config_state: app_config_state.inner().clone(),
    };
    match service.get_todos(Request::new(GetTodosRequest {})).await {
        Ok(response) => Ok(response.into_inner()),
        Err(status) => Err(status.to_string()),
    }
}

#[tauri::command]
pub async fn edit_todo_command(
    payload: EditTodoRequest,
    app_config_state: tauri::State<'_, Arc<RwLock<AppConfiguration>>>,
) -> Result<EditTodoResponse, String> {
    let service = MyTodoService {
        config_state: app_config_state.inner().clone(),
    };
    match service.edit_todo(Request::new(payload)).await {
        Ok(response) => Ok(response.into_inner()),
        Err(status) => Err(status.to_string()),
    }
}

#[tauri::command]
pub async fn add_todo_command(
    payload: AddTodoRequest,
    app_config_state: tauri::State<'_, Arc<RwLock<AppConfiguration>>>,
) -> Result<AddTodoResponse, String> {
    let service = MyTodoService {
        config_state: app_config_state.inner().clone(),
    };
    match service.add_todo(Request::new(payload)).await {
        Ok(response) => Ok(response.into_inner()),
        Err(status) => Err(status.to_string()),
    }
}

#[tauri::command]
pub async fn mark_done_command(
    payload: MarkDoneRequest,
    app_config_state: tauri::State<'_, Arc<RwLock<AppConfiguration>>>,
) -> Result<MarkDoneResponse, String> {
    let service = MyTodoService {
        config_state: app_config_state.inner().clone(),
    };
    match service.mark_done(Request::new(payload)).await {
        Ok(response) => Ok(response.into_inner()),
        Err(status) => Err(status.to_string()),
    }
}

#[tauri::command]
pub async fn cycle_todo_state_command(
    payload: CycleTodoStateRequest,
    app_config_state: tauri::State<'_, Arc<RwLock<AppConfiguration>>>,
) -> Result<CycleTodoStateResponse, String> {
    let service = MyTodoService {
        config_state: app_config_state.inner().clone(),
    };
    match service.cycle_todo_state(Request::new(payload)).await {
        Ok(response) => Ok(response.into_inner()),
        Err(status) => Err(status.to_string()),
    }
}

#[tauri::command]
pub async fn get_grpc_port_command(app_state: tauri::State<'_, AppState>) -> Result<Option<u16>, String> {
    let port_option_guard = app_state.grpc_port.read().await;
    if let Some(port_value) = *port_option_guard {
        Ok(Some(port_value))
    } else {
        Err("gRPC port not yet initialized or available.".to_string())
    }
}

// New Tauri commands for profile management
#[tauri::command]
pub async fn get_active_profile_command(
    app_config_state: tauri::State<'_, Arc<RwLock<AppConfiguration>>>,
) -> Result<GetActiveProfileResponse, String> {
    let service = MyConfigService { config_state: app_config_state.inner().clone() };
    service.get_active_profile(Request::new(GetActiveProfileRequest {})).await.map_err(|s| s.to_string()).map(|r| r.into_inner())
}

#[tauri::command]
pub async fn set_active_profile_command(
    profile_name: String,
    app_config_state: tauri::State<'_, Arc<RwLock<AppConfiguration>>>,
) -> Result<SetActiveProfileResponse, String> {
    let service = MyConfigService { config_state: app_config_state.inner().clone() };
    service.set_active_profile(Request::new(SetActiveProfileRequest { profile_name })).await.map_err(|s| s.to_string()).map(|r| r.into_inner())
}

#[tauri::command]
pub async fn list_profiles_command(
    app_config_state: tauri::State<'_, Arc<RwLock<AppConfiguration>>>,
) -> Result<ListProfilesResponse, String> {
    let service = MyConfigService { config_state: app_config_state.inner().clone() };
    service.list_profiles(Request::new(ListProfilesRequest {})).await.map_err(|s| s.to_string()).map(|r| r.into_inner())
}

#[tauri::command]
pub async fn add_profile_command(
    new_profile_name: String,
    copy_from_profile_name: Option<String>,
    app_config_state: tauri::State<'_, Arc<RwLock<AppConfiguration>>>,
) -> Result<AddProfileResponse, String> {
    let service = MyConfigService { config_state: app_config_state.inner().clone() };
    service.add_profile(Request::new(AddProfileRequest { new_profile_name, copy_from_profile_name })).await.map_err(|s| s.to_string()).map(|r| r.into_inner())
}

#[tauri::command]
pub async fn delete_profile_command(
    profile_name: String,
    app_config_state: tauri::State<'_, Arc<RwLock<AppConfiguration>>>,
) -> Result<DeleteProfileResponse, String> {
    let service = MyConfigService { config_state: app_config_state.inner().clone() };
    service.delete_profile(Request::new(DeleteProfileRequest { profile_name })).await.map_err(|s| s.to_string()).map(|r| r.into_inner())
}

// --- Zoom Commands ---
const ZOOM_LEVELS: &[f64] = &[0.25, 0.33, 0.50, 0.67, 0.75, 0.80, 0.90, 1.0, 1.10, 1.25, 1.50, 1.75, 2.0, 2.50, 3.0, 4.0, 5.0];
const DEFAULT_ZOOM_INDEX: usize = 7; // 100% (1.0)

fn find_closest_zoom_index(current_zoom: f64) -> usize {
    ZOOM_LEVELS
        .iter()
        .position(|&level| (level - current_zoom).abs() < 0.01)
        .unwrap_or_else(|| {
            // Find closest zoom level if exact match not found
            ZOOM_LEVELS
                .iter()
                .enumerate()
                .min_by(|(_, &a), (_, &b)| {
                    (a - current_zoom).abs().partial_cmp(&(b - current_zoom).abs()).unwrap()
                })
                .map(|(i, _)| i)
                .unwrap_or(DEFAULT_ZOOM_INDEX)
        })
}

#[tauri::command]
pub async fn zoom_in(app: tauri::AppHandle) -> Result<(f64, i32), String> {
    if let Some(window) = app.get_webview_window("main") {
        let state = app.state::<std::sync::Mutex<f64>>();
        let mut current_zoom = state.lock().unwrap();
        
        let current_index = find_closest_zoom_index(*current_zoom);
        let new_index = (current_index + 1).min(ZOOM_LEVELS.len() - 1);
        let new_zoom = ZOOM_LEVELS[new_index];
        
        *current_zoom = new_zoom;
        window.set_zoom(new_zoom).map_err(|e| e.to_string())?;
        
        let percentage = (new_zoom * 100.0).round() as i32;
        log::info!("Zoom increased to {}% ({:.2}x)", percentage, new_zoom);
        Ok((new_zoom, percentage))
    } else {
        Err("Main window not found".to_string())
    }
}

#[tauri::command]
pub async fn zoom_out(app: tauri::AppHandle) -> Result<(f64, i32), String> {
    if let Some(window) = app.get_webview_window("main") {
        let state = app.state::<std::sync::Mutex<f64>>();
        let mut current_zoom = state.lock().unwrap();
        
        let current_index = find_closest_zoom_index(*current_zoom);
        let new_index = current_index.saturating_sub(1);
        let new_zoom = ZOOM_LEVELS[new_index];
        
        *current_zoom = new_zoom;
        window.set_zoom(new_zoom).map_err(|e| e.to_string())?;
        
        let percentage = (new_zoom * 100.0).round() as i32;
        log::info!("Zoom decreased to {}% ({:.2}x)", percentage, new_zoom);
        Ok((new_zoom, percentage))
    } else {
        Err("Main window not found".to_string())
    }
}

#[tauri::command]
pub async fn zoom_reset(app: tauri::AppHandle) -> Result<(f64, i32), String> {
    if let Some(window) = app.get_webview_window("main") {
        let state = app.state::<std::sync::Mutex<f64>>();
        let mut current_zoom = state.lock().unwrap();
        let new_zoom = ZOOM_LEVELS[DEFAULT_ZOOM_INDEX]; // 100%
        
        *current_zoom = new_zoom;
        window.set_zoom(new_zoom).map_err(|e| e.to_string())?;
        
        let percentage = (new_zoom * 100.0).round() as i32;
        log::info!("Zoom reset to {}% ({:.2}x)", percentage, new_zoom);
        Ok((new_zoom, percentage))
    } else {
        Err("Main window not found".to_string())
    }
}

#[tauri::command]
pub async fn get_zoom_level(app: tauri::AppHandle) -> Result<(f64, i32), String> {
    let state = app.state::<std::sync::Mutex<f64>>();
    let current_zoom = state.lock().unwrap();
    let percentage = (*current_zoom * 100.0).round() as i32;
    Ok((*current_zoom, percentage))
}


// --- App Updates Module (can be kept here or moved if it grows) ---
#[cfg(desktop)]
pub mod app_updates {
    use tokio::sync::RwLock; // Ensure RwLock is in scope for this module too
    use tauri_plugin_updater::{Update, UpdaterExt as _}; // Import trait for .updater()
    use log; // Added log import
    use tauri::AppHandle; // Ensure AppHandle is directly imported if tauri::Manager was providing it indirectly

    #[derive(Default)]
    pub struct PendingUpdate(RwLock<Option<Update>>);

    #[derive(Clone, serde::Serialize)]
    pub struct UpdateManifestDetails {
        pub version: String,
        pub date: String, 
        pub body: Option<String>,
    }

    #[tauri::command]
    pub async fn fetch_update(
        app: AppHandle, // Use direct AppHandle type 
        pending_update: tauri::State<'_, PendingUpdate>,
    ) -> Result<Option<UpdateManifestDetails>, String> {
        let updater = app.updater().map_err(|e| e.to_string())?; 
        match updater.check().await {
            Ok(Some(update_found)) => {
                let manifest_details = UpdateManifestDetails {
                    version: update_found.version.clone(),
                    date: update_found.date.map_or_else(|| "N/A".to_string(), |d| d.to_string()),
                    body: update_found.body.clone(),
                };
                let mut pending_update_guard = pending_update.0.write().await;
                *pending_update_guard = Some(update_found);
                Ok(Some(manifest_details))
            }
            Ok(None) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }

    #[tauri::command]
    pub async fn install_update(
        app_handle: AppHandle,
        pending_update: tauri::State<'_, PendingUpdate>,
    ) -> Result<(), String> {
        match pending_update.0.write().await.take() {
            Some(update_val) => {
                log::info!(
                    "Attempting to install update: version {} from {}",
                    update_val.version,
                    update_val
                        .date
                        .map_or_else(|| "N/A".to_string(), |d| d.to_string())
                );
                update_val
                    .download_and_install(|_, _| {}, || {})
                    .await
                    .map_err(|e| e.to_string())?;
                app_handle.restart()
            }
            None => Err("No pending update to install.".to_string()),
        }
    }

}