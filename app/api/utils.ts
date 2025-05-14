import * as grpc from '@grpc/grpc-js';

// Helper: Convert gRPC status to HTTP status
export function grpcStatusToHttpStatus(grpcStatus: grpc.status | undefined): number {
    switch (grpcStatus) {
        case grpc.status.OK: return 200;
        case grpc.status.CANCELLED: return 499; // Client Closed Request
        case grpc.status.UNKNOWN: return 500; // Internal Server Error
        case grpc.status.INVALID_ARGUMENT: return 400; // Bad Request
        case grpc.status.DEADLINE_EXCEEDED: return 504; // Gateway Timeout
        case grpc.status.NOT_FOUND: return 404; // Not Found
        case grpc.status.ALREADY_EXISTS: return 409; // Conflict
        case grpc.status.PERMISSION_DENIED: return 403; // Forbidden
        case grpc.status.RESOURCE_EXHAUSTED: return 429; // Too Many Requests
        case grpc.status.FAILED_PRECONDITION: return 400; // Bad Request (often used for this)
        case grpc.status.ABORTED: return 409; // Conflict
        case grpc.status.OUT_OF_RANGE: return 400; // Bad Request
        case grpc.status.UNIMPLEMENTED: return 501; // Not Implemented
        case grpc.status.INTERNAL: return 500; // Internal Server Error
        case grpc.status.UNAVAILABLE: return 503; // Service Unavailable
        case grpc.status.DATA_LOSS: return 500; // Internal Server Error
        case grpc.status.UNAUTHENTICATED: return 401; // Unauthorized
        default: return 500; // Default to Internal Server Error
    }
} 