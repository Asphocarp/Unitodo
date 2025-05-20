import { invoke } from '@tauri-apps/api/core';
import { Config as AppConfig } from '../types';
// Assuming unitodo_pb contains the necessary class definitions for ProtoConfigMessage etc.
// Adjust the import path and names if they differ in your actual generated file.
import {
    ConfigMessage as ProtoConfigMessage,
    RgConfigMessage as ProtoRgConfigMessage,
    ProjectConfigMessage as ProtoProjectConfigMessage,
    TodoStateSet as ProtoTodoStateSet, // Assuming this is the new generated type
    // Request and Response types from gRPC for config service, including new profile ones
    GetConfigResponse as ProtoGetConfigResponse,
    UpdateConfigResponse as ProtoUpdateConfigResponse,
    GetActiveProfileResponse as ProtoGetActiveProfileResponse,
    SetActiveProfileRequest as ProtoSetActiveProfileRequest, // Only if needed directly, usually wrapped
    SetActiveProfileResponse as ProtoSetActiveProfileResponse,
    ListProfilesResponse as ProtoListProfilesResponse,
    ProfileInfo as ProtoProfileInfo, // Ensure this is imported if used directly by a service function
    AddProfileRequest as ProtoAddProfileRequest, // Only if needed directly
    AddProfileResponse as ProtoAddProfileResponse,
    DeleteProfileRequest as ProtoDeleteProfileRequest, // Only if needed directly
    DeleteProfileResponse as ProtoDeleteProfileResponse
} from '../grpc-generated/unitodo_pb';

// --- Plain Object Interfaces for Service Function Return Types ---
interface PlainProfileInfo {
    name: string;
}

interface PlainListProfilesResponse {
    profiles: PlainProfileInfo[];
    activeProfileName: string;
}

// Helper to convert frontend AppConfig to ProtoConfigMessage for sending to Rust
function appConfigToProtoConfigMessage(appConfig: AppConfig): ProtoConfigMessage {
    const protoConfig = new ProtoConfigMessage();

    if (appConfig.rg) {
        const protoRg = new ProtoRgConfigMessage();
        protoRg.setPathsList(appConfig.rg.paths || []);
        if (appConfig.rg.ignore) {
            protoRg.setIgnoreList(appConfig.rg.ignore);
        }
        if (appConfig.rg.file_types) {
            protoRg.setFileTypesList(appConfig.rg.file_types);
        }
        protoConfig.setRg(protoRg);
    }

    if (appConfig.projects) {
        const projectsMap = protoConfig.getProjectsMap(); // Get the map instance from the proto object
        Object.entries(appConfig.projects).forEach(([key, projectConf]) => {
            const protoProject = new ProtoProjectConfigMessage();
            protoProject.setPatternsList(projectConf.patterns || []);
            if (projectConf.append_file_path) {
                protoProject.setAppendFilePath(projectConf.append_file_path);
            }
            projectsMap.set(key, protoProject); // Use the map's set method
        });
    }

    protoConfig.setRefreshInterval(appConfig.refresh_interval || 0);
    protoConfig.setEditorUriScheme(appConfig.editor_uri_scheme || '');

    // Convert appConfig.todo_states (string[][]) to list of ProtoTodoStateSet
    if (appConfig.todo_states) {
        const protoStateSets = appConfig.todo_states.map(state_set_array => {
            const protoStateSet = new ProtoTodoStateSet();
            protoStateSet.setStatesList(state_set_array);
            return protoStateSet;
        });
        protoConfig.setTodoStatesList(protoStateSets); // Use setTodoStatesList or addTodoStates based on generated API
    }
    protoConfig.setDefaultAppendBasename(appConfig.default_append_basename || '');

    return protoConfig;
}

// New helper to convert AppConfig to a plain JS object suitable for Rust backend via Tauri
function appConfigToRustPayload(appConfig: AppConfig): any {
    const rgPayload: any = {
        paths: appConfig.rg?.paths || [],
        ignore: appConfig.rg?.ignore || [],
        file_types: appConfig.rg?.file_types || [] 
    };

    const projectsPayload: { [key: string]: any } = {};
    if (appConfig.projects) {
        for (const [key, projConfig] of Object.entries(appConfig.projects)) {
            projectsPayload[key] = {
                patterns: projConfig.patterns || [],
                append_file_path: projConfig.append_file_path 
            };
        }
    }

    // This needs to match the structure that serde will deserialize into ProtoConfigMessage
    // where ProtoConfigMessage has a field `todo_states: Vec<ProtoTodoStateSet>`
    // and ProtoTodoStateSet is struct { states: Vec<String> }
    const todoStatesForPayload = (appConfig.todo_states || []).map(state_set => {
        return { states: state_set }; // Each item is an object { states: string[] }
    });

    return {
        rg: rgPayload,
        projects: projectsPayload,
        refresh_interval: appConfig.refresh_interval,
        editor_uri_scheme: appConfig.editor_uri_scheme,
        todo_states: todoStatesForPayload, 
        default_append_basename: appConfig.default_append_basename 
    };
}

interface ProtoRgConfigShape {
    paths?: string[];
    ignore?: string[];
    file_types?: string[];
}

interface ProtoProjectConfigShape {
    patterns?: string[];
    append_file_path?: string;
}

