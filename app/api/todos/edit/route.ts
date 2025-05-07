import { NextResponse } from 'next/server';
import * as grpc from '@grpc/grpc-js';
import { TodoServiceClient } from '../../../grpc-generated/unitodo_grpc_pb'; // Adjusted path for nesting
import { EditTodoRequest, EditTodoResponse } from '../../../grpc-generated/unitodo_pb'; // Adjusted path

const GRPC_BACKEND_ADDRESS = 'localhost:50051';

interface EditTodoApiRequestBody {
  location: string;
  new_content: string;
  original_content: string; // Added based on gRPC definition and frontend logic
  completed: boolean;
}

export async function POST(request: Request) {
  const client = new TodoServiceClient(GRPC_BACKEND_ADDRESS, grpc.credentials.createInsecure());
  try {
    const payload: EditTodoApiRequestBody = await request.json();

    const grpcRequest = new EditTodoRequest();
    grpcRequest.setLocation(payload.location);
    grpcRequest.setNewContent(payload.new_content);
    grpcRequest.setOriginalContent(payload.original_content);
    grpcRequest.setCompleted(payload.completed);

    return new Promise<NextResponse>((resolve) => {
      client.editTodo(grpcRequest, (error: grpc.ServiceError | null, response: EditTodoResponse | null) => {
        if (error) {
          console.error('gRPC Error editing todo:', error);
          resolve(NextResponse.json(
            { error: 'Failed to edit todo via backend (gRPC)', details: error.message },
            { status: grpcStatusToHttpStatus(error.code) }
          ));
        } else if (response) {
          console.log("Edit todo request successful via gRPC.");
          resolve(NextResponse.json({ status: response.getStatus(), message: response.getMessage() }));
        } else {
          resolve(NextResponse.json(
            { error: 'Failed to edit todo: Empty response from backend', details: 'No status returned' },
            { status: 500 }
          ));
        }
        client.close();
      });
    });
  } catch (error: any) {
    console.error('Error processing POST /edit-todo request:', error);
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected valid JSON for edit.', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error processing edit todo request', details: error.message },
      { status: 500 }
    );
  }
}

// Ensure grpcStatusToHttpStatus is available (e.g. from a shared utils file or define here)
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
        case grpc.status.ABORTED: return 409; // Important for edit conflicts
        case grpc.status.OUT_OF_RANGE: return 400;
        case grpc.status.UNIMPLEMENTED: return 501;
        case grpc.status.INTERNAL: return 500;
        case grpc.status.UNAVAILABLE: return 503;
        case grpc.status.DATA_LOSS: return 500;
        case grpc.status.UNAUTHENTICATED: return 401;
        default: return 500;
    }
} 