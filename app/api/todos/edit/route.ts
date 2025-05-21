import { NextRequest, NextResponse } from 'next/server';
import * as grpc from '@grpc/grpc-js';
import { TodoServiceClient } from '../../../grpc-generated/unitodo_grpc_pb'; // Adjusted path for nesting
import { EditTodoRequest, EditTodoResponse } from '../../../grpc-generated/unitodo_pb'; // Adjusted path
import { grpcStatusToHttpStatus } from '../../utils'; // Added import

interface EditTodoApiRequestBody {
  location: string;
  new_content: string;
  original_content: string; // Added based on gRPC definition and frontend logic
}

export async function POST(request: NextRequest) {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('[API Route POST /api/todos/edit] Build phase, skipping gRPC call.');
    return NextResponse.json({ status: 'skipped_build', message: 'Skipped during build' }, { status: 200 });
  }

  const grpcPort = request.headers.get('X-GRPC-Port');
  if (!grpcPort) {
    console.error('[API Route POST /api/todos/edit] X-GRPC-Port header missing');
    return NextResponse.json(
        { error: 'X-GRPC-Port header is required' }, 
        { status: 400 }
    );
  }
  const GRPC_BACKEND_ADDRESS = `localhost:${grpcPort}`;
  console.log(`[API Route POST /api/todos/edit] Connecting to gRPC server at: ${GRPC_BACKEND_ADDRESS}`);

  const client = new TodoServiceClient(GRPC_BACKEND_ADDRESS, grpc.credentials.createInsecure());
  try {
    const payload: EditTodoApiRequestBody = await request.json();

    const grpcRequest = new EditTodoRequest();
    grpcRequest.setLocation(payload.location);
    grpcRequest.setNewContent(payload.new_content);
    grpcRequest.setOriginalContent(payload.original_content);

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