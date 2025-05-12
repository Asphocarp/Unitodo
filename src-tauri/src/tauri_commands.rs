#![allow(clippy::all)]
use crate::config_models::AppConfiguration;
use crate::grpc_services::{MyTodoService, MyConfigService};
// Import the gRPC service traits for the command functions that call service methods
use crate::unitodo_proto::todo_service_server::TodoService;
use crate::unitodo_proto::config_service_server::ConfigService;
use crate::unitodo_proto::{
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
};
use crate::AppState; // Assuming AppState is defined in main.rs or another accessible module

use std::sync::Arc;
use tokio::sync::RwLock;
use tonic::Request; // For creating tonic::Request

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
        app_handle: AppHandle, // Use direct AppHandle type
        pending_update: tauri::State<'_, PendingUpdate>,
    ) -> Result<(), String> {
        let update_to_install = pending_update.0.write().await.take();
        if let Some(update_val) = update_to_install {
            log::info!(
                "Attempting to install update: version {} from {}",
                update_val.version,
                update_val.date.map_or_else(|| "N/A".to_string(), |d| d.to_string())
            );
            
            update_val.download_and_install(
                |_chunk_length, _content_length| {},
                || {} 
            ).await.map_err(|e| e.to_string())?;
            app_handle.restart();
        } else {
            return Err("No pending update to install.".to_string());
        }
        // This part is effectively unreachable if app_handle.restart() works as expected.
        // If restart can fail or is not guaranteed to exit, then an Ok(()) might be needed.
        // For now, assuming restart exits the current flow.
        unreachable!("app_handle.restart() should have exited."); 
    }
} 