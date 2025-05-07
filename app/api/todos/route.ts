import { NextResponse } from 'next/server';
import * as grpc from '@grpc/grpc-js';
import { TodoServiceClient } from '../../grpc-generated/unitodo_grpc_pb';
import { GetTodosRequest, GetTodosResponse, TodoCategory as PbTodoCategory, TodoItem as PbTodoItem } from '../../grpc-generated/unitodo_pb'; // Imported PbTodoCategory and PbTodoItem
import { TodoCategory as AppTodoCategory, TodoItem as AppTodoItem } from '@/app/types';

const GRPC_BACKEND_ADDRESS = 'localhost:50051';

// Removed redundant helper functions as direct mapping will be used with proper types

export async function GET() {
  const client = new TodoServiceClient(
    GRPC_BACKEND_ADDRESS,
    grpc.credentials.createInsecure()
  );

  const request = new GetTodosRequest();

  return new Promise<NextResponse>((resolve) => {
    client.getTodos(request, (error: grpc.ServiceError | null, response: GetTodosResponse | null) => {
      if (error) {
        console.error('gRPC Error fetching todos:', error);
        resolve(NextResponse.json(
          { error: 'Failed to fetch todo data from backend service (gRPC)', details: error.message },
          { status: grpcStatusToHttpStatus(error.code) }
        ));
      } else if (response) {
        const appCategories: AppTodoCategory[] = response.getCategoriesList().map((grpcCat: PbTodoCategory) => ({
            name: grpcCat.getName(),
            icon: grpcCat.getIcon(),
            todos: grpcCat.getTodosList().map((grpcItem: PbTodoItem) => ({
                content: grpcItem.getContent(),
                location: grpcItem.getLocation(),
                completed: grpcItem.getCompleted(),
            })),
        }));

        console.log("Data fetched successfully from Rust gRPC backend.");
        resolve(NextResponse.json({ categories: appCategories }));
      } else {
        console.error('gRPC Error: No error and no response received for getTodos');
        resolve(NextResponse.json(
          { error: 'Failed to fetch todo data: Empty response from backend', details: 'No data returned' },
          { status: 500 }
        ));
      }
      client.close();
    });
  });
}

function grpcStatusToHttpStatus(grpcStatus: grpc.status | undefined): number {
    switch (grpcStatus) {
        case grpc.status.OK:
            return 200;
        case grpc.status.CANCELLED:
            return 499;
        case grpc.status.UNKNOWN:
            return 500;
        case grpc.status.INVALID_ARGUMENT:
            return 400;
        case grpc.status.DEADLINE_EXCEEDED:
            return 504;
        case grpc.status.NOT_FOUND:
            return 404;
        case grpc.status.ALREADY_EXISTS:
            return 409;
        case grpc.status.PERMISSION_DENIED:
            return 403;
        case grpc.status.RESOURCE_EXHAUSTED:
            return 429;
        case grpc.status.FAILED_PRECONDITION:
            return 400;
        case grpc.status.ABORTED:
            return 409;
        case grpc.status.OUT_OF_RANGE:
            return 400;
        case grpc.status.UNIMPLEMENTED:
            return 501;
        case grpc.status.INTERNAL:
            return 500;
        case grpc.status.UNAVAILABLE:
            return 503;
        case grpc.status.DATA_LOSS:
            return 500;
        case grpc.status.UNAUTHENTICATED:
            return 401;
        default:
            return 500;
    }
} 