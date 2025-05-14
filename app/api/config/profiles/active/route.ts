import { NextRequest, NextResponse } from 'next/server';
import * as grpc from '@grpc/grpc-js';
import { ConfigServiceClient } from '../../../../grpc-generated/unitodo_grpc_pb'; // Adjusted path
import {
    GetActiveProfileRequest,
    GetActiveProfileResponse,
    SetActiveProfileRequest as GrpcSetActiveProfileRequest, // Aliased
    SetActiveProfileResponse as GrpcSetActiveProfileResponse
} from '../../../../grpc-generated/unitodo_pb'; // Adjusted path
import { grpcStatusToHttpStatus } from '../../../utils'; // Corrected import path

// Helper: Convert gRPC status to HTTP status (can be moved to a shared utils file)
// function grpcStatusToHttpStatus(grpcStatus: grpc.status | undefined): number {
//     switch (grpcStatus) {
//         case grpc.status.OK: return 200;
//         case grpc.status.CANCELLED: return 499;
//         case grpc.status.UNKNOWN: return 500;
//         case grpc.status.INVALID_ARGUMENT: return 400;
//         case grpc.status.DEADLINE_EXCEEDED: return 504;
//         case grpc.status.NOT_FOUND: return 404;
//         case grpc.status.ALREADY_EXISTS: return 409;
//         case grpc.status.PERMISSION_DENIED: return 403;
//         case grpc.status.RESOURCE_EXHAUSTED: return 429;
//         case grpc.status.FAILED_PRECONDITION: return 400;
//         case grpc.status.ABORTED: return 409;
//         case grpc.status.OUT_OF_RANGE: return 400;
//         case grpc.status.UNIMPLEMENTED: return 501;
//         case grpc.status.INTERNAL: return 500;
//         case grpc.status.UNAVAILABLE: return 503;
//         case grpc.status.DATA_LOSS: return 500;
//         case grpc.status.UNAUTHENTICATED: return 401;
//         default: return 500;
//     }
// }

// Handler for GET requests to get the active profile name
export async function GET(request: NextRequest) {
    if (process.env.NEXT_PHASE === 'phase-production-build') {
        return NextResponse.json({ profile_name: 'default' });
    }

    const grpcPort = request.headers.get('X-GRPC-Port');
    if (!grpcPort) {
        return NextResponse.json({ error: 'X-GRPC-Port header is required' }, { status: 400 });
    }
    const GRPC_BACKEND_ADDRESS = `localhost:${grpcPort}`;
    const client = new ConfigServiceClient(GRPC_BACKEND_ADDRESS, grpc.credentials.createInsecure());
    const getActiveProfileGrpcRequest = new GetActiveProfileRequest();

    return new Promise<NextResponse>((resolve) => {
        client.getActiveProfile(getActiveProfileGrpcRequest, (error: grpc.ServiceError | null, response: GetActiveProfileResponse | null) => {
            if (error) {
                resolve(NextResponse.json(
                    { error: 'Failed to get active profile (gRPC)', details: error.message }, 
                    { status: grpcStatusToHttpStatus(error.code) }
                ));
            } else if (response) {
                resolve(NextResponse.json({ profile_name: response.getProfileName() }));
            } else {
                resolve(NextResponse.json(
                    { error: 'Failed to get active profile: Empty response', details: 'No data returned' }, 
                    { status: 500 }
                ));
            }
            client.close();
        });
    });
}

interface SetActiveProfileApiRequestBody {
    profile_name: string;
}

// Handler for POST requests to set the active profile
export async function POST(request: NextRequest) {
    if (process.env.NEXT_PHASE === 'phase-production-build') {
        return NextResponse.json({ status: 'skipped_build', message: 'Skipped during build' }, { status: 200 });
    }

    const grpcPort = request.headers.get('X-GRPC-Port');
    if (!grpcPort) {
        return NextResponse.json({ error: 'X-GRPC-Port header is required' }, { status: 400 });
    }
    const GRPC_BACKEND_ADDRESS = `localhost:${grpcPort}`;
    const client = new ConfigServiceClient(GRPC_BACKEND_ADDRESS, grpc.credentials.createInsecure());

    try {
        const payload: SetActiveProfileApiRequestBody = await request.json();
        if (!payload.profile_name || payload.profile_name.trim() === '') {
            return NextResponse.json({ error: 'profile_name is required' }, { status: 400 });
        }

        const setActiveProfileGrpcRequest = new GrpcSetActiveProfileRequest();
        setActiveProfileGrpcRequest.setProfileName(payload.profile_name);

        return new Promise<NextResponse>((resolve) => {
            client.setActiveProfile(setActiveProfileGrpcRequest, (error: grpc.ServiceError | null, response: GrpcSetActiveProfileResponse | null) => {
                if (error) {
                    resolve(NextResponse.json(
                        { error: 'Failed to set active profile (gRPC)', details: error.message }, 
                        { status: grpcStatusToHttpStatus(error.code) }
                    ));
                } else if (response) {
                    resolve(NextResponse.json({ status: response.getStatus(), message: response.getMessage() }));
                } else {
                    resolve(NextResponse.json(
                        { error: 'Failed to set active profile: Empty response', details: 'No status returned' }, 
                        { status: 500 }
                    ));
                }
                client.close();
            });
        });
    } catch (error: any) {
        if (error instanceof SyntaxError) {
            return NextResponse.json({ error: 'Invalid JSON body', details: error.message }, { status: 400 });
        }
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
    }
} 