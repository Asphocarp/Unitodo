import { NextRequest, NextResponse } from 'next/server';
import * as grpc from '@grpc/grpc-js';
import { ConfigServiceClient } from '../../grpc-generated/unitodo_grpc_pb';
import {
    GetConfigRequest,
    GetConfigResponse,
    UpdateConfigRequest,
    UpdateConfigResponse,
    ConfigMessage as PbConfigMessage,
    RgConfigMessage as PbRgConfigMessage,
    ProjectConfigMessage as PbProjectConfigMessage,
    TodoDonePair as PbTodoDonePair
} from '../../grpc-generated/unitodo_pb';
import { Config as AppConfig, RgConfig as AppRgConfig, ProjectConfig as AppProjectConfig } from '@/app/types';

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
function grpcConfigMessageToAppConfig(configMessage: PbConfigMessage): AppConfig {
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

// Handler for GET requests to fetch config
export async function GET(request: NextRequest) {
    if (process.env.NEXT_PHASE === 'phase-production-build') {
        console.log('[API Route GET /api/config] Build phase, skipping gRPC call.');
        return NextResponse.json({
            rg: { paths: [], ignore: [], file_types: [] },
            projects: {},
            refresh_interval: 5000,
            editor_uri_scheme: 'vscode://file/',
            todo_done_pairs: [],
            default_append_basename: 'unitodo.append.md'
        });
    }

    const grpcPort = request.headers.get('X-GRPC-Port');
    if (!grpcPort) {
        console.error('[API Route GET /api/config] X-GRPC-Port header missing');
        return NextResponse.json(
            { error: 'X-GRPC-Port header is required' }, 
            { status: 400 }
        );
    }
    const GRPC_BACKEND_ADDRESS = `localhost:${grpcPort}`;
    console.log(`[API Route GET /api/config] Connecting to gRPC server at: ${GRPC_BACKEND_ADDRESS}`);

    const client = new ConfigServiceClient(GRPC_BACKEND_ADDRESS, grpc.credentials.createInsecure());
    const getConfigGrpcRequest = new GetConfigRequest();

    return new Promise<NextResponse>((resolve) => {
        client.getConfig(getConfigGrpcRequest, (error: grpc.ServiceError | null, response: GetConfigResponse | null) => {
            if (error) {
                console.error('gRPC Error fetching config:', error);
                resolve(NextResponse.json(
                    { error: 'Failed to fetch config from backend (gRPC)', details: error.message }, 
                    { status: grpcStatusToHttpStatus(error.code) }
                ));
            } else if (response && response.hasConfig()) {
                const appConfig = grpcConfigMessageToAppConfig(response.getConfig()!);
                console.log("Config fetched successfully from Rust gRPC backend.");
                resolve(NextResponse.json(appConfig));
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

// Handler for POST requests to update config
export async function POST(request: NextRequest) {
    if (process.env.NEXT_PHASE === 'phase-production-build') {
        console.log('[API Route POST /api/config] Build phase, skipping gRPC call.');
        return NextResponse.json({ status: 'skipped_build', message: 'Skipped during build' }, { status: 200 });
    }

    const grpcPort = request.headers.get('X-GRPC-Port');
    if (!grpcPort) {
        console.error('[API Route POST /api/config] X-GRPC-Port header missing');
        return NextResponse.json(
            { error: 'X-GRPC-Port header is required' }, 
            { status: 400 }
        );
    }
    const GRPC_BACKEND_ADDRESS = `localhost:${grpcPort}`;
    console.log(`[API Route POST /api/config] Connecting to gRPC server at: ${GRPC_BACKEND_ADDRESS}`);

    const client = new ConfigServiceClient(GRPC_BACKEND_ADDRESS, grpc.credentials.createInsecure());
    try {
        const payload: AppConfig = await request.json();
        const grpcRequest = new UpdateConfigRequest();
        grpcRequest.setConfig(appConfigToGrpcConfigMessage(payload));

        return new Promise<NextResponse>((resolve) => {
            client.updateConfig(grpcRequest, (error: grpc.ServiceError | null, response: UpdateConfigResponse | null) => {
                if (error) {
                    console.error('gRPC Error updating config:', error);
                    resolve(NextResponse.json(
                        { error: 'Failed to update config via backend (gRPC)', details: error.message }, 
                        { status: grpcStatusToHttpStatus(error.code) }
                    ));
                } else if (response) {
                    console.log("Config update request forwarded successfully via gRPC.");
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

// Re-use grpcStatusToHttpStatus or ensure it's available (e.g. from a shared utils file)
function grpcStatusToHttpStatus(grpcStatus: grpc.status | undefined): number {
    switch (grpcStatus) {
        case grpc.status.OK: return 200;
        case grpc.status.CANCELLED: return 499;
        case grpc.status.UNKNOWN: return 500;
        case grpc.status.INVALID_ARGUMENT: return 400;
        case grpc.status.DEADLINE_EXCEEDED: return 504;
        case grpc.status.NOT_FOUND: return 404;
        case grpc.status.ALREADY_EXISTS: return 409;
        case grpc.status.PERMISSION_DENIED: return 403;
        case grpc.status.RESOURCE_EXHAUSTED: return 429;
        case grpc.status.FAILED_PRECONDITION: return 400;
        case grpc.status.ABORTED: return 409;
        case grpc.status.OUT_OF_RANGE: return 400;
        case grpc.status.UNIMPLEMENTED: return 501;
        case grpc.status.INTERNAL: return 500;
        case grpc.status.UNAVAILABLE: return 503;
        case grpc.status.DATA_LOSS: return 500;
        case grpc.status.UNAUTHENTICATED: return 401;
        default: return 500;
    }
} 