import { NextRequest, NextResponse } from 'next/server';
import * as grpc from '@grpc/grpc-js';
import { ConfigServiceClient } from '../../../grpc-generated/unitodo_grpc_pb'; // Adjusted path
import {
    ListProfilesRequest,
    ListProfilesResponse,
    AddProfileRequest as GrpcAddProfileRequest, // Aliased to avoid conflict
    AddProfileResponse as GrpcAddProfileResponse
} from '../../../grpc-generated/unitodo_pb'; // Adjusted path
import { grpcStatusToHttpStatus } from '../../utils'; // Corrected import path

// Helper: Convert gRPC status to HTTP status (can be moved to a shared utils file)
// function grpcStatusToHttpStatus(grpcStatus: grpc.status | undefined): number {
//     switch (grpcStatus) {
//         case grpc.status.OK: return 200;
//         case grpc.status.CANCELLED: return 499; // Client Closed Request
//         case grpc.status.UNKNOWN: return 500; // Internal Server Error
//         case grpc.status.INVALID_ARGUMENT: return 400; // Bad Request
//         case grpc.status.DEADLINE_EXCEEDED: return 504; // Gateway Timeout
//         case grpc.status.NOT_FOUND: return 404; // Not Found
//         case grpc.status.ALREADY_EXISTS: return 409; // Conflict
//         case grpc.status.PERMISSION_DENIED: return 403; // Forbidden
//         case grpc.status.RESOURCE_EXHAUSTED: return 429; // Too Many Requests
//         case grpc.status.FAILED_PRECONDITION: return 400; // Bad Request (often used for this)
//         case grpc.status.ABORTED: return 409; // Conflict
//         case grpc.status.OUT_OF_RANGE: return 400; // Bad Request
//         case grpc.status.UNIMPLEMENTED: return 501; // Not Implemented
//         case grpc.status.INTERNAL: return 500; // Internal Server Error
//         case grpc.status.UNAVAILABLE: return 503; // Service Unavailable
//         case grpc.status.DATA_LOSS: return 500; // Internal Server Error
//         case grpc.status.UNAUTHENTICATED: return 401; // Unauthorized
//         default: return 500;
//     }
// }

// Handler for GET requests to list profiles
export async function GET(request: NextRequest) {
    if (process.env.NEXT_PHASE === 'phase-production-build') {
        return NextResponse.json({ profiles: [{name: 'default'}], active_profile_name: 'default' });
    }

    const grpcPort = request.headers.get('X-GRPC-Port');
    if (!grpcPort) {
        return NextResponse.json({ error: 'X-GRPC-Port header is required' }, { status: 400 });
    }
    const GRPC_BACKEND_ADDRESS = `localhost:${grpcPort}`;
    const client = new ConfigServiceClient(GRPC_BACKEND_ADDRESS, grpc.credentials.createInsecure());
    const listProfilesGrpcRequest = new ListProfilesRequest();

    return new Promise<NextResponse>((resolve) => {
        client.listProfiles(listProfilesGrpcRequest, (error: grpc.ServiceError | null, response: ListProfilesResponse | null) => {
            if (error) {
                resolve(NextResponse.json(
                    { error: 'Failed to list profiles (gRPC)', details: error.message }, 
                    { status: grpcStatusToHttpStatus(error.code) }
                ));
            } else if (response) {
                const profiles = response.getProfilesList().map(p => ({ name: p.getName() }));
                resolve(NextResponse.json({ profiles, active_profile_name: response.getActiveProfileName() }));
            } else {
                resolve(NextResponse.json(
                    { error: 'Failed to list profiles: Empty response', details: 'No data returned' }, 
                    { status: 500 }
                ));
            }
            client.close();
        });
    });
}

interface AddProfileApiRequestBody {
    new_profile_name: string;
    copy_from_profile_name?: string;
}

// Handler for POST requests to add a new profile
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
        const payload: AddProfileApiRequestBody = await request.json();
        if (!payload.new_profile_name || payload.new_profile_name.trim() === '') {
            return NextResponse.json({ error: 'new_profile_name is required' }, { status: 400 });
        }

        const addProfileGrpcRequest = new GrpcAddProfileRequest();
        addProfileGrpcRequest.setNewProfileName(payload.new_profile_name);
        if (payload.copy_from_profile_name) {
            addProfileGrpcRequest.setCopyFromProfileName(payload.copy_from_profile_name);
        }

        return new Promise<NextResponse>((resolve) => {
            client.addProfile(addProfileGrpcRequest, (error: grpc.ServiceError | null, response: GrpcAddProfileResponse | null) => {
                if (error) {
                    resolve(NextResponse.json(
                        { error: 'Failed to add profile (gRPC)', details: error.message }, 
                        { status: grpcStatusToHttpStatus(error.code) }
                    ));
                } else if (response) {
                    resolve(NextResponse.json({ status: response.getStatus(), message: response.getMessage() }));
                } else {
                    resolve(NextResponse.json(
                        { error: 'Failed to add profile: Empty response', details: 'No status returned' }, 
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