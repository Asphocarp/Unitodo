import { invoke } from '@tauri-apps/api/core';
import { Config as AppConfig } from '../types';
// Assuming unitodo_pb contains the necessary class definitions for ProtoConfigMessage etc.
// Adjust the import path and names if they differ in your actual generated file.
import { ConfigMessage as ProtoConfigMessage, RgConfigMessage as ProtoRgConfigMessage, ProjectConfigMessage as ProtoProjectConfigMessage, TodoDonePair as ProtoTodoDonePair, UpdateConfigResponse as ProtoUpdateConfigResponse } from '../grpc-generated/unitodo_pb';

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

    if (appConfig.todo_done_pairs) {
        appConfig.todo_done_pairs.forEach(pair => {
            if (pair && pair.length === 2) {
                const protoPair = new ProtoTodoDonePair();
                protoPair.setTodoMarker(pair[0]);
                protoPair.setDoneMarker(pair[1]);
                protoConfig.addTodoDonePairs(protoPair);
            }
        });
    }
    protoConfig.setDefaultAppendBasename(appConfig.default_append_basename || '');

    return protoConfig;
}

// Helper to convert ProtoConfigMessage (from Rust command) to frontend AppConfig
function protoConfigMessageToAppConfig(protoMsg: ProtoConfigMessage): AppConfig {
    const projects: { [key: string]: { patterns: string[]; append_file_path?: string } } = {};
    protoMsg.getProjectsMap().forEach((protoProjectConfig: ProtoProjectConfigMessage, key: string) => {
        projects[key] = {
            patterns: protoProjectConfig.getPatternsList(),
            append_file_path: protoProjectConfig.getAppendFilePath() || undefined,
        };
    });

    const rgConfig = protoMsg.getRg();

    return {
        rg: rgConfig ? {
            paths: rgConfig.getPathsList(),
            ignore: rgConfig.getIgnoreList(),
            file_types: rgConfig.getFileTypesList(),
        } : { paths: [] }, 
        projects: projects,
        refresh_interval: protoMsg.getRefreshInterval(),
        editor_uri_scheme: protoMsg.getEditorUriScheme(),
        todo_done_pairs: protoMsg.getTodoDonePairsList().map(p => [p.getTodoMarker(), p.getDoneMarker()]),
        default_append_basename: protoMsg.getDefaultAppendBasename(),
    };
}

export async function fetchConfig(): Promise<AppConfig> {
  try {
    // Assuming the Rust command get_config_command returns a structure compatible with ProtoConfigMessage
    const result = await invoke<ProtoConfigMessage>('get_config_command');
    // The result from invoke might be a plain object, not an instance of ProtoConfigMessage.
    // We need to instantiate ProtoConfigMessage and populate it if direct casting isn't enough.
    // For now, assuming the structure matches and can be passed to the converter.
    // If result is a plain object: Object.assign(new ProtoConfigMessage(), result)
    // However, with protobuf.js, you usually get instances if the invoke deserializes correctly based on types, 
    // or you might get a plain object if Tauri's JSON deserialization is used directly.
    // Let's assume for now it's a plain JS object that matches the structure of ProtoConfigMessage fields.
    // The safest way is to manually construct a ProtoConfigMessage if 'result' is a plain object.
    // This highly depends on how Tauri serializes complex Rust structs with nested fields to JS.
    // For simplicity, we'll assume the converter can handle a plain object matching the structure.

    // If result from invoke is a plain object, we need to make it an instance of ProtoConfigMessage
    // or ensure our protoConfigMessageToAppConfig can handle a plain object.
    // Let's make protoConfigMessageToAppConfig more robust by not assuming methods like .getRg()
    // if the input could be a plain object from JSON deserialization.

    // Re-designing the converter to accept a plain object that structurally matches ProtoConfigMessage
    const plainObjectToAppConfig = (data: any): AppConfig => {
        const projectsMapData = data.projects || {}; // Assuming 'projects' is the key for the map in the plain object
        const projects: { [key: string]: { patterns: string[]; append_file_path?: string } } = {};
        Object.entries(projectsMapData).forEach(([key, val]: [string, any]) => {
            projects[key] = {
                patterns: val.patterns || [],
                append_file_path: val.append_file_path || undefined,
            };
        });

        const rgData = data.rg || {};
        return {
            rg: {
                paths: rgData.paths || [],
                ignore: rgData.ignore || [],
                file_types: rgData.file_types || [],
            },
            projects: projects,
            refresh_interval: data.refresh_interval || 0,
            editor_uri_scheme: data.editor_uri_scheme || '',
            todo_done_pairs: (data.todo_done_pairs || []).map((p: any) => [p.todo_marker, p.done_marker]),
            default_append_basename: data.default_append_basename || '',
        };
    };

    return plainObjectToAppConfig(result as any); // Cast to any to use with the new converter

  } catch (error) {
    console.error('Error invoking get_config_command:', error);
    // Return a default/empty-like config or rethrow
    return Promise.resolve({
        rg: { paths: [] }, 
        projects: {}, 
        refresh_interval: 5000, 
        editor_uri_scheme: 'vscode://file/',
        todo_done_pairs: [],
        default_append_basename: 'unitodo.append.md'
    } as AppConfig);
  }
}

export async function updateConfig(newConfig: AppConfig): Promise<{ status: string; message: string }> {
  try {
    const payload = appConfigToProtoConfigMessage(newConfig);
    // The invoke payload should be an object where keys match the Rust command's argument names.
    const result = await invoke<ProtoUpdateConfigResponse>('update_config_command', { newConfigPayload: payload });
    // Assuming ProtoUpdateConfigResponse from unitodo_pb.js has getStatus and getMessage methods
    // If result is a plain object, access properties directly: result.status, result.message
    // For now, assume it's a plain object as that's common with Tauri's JSON layer.
    return {
        status: (result as any).status || 'error',
        message: (result as any).message || 'Unknown error'
    };
  } catch (error) {
    console.error('Error invoking update_config_command:', error);
    // Return an error status object or rethrow
    return Promise.reject({ status: 'error', message: (error as Error).message || 'Failed to update config' });
  }
} 