interface ProtoTodoStateSetShape {
    states?: string[];
}

interface ProtoConfigMessageShape {
    rg?: ProtoRgConfigShape;
    projects?: { [key: string]: ProtoProjectConfigShape };
    refresh_interval?: number;
    editor_uri_scheme?: string;
    todo_states?: ProtoTodoStateSetShape[]; 
    default_append_basename?: string;
}

function protoConfigMessageToAppConfig(protoMsg?: ProtoConfigMessageShape): AppConfig {
    if (!protoMsg) { 
        return {
            rg: { paths: [], ignore: [], file_types: [] }, 
            projects: {}, 
            refresh_interval: 5000, 
            editor_uri_scheme: 'vscode://file/',
            todo_states: [], 
            default_append_basename: 'unitodo.append.md'
        } as AppConfig;
    }
    const projects: { [key: string]: { patterns: string[]; append_file_path?: string } } = {};
    if (protoMsg.projects) {
        Object.entries(protoMsg.projects).forEach(([key, projectVal]) => {
            projects[key] = {
                patterns: projectVal.patterns || [], 
                append_file_path: projectVal.append_file_path,
            };
        });
    }

    const rgVal = protoMsg.rg;

    let appTodoStates: string[][] = [];
    if (protoMsg.todo_states && Array.isArray(protoMsg.todo_states)) {
        appTodoStates = protoMsg.todo_states.map((protoStateSet) => {
            return protoStateSet.states || [];
        });
    }

    return {
        rg: {
            paths: rgVal?.paths || [], 
            ignore: rgVal?.ignore || [], 
            file_types: rgVal?.file_types || [], 
        }, 
        projects: projects,
        refresh_interval: protoMsg.refresh_interval || 0, 
        editor_uri_scheme: protoMsg.editor_uri_scheme || '', 
        todo_states: appTodoStates, 
        default_append_basename: protoMsg.default_append_basename || '', 
    };
}

// fetchConfig now returns the active profile's config and its name
export async function fetchConfig(): Promise<{ config: AppConfig; activeProfileName: string }> {
  try {
    const result = await invoke<any>('get_config_command');
    const plainResult = result as any; 
    const appConfig = protoConfigMessageToAppConfig(plainResult.config);
    return { 
        config: appConfig, 
        activeProfileName: plainResult.active_profile_name || 'default' 
    };
  } catch (error) {
    console.error('Error invoking get_config_command:', error);
    return {
        config: protoConfigMessageToAppConfig(), // Return default config
        activeProfileName: 'default'
    };
  }
}

// updateConfig updates the config for the currently active profile
export async function updateConfig(newConfig: AppConfig): Promise<{ status: string; message: string }> {
  try {
    // Convert AppConfig directly to the plain object structure Rust expects
    const plainPayload = appConfigToRustPayload(newConfig);
    
    const result = await invoke<any>('update_config_command', { newConfigPayload: plainPayload });
    const plainResult = result as any;
    return {
        status: plainResult.status || 'error',
        message: plainResult.message || 'Unknown error'
    };
  } catch (error) {
    console.error('Error invoking update_config_command:', error);
    return Promise.reject({ status: 'error', message: (error as Error).message || 'Failed to update config' });
  }
}

// New service functions for profile management
export async function fetchActiveProfile(): Promise<string> {
    try {
        const result = await invoke<any>('get_active_profile_command');
        // Access property directly, handle potential casing differences if any from proto
        return (result as any).profile_name || 'default'; // Rust sends 'profile_name'
    } catch (error) {
        console.error('Error fetching active profile:', error);
        return 'default'; // Fallback
    }
}

export async function setActiveProfile(profileName: string): Promise<ProtoSetActiveProfileResponse> {
    try {
        const result = await invoke<any>('set_active_profile_command', { profileName });
        return result as any; // Assuming direct cast is okay or plain object matches
    } catch (error) {
        console.error(`Error setting active profile to ${profileName}:`, error);
        throw error;
    }
}

export async function fetchProfiles(): Promise<PlainListProfilesResponse> {
    try {
        const result = await invoke<any>('list_profiles_command');
        const plainResult = result as any; 
        // Rust backend sends: { profiles: [{ name: string }, ...], active_profile_name: string }
        return { 
            profiles: (plainResult.profiles || []).map((p: any) => ({ name: p.name || '' })), // Ensure name exists
            activeProfileName: plainResult.active_profile_name || 'default' 
        };
    } catch (error) {
        console.error('Error fetching profiles:', error);
        // Return a default structure that matches PlainListProfilesResponse
        return { profiles: [], activeProfileName: 'default' };
    }
}

export async function addProfile(newProfileName: string, copyFromProfileName?: string): Promise<ProtoAddProfileResponse> {
    try {
        const result = await invoke<any>('add_profile_command', { newProfileName, copyFromProfileName });
        return result as any;
    } catch (error) {
        console.error(`Error adding profile ${newProfileName}:`, error);
        throw error;
    }
}

export async function deleteProfile(profileName: string): Promise<ProtoDeleteProfileResponse> {
    try {
        const result = await invoke<any>('delete_profile_command', { profileName });
        return result as any;
    } catch (error) {
        console.error(`Error deleting profile ${profileName}:`, error);
        throw error;
    }
} 