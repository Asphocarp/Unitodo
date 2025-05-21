#![allow(clippy::all)]
use crate::config_models::{AppConfiguration, Config, RgConfig, ProjectConfig as ModelProjectConfig}; // Added RgConfig, aliased ProjectConfig to avoid conflict
use crate::todo_models::{TodoItem as InternalTodoItem, TodoCategoryData as InternalTodoCategoryData}; // Aliased internal models
use crate::todo_processing::find_and_process_todos;
use crate::file_operations::{edit_todo_in_file_grpc, add_todo_to_file_grpc, mark_todo_as_done_in_file_grpc, cycle_todo_state_in_file_grpc};
use crate::config_io::{write_config_to_path_internal, get_primary_config_path, CONFIG_FILE_MUTEX}; // Corrected imports

use std::sync::Arc;
use tokio::sync::RwLock;
use tonic::{Request, Response, Status};
use std::io;

// Import gRPC generated types (assuming they are in crate::unitodo)
use crate::unitodo::{
    config_service_server::ConfigService,
    todo_service_server::TodoService,
    AddTodoRequest,
    AddTodoResponse,
    ConfigMessage as ProtoConfigMessage,
    EditTodoRequest,
    EditTodoResponse,
    GetConfigRequest,
    GetConfigResponse,
    GetTodosRequest,
    GetTodosResponse,
    MarkDoneRequest,
    MarkDoneResponse,
    ProjectConfigMessage as ProtoProjectConfigMessage, // Assuming this is how it's named in proto
    RgConfigMessage as ProtoRgConfigMessage,       // Assuming this is how it's named in proto
    TodoCategory as ProtoTodoCategory,
    TodoStateSet as ProtoTodoStateSet, // New type from regenerated proto
    TodoItem as ProtoTodoItem,
    UpdateConfigRequest,
    UpdateConfigResponse,
    GetActiveProfileRequest, GetActiveProfileResponse,
    ListProfilesRequest, ListProfilesResponse, ProfileInfo,
    SetActiveProfileRequest, SetActiveProfileResponse,
    AddProfileRequest, AddProfileResponse,
    DeleteProfileRequest, DeleteProfileResponse,
    CycleTodoStateRequest, CycleTodoStateResponse, // Added for the new RPC
};

// --- Mapping Functions (Internal Models <-> Proto Models) ---
fn to_proto_todo_item(item: &InternalTodoItem) -> ProtoTodoItem {
    ProtoTodoItem {
        content: item.content.clone(),
        location: item.location.clone(),
        status: item.status.clone(),
    }
}

fn to_proto_todo_category(category_data: &InternalTodoCategoryData) -> ProtoTodoCategory {
    ProtoTodoCategory {
        name: category_data.name.clone(),
        icon: category_data.icon.clone(),
        todos: category_data.todos.iter().map(to_proto_todo_item).collect(),
    }
}

// Maps a single profile's Config (from config_models.rs) to ProtoConfigMessage
fn to_proto_config(config: &Config) -> ProtoConfigMessage {
    ProtoConfigMessage {
        rg: Some(ProtoRgConfigMessage {
            paths: config.rg.paths.clone(),
            ignore: config.rg.ignore.clone().unwrap_or_default(),
            file_types: config.rg.file_types.clone().unwrap_or_default(),
        }),
        projects: config.projects.iter().map(|(k, v)| (k.clone(), ProtoProjectConfigMessage {
            patterns: v.patterns.clone(),
            append_file_path: v.append_file_path.clone(),
        })).collect(),
        refresh_interval: config.refresh_interval,
        editor_uri_scheme: config.editor_uri_scheme.clone(),
        todo_states: config.todo_states.iter().map(|state_set_vec| {
            ProtoTodoStateSet { states: state_set_vec.clone() }
        }).collect(),
        default_append_basename: config.default_append_basename.clone(),
    }
}

// Maps ProtoConfigMessage to a single profile's Config (for config_models.rs)
fn from_proto_config(proto_config: ProtoConfigMessage) -> Config {
    Config {
        rg: RgConfig {
            paths: proto_config.rg.as_ref().map_or_else(Vec::new, |rg| rg.paths.clone()),
            ignore: proto_config.rg.as_ref().and_then(|rg| if rg.ignore.is_empty() { None } else { Some(rg.ignore.clone()) }),
            file_types: proto_config.rg.as_ref().and_then(|rg| if rg.file_types.is_empty() { None } else { Some(rg.file_types.clone()) }),
        },
        projects: proto_config.projects.into_iter().map(|(k, v)| (k, ModelProjectConfig {
            patterns: v.patterns.clone(),
            append_file_path: v.append_file_path.clone(),
        })).collect(),
        refresh_interval: proto_config.refresh_interval,
        editor_uri_scheme: proto_config.editor_uri_scheme,
        todo_states: proto_config.todo_states.into_iter().map(|proto_state_set| {
            proto_state_set.states // This is already Vec<String>
        }).collect(),
        default_append_basename: proto_config.default_append_basename,
    }
}


