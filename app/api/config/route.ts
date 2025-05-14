import { NextRequest, NextResponse } from 'next/server';
import * as grpc from '@grpc/grpc-js';
import { ConfigServiceClient } from '../../grpc-generated/unitodo_grpc_pb';
import {
    GetConfigRequest as GrpcGetConfigRequest,
    GetConfigResponse as GrpcGetConfigResponse,
    UpdateConfigRequest as GrpcUpdateConfigRequest,
    UpdateConfigResponse as GrpcUpdateConfigResponse,
    ConfigMessage as PbConfigMessage,
    RgConfigMessage as PbRgConfigMessage,
    ProjectConfigMessage as PbProjectConfigMessage,
    TodoDonePair as PbTodoDonePair
} from '../../grpc-generated/unitodo_pb';
import { Config as AppConfig, RgConfig as AppRgConfig, ProjectConfig as AppProjectConfig } from '@/app/types';
import { grpcStatusToHttpStatus } from '../utils';

// --- Helper: AppConfig (from frontend/app/types.ts) to gRPC ConfigMessage ---
function appConfigToGrpcConfigMessage(appConfig: AppConfig): PbConfigMessage {
    const configMessage = new PbConfigMessage();
    
    const rgMessage = new PbRgConfigMessage();
    rgMessage.setPathsList(appConfig.rg.paths || []);
    rgMessage.setIgnoreList(appConfig.rg.ignore || []);
    rgMessage.setFileTypesList(appConfig.rg.file_types || []);
    configMessage.setRg(rgMessage);

    const projectsMap = configMessage.getProjectsMap();
    for (const [key, value] of Object.entries(appConfig.projects)) {
        const projectMessage = new PbProjectConfigMessage();
        projectMessage.setPatternsList(value.patterns || []);
        if (value.append_file_path) {
            projectMessage.setAppendFilePath(value.append_file_path);
        }
        projectsMap.set(key, projectMessage);
    }

    configMessage.setRefreshInterval(appConfig.refresh_interval);
    configMessage.setEditorUriScheme(appConfig.editor_uri_scheme);
    
    const todoDonePairs = appConfig.todo_done_pairs.map(pairArray => {
        const pairMessage = new PbTodoDonePair();
        pairMessage.setTodoMarker(pairArray[0] || "");
        pairMessage.setDoneMarker(pairArray[1] || "");
        return pairMessage;
    });
    configMessage.setTodoDonePairsList(todoDonePairs);
    configMessage.setDefaultAppendBasename(appConfig.default_append_basename);
    
    return configMessage;
}

// --- Helper: gRPC ConfigMessage to AppConfig ---
function grpcConfigMessageToAppConfig(configMessage?: PbConfigMessage): AppConfig {
    if (!configMessage) {
        // Return a default or empty AppConfig if configMessage is undefined
        return {
            rg: { paths: [], ignore: [], file_types: [] },
            projects: {},
            refresh_interval: 5000,
            editor_uri_scheme: 'vscode://file/',
            todo_done_pairs: [],
            default_append_basename: 'unitodo.append.md'
        };
    }
    const projects: Record<string, AppProjectConfig> = {};
    configMessage.getProjectsMap().forEach((value: PbProjectConfigMessage, key: string) => {
        projects[key] = {
            patterns: value.getPatternsList(),
            append_file_path: value.hasAppendFilePath() ? value.getAppendFilePath() : undefined,
        };
    });

    return {
        rg: {
            paths: configMessage.getRg()?.getPathsList() || [],
            ignore: configMessage.getRg()?.getIgnoreList(),
            file_types: configMessage.getRg()?.getFileTypesList(),
        },
        projects: projects,
        refresh_interval: configMessage.getRefreshInterval(),
        editor_uri_scheme: configMessage.getEditorUriScheme(),
        todo_done_pairs: configMessage.getTodoDonePairsList().map((pair: PbTodoDonePair) => [pair.getTodoMarker(), pair.getDoneMarker()]),
        default_append_basename: configMessage.getDefaultAppendBasename(),
    };
}

