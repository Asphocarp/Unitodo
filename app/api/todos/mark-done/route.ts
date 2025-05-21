import { NextRequest, NextResponse } from 'next/server';
import * as grpc from '@grpc/grpc-js';
import { TodoServiceClient } from '../../../grpc-generated/unitodo_grpc_pb';
import { MarkDoneRequest, MarkDoneResponse } from '../../../grpc-generated/unitodo_pb';
import { grpcStatusToHttpStatus } from '../../utils';

interface MarkDoneApiRequestBody {
  location: string;
  original_content: string;
}

export async function POST(request: NextRequest) {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('[API Route POST /api/todos/mark-done] Build phase, skipping gRPC call.');
    return NextResponse.json({ status: 'skipped_build', message: 'Skipped during build', new_content: ''}, { status: 200 });
  }

  const grpcPort = request.headers.get('X-GRPC-Port');
  if (!grpcPort) {
    console.error('[API Route POST /api/todos/mark-done] X-GRPC-Port header missing');
    return NextResponse.json(
        { error: 'X-GRPC-Port header is required' }, 
        { status: 400 }
    );
  }
  const GRPC_BACKEND_ADDRESS = `localhost:${grpcPort}`;
  console.log(`[API Route POST /api/todos/mark-done] Connecting to gRPC server at: ${GRPC_BACKEND_ADDRESS}`);

  const client = new TodoServiceClient(GRPC_BACKEND_ADDRESS, grpc.credentials.createInsecure());
  try {
    const payload: MarkDoneApiRequestBody = await request.json();

    const grpcRequest = new MarkDoneRequest();
    grpcRequest.setLocation(payload.location);
    grpcRequest.setOriginalContent(payload.original_content);

    return new Promise<NextResponse>((resolve) => {
      client.markDone(grpcRequest, (error: grpc.ServiceError | null, response: MarkDoneResponse | null) => {
        if (error) {
          console.error('gRPC Error marking todo as done:', error);
          resolve(NextResponse.json(
            { error: 'Failed to mark todo as done via backend (gRPC)', details: error.message },
            { status: grpcStatusToHttpStatus(error.code) }
          ));
        } else if (response) {
          console.log("Mark done request successful via gRPC.");
          resolve(NextResponse.json({
            status: response.getStatus(),
            message: response.getMessage(),
            new_content: response.getNewContent(),
          }));
        } else {
          resolve(NextResponse.json(
            { error: 'Failed to mark todo as done: Empty response from backend', details: 'No status returned' },
            { status: 500 }
          ));
        }
        client.close();
      });
    });
  } catch (error: any) {
    console.error('Error processing POST /mark-done request:', error);
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected valid JSON for mark-done.', details: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error processing mark-done request', details: error.message },
      { status: 500 }
    );
  }
}