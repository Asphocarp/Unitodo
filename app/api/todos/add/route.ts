import { NextRequest, NextResponse } from 'next/server';
import * as grpc from '@grpc/grpc-js';
import { TodoServiceClient } from '../../../grpc-generated/unitodo_grpc_pb';
import { AddTodoRequest, AddTodoResponse } from '../../../grpc-generated/unitodo_pb';

interface AddTodoApiRequestBody {
  category_type: string;
  category_name: string;
  content: string;
  example_item_location?: string;
}

export async function POST(request: NextRequest) {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('[API Route POST /api/todos/add] Build phase, skipping gRPC call.');
    return NextResponse.json({ status: 'skipped_build', message: 'Skipped during build' }, { status: 200 });
  }

  const grpcPort = request.headers.get('X-GRPC-Port');
  if (!grpcPort) {
    console.error('[API Route POST /api/todos/add] X-GRPC-Port header missing');
    return NextResponse.json(
        { error: 'X-GRPC-Port header is required' }, 
        { status: 400 }
    );
  }
  const GRPC_BACKEND_ADDRESS = `localhost:${grpcPort}`;
  console.log(`[API Route POST /api/todos/add] Connecting to gRPC server at: ${GRPC_BACKEND_ADDRESS}`);

  const client = new TodoServiceClient(GRPC_BACKEND_ADDRESS, grpc.credentials.createInsecure());
  try {
    const payload: AddTodoApiRequestBody = await request.json();

    const grpcRequest = new AddTodoRequest();
    grpcRequest.setCategoryType(payload.category_type);
    grpcRequest.setCategoryName(payload.category_name);
    grpcRequest.setContent(payload.content);
    if (payload.example_item_location) {
      grpcRequest.setExampleItemLocation(payload.example_item_location);
    }

    return new Promise<NextResponse>((resolve) => {
      client.addTodo(grpcRequest, (error: grpc.ServiceError | null, response: AddTodoResponse | null) => {
        if (error) {
          console.error('gRPC Error adding todo:', error);
          resolve(NextResponse.json(
            { error: 'Failed to add todo via backend (gRPC)', details: error.message },
            { status: grpcStatusToHttpStatus(error.code) }
          ));
        } else if (response) {
          console.log("Add todo request successful via gRPC.");
          resolve(NextResponse.json({ status: response.getStatus(), message: response.getMessage() }));
        } else {
          resolve(NextResponse.json(
            { error: 'Failed to add todo: Empty response from backend', details: 'No status returned' },
            { status: 500 }
          ));
        }
        client.close();
      });
    });
  } catch (error: any) {
    console.error('Error processing POST /add-todo request:', error);
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected valid JSON for add.', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error processing add todo request', details: error.message },
      { status: 500 }
    );
  }
}

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