// --- Tonic Service Implementations ---
#[derive(Debug)]
pub struct MyTodoService {
    pub config_state: Arc<RwLock<AppConfiguration>>,
}

#[tonic::async_trait]
impl TodoService for MyTodoService {
    async fn get_todos(&self, _request: Request<GetTodosRequest>) -> Result<Response<GetTodosResponse>, Status> {
        let app_config_guard = self.config_state.read().await;
        if let Some(active_config) = app_config_guard.get_active_config() {
            match find_and_process_todos(active_config, false) { // Pass active_config
                Ok(processed_data) => {
                    let proto_categories = processed_data.categories.iter().map(to_proto_todo_category).collect();
                    Ok(Response::new(GetTodosResponse { categories: proto_categories }))
                }
                Err(e) => Err(Status::internal(format!("Failed to process todos: {}", e))),
            }
        } else {
            Err(Status::not_found("Active profile configuration not found for get_todos."))
        }
    }

    async fn edit_todo(&self, request: Request<EditTodoRequest>) -> Result<Response<EditTodoResponse>, Status> {
        let payload = request.into_inner();
        let app_config_guard = self.config_state.read().await;
        if let Some(active_config) = app_config_guard.get_active_config() {
            match edit_todo_in_file_grpc(active_config, &payload.location, &payload.new_content, &payload.original_content, payload.completed) {
                Ok(()) => Ok(Response::new(EditTodoResponse { status: "success".to_string(), message: "Todo edited successfully".to_string() })),
                Err(e) => { 
                    let (code, msg) = match e.kind() {
                        io::ErrorKind::NotFound => (tonic::Code::NotFound, e.to_string()),
                        io::ErrorKind::InvalidInput => (tonic::Code::InvalidArgument, e.to_string()),
                        io::ErrorKind::PermissionDenied => (tonic::Code::PermissionDenied, e.to_string()),
                        io::ErrorKind::Other if e.to_string().contains("Content has been modified") || e.to_string().contains("Content modified") => (tonic::Code::Aborted, e.to_string()),
                        _ => (tonic::Code::Internal, format!("Failed to edit todo: {}", e)),
                    };
                    Err(Status::new(code, msg))
                }
            }
        } else { Err(Status::not_found("Active profile configuration not found for edit_todo.")) }
    }

    async fn add_todo(&self, request: Request<AddTodoRequest>) -> Result<Response<AddTodoResponse>, Status> {
        let payload = request.into_inner();
        let app_config_guard = self.config_state.read().await;
        if let Some(active_config) = app_config_guard.get_active_config() {
            match add_todo_to_file_grpc(active_config, &payload.category_type, &payload.category_name, &payload.content, payload.example_item_location.as_deref()) {
                Ok(()) => Ok(Response::new(AddTodoResponse { status: "success".to_string(), message: "Todo added successfully".to_string() })),
                Err(e) => { 
                    let (code, msg) = match e.kind() {
                        io::ErrorKind::NotFound => (tonic::Code::NotFound, e.to_string()),
                        io::ErrorKind::InvalidInput => (tonic::Code::InvalidArgument, e.to_string()),
                        io::ErrorKind::PermissionDenied => (tonic::Code::PermissionDenied, e.to_string()),
                        _ => (tonic::Code::Internal, format!("Failed to add todo: {}", e)),
                    };
                    Err(Status::new(code, msg))
                 }
            }
        } else { Err(Status::not_found("Active profile configuration not found for add_todo.")) }
    }

    async fn mark_done(&self, request: Request<MarkDoneRequest>) -> Result<Response<MarkDoneResponse>, Status> {
        let payload = request.into_inner();
        let app_config_guard = self.config_state.read().await;
        if let Some(active_config) = app_config_guard.get_active_config() {
            match mark_todo_as_done_in_file_grpc(active_config, &payload.location, &payload.original_content) {
                Ok((new_content, completed_status_changed)) => Ok(Response::new(MarkDoneResponse {
                    status: "success".to_string(), message: "Todo marked as done".to_string(), new_content, completed: completed_status_changed,
                })),
                Err(e) => { 
                     let (code, msg) = match e.kind() {
                        io::ErrorKind::NotFound => (tonic::Code::NotFound, e.to_string()),
                        io::ErrorKind::InvalidInput => (tonic::Code::InvalidArgument, e.to_string()),
                        io::ErrorKind::PermissionDenied => (tonic::Code::PermissionDenied, e.to_string()),
                        io::ErrorKind::Other if e.to_string().contains("Content modified") => (tonic::Code::Aborted, e.to_string()),
                        _ => (tonic::Code::Internal, format!("Failed to mark as done: {}", e)),
                    };
                    Err(Status::new(code, msg))
                }
            }
        } else { Err(Status::not_found("Active profile configuration not found for mark_done.")) }
    }

