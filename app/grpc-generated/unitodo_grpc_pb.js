// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var unitodo_pb = require('./unitodo_pb.js');

function serialize_unitodo_AddTodoRequest(arg) {
  if (!(arg instanceof unitodo_pb.AddTodoRequest)) {
    throw new Error('Expected argument of type unitodo.AddTodoRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_unitodo_AddTodoRequest(buffer_arg) {
  return unitodo_pb.AddTodoRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_unitodo_AddTodoResponse(arg) {
  if (!(arg instanceof unitodo_pb.AddTodoResponse)) {
    throw new Error('Expected argument of type unitodo.AddTodoResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_unitodo_AddTodoResponse(buffer_arg) {
  return unitodo_pb.AddTodoResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_unitodo_EditTodoRequest(arg) {
  if (!(arg instanceof unitodo_pb.EditTodoRequest)) {
    throw new Error('Expected argument of type unitodo.EditTodoRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_unitodo_EditTodoRequest(buffer_arg) {
  return unitodo_pb.EditTodoRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_unitodo_EditTodoResponse(arg) {
  if (!(arg instanceof unitodo_pb.EditTodoResponse)) {
    throw new Error('Expected argument of type unitodo.EditTodoResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_unitodo_EditTodoResponse(buffer_arg) {
  return unitodo_pb.EditTodoResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_unitodo_GetConfigRequest(arg) {
  if (!(arg instanceof unitodo_pb.GetConfigRequest)) {
    throw new Error('Expected argument of type unitodo.GetConfigRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_unitodo_GetConfigRequest(buffer_arg) {
  return unitodo_pb.GetConfigRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_unitodo_GetConfigResponse(arg) {
  if (!(arg instanceof unitodo_pb.GetConfigResponse)) {
    throw new Error('Expected argument of type unitodo.GetConfigResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_unitodo_GetConfigResponse(buffer_arg) {
  return unitodo_pb.GetConfigResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_unitodo_GetTodosRequest(arg) {
  if (!(arg instanceof unitodo_pb.GetTodosRequest)) {
    throw new Error('Expected argument of type unitodo.GetTodosRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_unitodo_GetTodosRequest(buffer_arg) {
  return unitodo_pb.GetTodosRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_unitodo_GetTodosResponse(arg) {
  if (!(arg instanceof unitodo_pb.GetTodosResponse)) {
    throw new Error('Expected argument of type unitodo.GetTodosResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_unitodo_GetTodosResponse(buffer_arg) {
  return unitodo_pb.GetTodosResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_unitodo_MarkDoneRequest(arg) {
  if (!(arg instanceof unitodo_pb.MarkDoneRequest)) {
    throw new Error('Expected argument of type unitodo.MarkDoneRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_unitodo_MarkDoneRequest(buffer_arg) {
  return unitodo_pb.MarkDoneRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_unitodo_MarkDoneResponse(arg) {
  if (!(arg instanceof unitodo_pb.MarkDoneResponse)) {
    throw new Error('Expected argument of type unitodo.MarkDoneResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_unitodo_MarkDoneResponse(buffer_arg) {
  return unitodo_pb.MarkDoneResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_unitodo_UpdateConfigRequest(arg) {
  if (!(arg instanceof unitodo_pb.UpdateConfigRequest)) {
    throw new Error('Expected argument of type unitodo.UpdateConfigRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_unitodo_UpdateConfigRequest(buffer_arg) {
  return unitodo_pb.UpdateConfigRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_unitodo_UpdateConfigResponse(arg) {
  if (!(arg instanceof unitodo_pb.UpdateConfigResponse)) {
    throw new Error('Expected argument of type unitodo.UpdateConfigResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_unitodo_UpdateConfigResponse(buffer_arg) {
  return unitodo_pb.UpdateConfigResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


var TodoServiceService = exports.TodoServiceService = {
  getTodos: {
    path: '/unitodo.TodoService/GetTodos',
    requestStream: false,
    responseStream: false,
    requestType: unitodo_pb.GetTodosRequest,
    responseType: unitodo_pb.GetTodosResponse,
    requestSerialize: serialize_unitodo_GetTodosRequest,
    requestDeserialize: deserialize_unitodo_GetTodosRequest,
    responseSerialize: serialize_unitodo_GetTodosResponse,
    responseDeserialize: deserialize_unitodo_GetTodosResponse,
  },
  editTodo: {
    path: '/unitodo.TodoService/EditTodo',
    requestStream: false,
    responseStream: false,
    requestType: unitodo_pb.EditTodoRequest,
    responseType: unitodo_pb.EditTodoResponse,
    requestSerialize: serialize_unitodo_EditTodoRequest,
    requestDeserialize: deserialize_unitodo_EditTodoRequest,
    responseSerialize: serialize_unitodo_EditTodoResponse,
    responseDeserialize: deserialize_unitodo_EditTodoResponse,
  },
  addTodo: {
    path: '/unitodo.TodoService/AddTodo',
    requestStream: false,
    responseStream: false,
    requestType: unitodo_pb.AddTodoRequest,
    responseType: unitodo_pb.AddTodoResponse,
    requestSerialize: serialize_unitodo_AddTodoRequest,
    requestDeserialize: deserialize_unitodo_AddTodoRequest,
    responseSerialize: serialize_unitodo_AddTodoResponse,
    responseDeserialize: deserialize_unitodo_AddTodoResponse,
  },
  markDone: {
    path: '/unitodo.TodoService/MarkDone',
    requestStream: false,
    responseStream: false,
    requestType: unitodo_pb.MarkDoneRequest,
    responseType: unitodo_pb.MarkDoneResponse,
    requestSerialize: serialize_unitodo_MarkDoneRequest,
    requestDeserialize: deserialize_unitodo_MarkDoneRequest,
    responseSerialize: serialize_unitodo_MarkDoneResponse,
    responseDeserialize: deserialize_unitodo_MarkDoneResponse,
  },
};

exports.TodoServiceClient = grpc.makeGenericClientConstructor(TodoServiceService, 'TodoService');
var ConfigServiceService = exports.ConfigServiceService = {
  getConfig: {
    path: '/unitodo.ConfigService/GetConfig',
    requestStream: false,
    responseStream: false,
    requestType: unitodo_pb.GetConfigRequest,
    responseType: unitodo_pb.GetConfigResponse,
    requestSerialize: serialize_unitodo_GetConfigRequest,
    requestDeserialize: deserialize_unitodo_GetConfigRequest,
    responseSerialize: serialize_unitodo_GetConfigResponse,
    responseDeserialize: deserialize_unitodo_GetConfigResponse,
  },
  updateConfig: {
    path: '/unitodo.ConfigService/UpdateConfig',
    requestStream: false,
    responseStream: false,
    requestType: unitodo_pb.UpdateConfigRequest,
    responseType: unitodo_pb.UpdateConfigResponse,
    requestSerialize: serialize_unitodo_UpdateConfigRequest,
    requestDeserialize: deserialize_unitodo_UpdateConfigRequest,
    responseSerialize: serialize_unitodo_UpdateConfigResponse,
    responseDeserialize: deserialize_unitodo_UpdateConfigResponse,
  },
};

exports.ConfigServiceClient = grpc.makeGenericClientConstructor(ConfigServiceService, 'ConfigService');
