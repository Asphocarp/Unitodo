import { NextRequest, NextResponse } from 'next/server';
import * as grpc from '@grpc/grpc-js';
import { ConfigServiceClient } from '../../../../grpc-generated/unitodo_grpc_pb'; // Corrected path
import {
    DeleteProfileRequest as GrpcDeleteProfileRequest,
    DeleteProfileResponse as GrpcDeleteProfileResponse
} from '../../../../grpc-generated/unitodo_pb'; // Corrected path

// Helper: Convert gRPC status to HTTP status
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

interface DeleteContext {
    params: {
        profileName: string;
    }
}

// Handler for DELETE requests to delete a profile
export async function DELETE(request: NextRequest, context: DeleteContext) {
    if (process.env.NEXT_PHASE === 'phase-production-build') {
        return NextResponse.json({ status: 'skipped_build', message: 'Skipped during build' }, { status: 200 });
    }

    const profileName = context.params.profileName;
    if (!profileName || profileName.trim() === '') {
        return NextResponse.json({ error: 'Profile name parameter is required' }, { status: 400 });
    }
    if (profileName === 'default') {
        return NextResponse.json({ error: 'Cannot delete the default profile' }, { status: 400 });
    }

    const grpcPort = request.headers.get('X-GRPC-Port');
    if (!grpcPort) {
        return NextResponse.json({ error: 'X-GRPC-Port header is required' }, { status: 400 });
    }
    const GRPC_BACKEND_ADDRESS = `localhost:${grpcPort}`;
    const client = new ConfigServiceClient(GRPC_BACKEND_ADDRESS, grpc.credentials.createInsecure());

    const deleteProfileGrpcRequest = new GrpcDeleteProfileRequest();
    deleteProfileGrpcRequest.setProfileName(profileName);

    return new Promise<NextResponse>((resolve) => {
        client.deleteProfile(deleteProfileGrpcRequest, (error: grpc.ServiceError | null, response: GrpcDeleteProfileResponse | null) => {
            if (error) {
                resolve(NextResponse.json(
                    { error: `Failed to delete profile '${profileName}' (gRPC)`, details: error.message }, 
                    { status: grpcStatusToHttpStatus(error.code) }
                ));
            } else if (response) {
                resolve(NextResponse.json({ status: response.getStatus(), message: response.getMessage() }));
            } else {
                resolve(NextResponse.json(
                    { error: `Failed to delete profile '${profileName}': Empty response`, details: 'No status returned' }, 
                    { status: 500 }
                ));
            }
            client.close();
        });
    });
} 