// Handler for GET requests to fetch active profile's config
export async function GET(request: NextRequest) {
    if (process.env.NEXT_PHASE === 'phase-production-build') {
        console.log('[API Route GET /api/config] Build phase, skipping gRPC call.');
        return NextResponse.json({
            config: {
                rg: { paths: [], ignore: [], file_types: [] },
                projects: {},
                refresh_interval: 5000,
                editor_uri_scheme: 'vscode://file/',
                todo_done_pairs: [],
                default_append_basename: 'unitodo.append.md'
            },
            activeProfileName: 'default'
        });
    }

    const grpcPort = request.headers.get('X-GRPC-Port');
    if (!grpcPort) {
        console.error('[API Route GET /api/config] X-GRPC-Port header missing');
        return NextResponse.json({ error: 'X-GRPC-Port header is required' }, { status: 400 });
    }
    const GRPC_BACKEND_ADDRESS = `localhost:${grpcPort}`;
    console.log(`[API Route GET /api/config] Connecting to gRPC server at: ${GRPC_BACKEND_ADDRESS}`);

    const client = new ConfigServiceClient(GRPC_BACKEND_ADDRESS, grpc.credentials.createInsecure());
    const getConfigGrpcRequest = new GrpcGetConfigRequest();

    return new Promise<NextResponse>((resolve) => {
        client.getConfig(getConfigGrpcRequest, (error: grpc.ServiceError | null, response: GrpcGetConfigResponse | null) => {
            if (error) {
                console.error('gRPC Error fetching config:', error);
                resolve(NextResponse.json(
                    { error: 'Failed to fetch config from backend (gRPC)', details: error.message }, 
                    { status: grpcStatusToHttpStatus(error.code) }
                ));
            } else if (response) {
                const appConfig = grpcConfigMessageToAppConfig(response.getConfig());
                const activeProfileName = response.getActiveProfileName();
                console.log(`Config for profile '${activeProfileName}' fetched successfully from Rust gRPC backend.`);
                resolve(NextResponse.json({ config: appConfig, activeProfileName }));
            } else {
                console.error('gRPC Error: No config in response or empty response');
                resolve(NextResponse.json(
                    { error: 'Failed to fetch config: Empty or invalid response from backend', details: 'No config data returned' }, 
                    { status: 500 }
                ));
            }
            client.close();
        });
    });
}

// Handler for POST requests to update active profile's config
export async function POST(request: NextRequest) {
    if (process.env.NEXT_PHASE === 'phase-production-build') {
        console.log('[API Route POST /api/config] Build phase, skipping gRPC call.');
        return NextResponse.json({ status: 'skipped_build', message: 'Skipped during build' }, { status: 200 });
    }

    const grpcPort = request.headers.get('X-GRPC-Port');
    if (!grpcPort) {
        console.error('[API Route POST /api/config] X-GRPC-Port header missing');
        return NextResponse.json({ error: 'X-GRPC-Port header is required' }, { status: 400 });
    }
    const GRPC_BACKEND_ADDRESS = `localhost:${grpcPort}`;
    console.log(`[API Route POST /api/config] Connecting to gRPC server at: ${GRPC_BACKEND_ADDRESS}`);

    const client = new ConfigServiceClient(GRPC_BACKEND_ADDRESS, grpc.credentials.createInsecure());
    try {
        const payload: AppConfig = await request.json();
        const grpcRequest = new GrpcUpdateConfigRequest();
        grpcRequest.setConfig(appConfigToGrpcConfigMessage(payload));

        return new Promise<NextResponse>((resolve) => {
            client.updateConfig(grpcRequest, (error: grpc.ServiceError | null, response: GrpcUpdateConfigResponse | null) => {
                if (error) {
                    console.error('gRPC Error updating config:', error);
                    resolve(NextResponse.json(
                        { error: 'Failed to update config via backend (gRPC)', details: error.message }, 
                        { status: grpcStatusToHttpStatus(error.code) }
                    ));
                } else if (response) {
                    console.log("Config update request for active profile forwarded successfully via gRPC.");
                    resolve(NextResponse.json({ status: response.getStatus(), message: response.getMessage() }));
                } else {
                     resolve(NextResponse.json(
                        { error: 'Failed to update config: Empty response from backend', details: 'No status returned' }, 
                        { status: 500 }
                    ));
                }
                client.close();
            });
        });
    } catch (error: any) {
        console.error('Error processing POST /config request:', error);
        if (error instanceof SyntaxError) {
            return NextResponse.json(
                { error: 'Invalid request body. Expected valid JSON Config.', details: error.message }, 
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: 'Internal server error processing config update', details: error.message }, 
            { status: 500 }
        );
    }
}