    async fn cycle_todo_state(&self, request: Request<CycleTodoStateRequest>) -> Result<Response<CycleTodoStateResponse>, Status> {
        let payload = request.into_inner();
        let app_config_guard = self.config_state.read().await;
        if let Some(active_config) = app_config_guard.get_active_config() {
            match cycle_todo_state_in_file_grpc(active_config, &payload.location, &payload.original_content) {
                Ok((new_content_part, new_marker)) => Ok(Response::new(CycleTodoStateResponse {
                    status: "success".to_string(),
                    message: "Todo state cycled successfully".to_string(),
                    new_content: new_content_part,
                    new_marker,
                })),
                Err(e) => { 
                     let (code, msg) = match e.kind() {
                        io::ErrorKind::NotFound => (tonic::Code::NotFound, e.to_string()),
                        io::ErrorKind::InvalidInput => (tonic::Code::InvalidArgument, e.to_string()),
                        io::ErrorKind::InvalidData => (tonic::Code::InvalidArgument, e.to_string()), // For bad config or cycle definition
                        io::ErrorKind::PermissionDenied => (tonic::Code::PermissionDenied, e.to_string()),
                        io::ErrorKind::Other if e.to_string().contains("Content modified") => (tonic::Code::Aborted, e.to_string()),
                        _ => (tonic::Code::Internal, format!("Failed to cycle todo state: {}", e)),
                    };
                    Err(Status::new(code, msg))
                }
            }
        } else { 
            Err(Status::not_found("Active profile configuration not found for cycle_todo_state.")) 
        }
    }
}

#[derive(Debug)]
pub struct MyConfigService {
    pub config_state: Arc<RwLock<AppConfiguration>>,
}

#[tonic::async_trait]
impl ConfigService for MyConfigService {
    async fn get_config(&self, _request: Request<GetConfigRequest>) -> Result<Response<GetConfigResponse>, Status> {
        let app_config_guard = self.config_state.read().await;
        if let Some(active_config) = app_config_guard.get_active_config() {
            let proto_config = to_proto_config(active_config);
            Ok(Response::new(GetConfigResponse {
                config: Some(proto_config),
                active_profile_name: app_config_guard.active_profile.clone(),
            }))
        } else {
            if let Some(default_config) = app_config_guard.profiles.get("default") {
                let proto_config = to_proto_config(default_config);
                Ok(Response::new(GetConfigResponse {
                    config: Some(proto_config),
                    active_profile_name: "default".to_string(),
                }))
            } else {
                Err(Status::internal("Critical error: Default profile configuration is missing and active profile is invalid."))
            }
        }
    }

    async fn update_config(&self, request: Request<UpdateConfigRequest>) -> Result<Response<UpdateConfigResponse>, Status> {
        let proto_profile_config_to_save = request.into_inner().config
            .ok_or_else(|| Status::invalid_argument("Config message for profile is missing"))?;
        let new_profile_config = from_proto_config(proto_profile_config_to_save);

        let mut app_config_guard = self.config_state.write().await;
        let active_profile_name = app_config_guard.active_profile.clone();
        app_config_guard.profiles.insert(active_profile_name.clone(), new_profile_config);
        
        let app_config_to_write = app_config_guard.clone();
        drop(app_config_guard);

        let file_write_result: Result<(), io::Error> = tokio::task::spawn_blocking(move || {
            let _file_guard = CONFIG_FILE_MUTEX.lock(); // Ensure mutex is used here
            let target_path = get_primary_config_path()?;
            write_config_to_path_internal(&app_config_to_write, &target_path)
        }).await.map_err(|e| io::Error::new(io::ErrorKind::Other, format!("Task join error: {}", e)))?;
        
        match file_write_result {
            Ok(_) => Ok(Response::new(UpdateConfigResponse { status: "success".to_string(), message: "Configuration saved successfully.".to_string() })),
            Err(e) => Err(Status::internal(format!("Failed to save AppConfiguration: {}", e))),
        }
    }

    async fn get_active_profile(&self, _request: Request<GetActiveProfileRequest>) -> Result<Response<GetActiveProfileResponse>, Status> {
        let app_config_guard = self.config_state.read().await;
        Ok(Response::new(GetActiveProfileResponse { profile_name: app_config_guard.active_profile.clone() }))
    }

    async fn set_active_profile(&self, request: Request<SetActiveProfileRequest>) -> Result<Response<SetActiveProfileResponse>, Status> {
        let profile_name = request.into_inner().profile_name;
        let mut app_config_guard = self.config_state.write().await;
        if !app_config_guard.profiles.contains_key(&profile_name) {
            return Err(Status::not_found(format!("Profile '{}' not found.", profile_name)));
        }
        app_config_guard.active_profile = profile_name.clone();
        
        let app_config_to_write = app_config_guard.clone();
        drop(app_config_guard);

        match tokio::task::spawn_blocking(move || {
            let _file_guard = CONFIG_FILE_MUTEX.lock();
            let target_path = get_primary_config_path()?;
            write_config_to_path_internal(&app_config_to_write, &target_path)
        }).await.map_err(|e| io::Error::new(io::ErrorKind::Other, format!("Task join error: {}", e)))? {
            Ok(_) => Ok(Response::new(SetActiveProfileResponse { status: "success".to_string(), message: format!("Active profile set to '{}'.", profile_name) })),
            Err(e) => Err(Status::internal(format!("Failed to save configuration after setting active profile: {}", e))),
        }
    }

    async fn list_profiles(&self, _request: Request<ListProfilesRequest>) -> Result<Response<ListProfilesResponse>, Status> {
        let app_config_guard = self.config_state.read().await;
        let profiles_info: Vec<ProfileInfo> = app_config_guard.profiles.keys().map(|name| ProfileInfo { name: name.clone() }).collect();
        Ok(Response::new(ListProfilesResponse { profiles: profiles_info, active_profile_name: app_config_guard.active_profile.clone() }))
    }

    async fn add_profile(&self, request: Request<AddProfileRequest>) -> Result<Response<AddProfileResponse>, Status> {
        let req_data = request.into_inner();
        let new_profile_name = req_data.new_profile_name;
        if new_profile_name.trim().is_empty() { return Err(Status::invalid_argument("Profile name cannot be empty.")); }
        
        let mut app_config_guard = self.config_state.write().await;
        if app_config_guard.profiles.contains_key(&new_profile_name) && req_data.copy_from_profile_name.as_deref() != Some(&new_profile_name) {
            return Err(Status::already_exists(format!("Profile '{}' already exists.", new_profile_name)));
        }

        let profile_to_add = if let Some(copy_from_name) = req_data.copy_from_profile_name {
            app_config_guard.profiles.get(&copy_from_name).cloned()
                .ok_or_else(|| Status::not_found(format!("Profile to copy ('{}') not found.", copy_from_name)))?
        } else {
            Config::default() // Use Config::default() from config_models
        };
        app_config_guard.profiles.insert(new_profile_name.clone(), profile_to_add);
        
        let app_config_to_write = app_config_guard.clone();
        drop(app_config_guard);

        match tokio::task::spawn_blocking(move || {
            let _file_guard = CONFIG_FILE_MUTEX.lock();
            let target_path = get_primary_config_path()?;
            write_config_to_path_internal(&app_config_to_write, &target_path)
        }).await.map_err(|e| io::Error::new(io::ErrorKind::Other, format!("Task join error: {}", e)))? {
            Ok(_) => Ok(Response::new(AddProfileResponse { status: "success".to_string(), message: format!("Profile '{}' added successfully.", new_profile_name) })),
            Err(e) => Err(Status::internal(format!("Failed to save configuration after adding profile: {}", e))),
        }
    }

    async fn delete_profile(&self, request: Request<DeleteProfileRequest>) -> Result<Response<DeleteProfileResponse>, Status> {
        let profile_name_to_delete = request.into_inner().profile_name;
        if profile_name_to_delete == "default" { return Err(Status::invalid_argument("Cannot delete the default profile.")); }
        
        let mut app_config_guard = self.config_state.write().await;
        if app_config_guard.profiles.remove(&profile_name_to_delete).is_none() {
            return Err(Status::not_found(format!("Profile '{}' not found for deletion.", profile_name_to_delete)));
        }
        if app_config_guard.active_profile == profile_name_to_delete {
            app_config_guard.active_profile = "default".to_string(); // Switch to default if active is deleted
        }
        
        let app_config_to_write = app_config_guard.clone();
        drop(app_config_guard);

        match tokio::task::spawn_blocking(move || {
            let _file_guard = CONFIG_FILE_MUTEX.lock();
            let target_path = get_primary_config_path()?;
            write_config_to_path_internal(&app_config_to_write, &target_path)
        }).await.map_err(|e| io::Error::new(io::ErrorKind::Other, format!("Task join error: {}", e)))? {
            Ok(_) => Ok(Response::new(DeleteProfileResponse { status: "success".to_string(), message: format!("Profile '{}' deleted successfully.", profile_name_to_delete) })),
            Err(e) => Err(Status::internal(format!("Failed to save configuration after deleting profile: {}", e))),
        }
    }
} 