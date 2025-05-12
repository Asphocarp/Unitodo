// package: unitodo
// file: unitodo.proto

/* tslint:disable */
/* eslint-disable */

import * as grpc from "@grpc/grpc-js";
import * as unitodo_pb from "./unitodo_pb";

interface ITodoServiceService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    getTodos: ITodoServiceService_IGetTodos;
    editTodo: ITodoServiceService_IEditTodo;
    addTodo: ITodoServiceService_IAddTodo;
    markDone: ITodoServiceService_IMarkDone;
}

interface ITodoServiceService_IGetTodos extends grpc.MethodDefinition<unitodo_pb.GetTodosRequest, unitodo_pb.GetTodosResponse> {
    path: "/unitodo.TodoService/GetTodos";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<unitodo_pb.GetTodosRequest>;
    requestDeserialize: grpc.deserialize<unitodo_pb.GetTodosRequest>;
    responseSerialize: grpc.serialize<unitodo_pb.GetTodosResponse>;
    responseDeserialize: grpc.deserialize<unitodo_pb.GetTodosResponse>;
}
interface ITodoServiceService_IEditTodo extends grpc.MethodDefinition<unitodo_pb.EditTodoRequest, unitodo_pb.EditTodoResponse> {
    path: "/unitodo.TodoService/EditTodo";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<unitodo_pb.EditTodoRequest>;
    requestDeserialize: grpc.deserialize<unitodo_pb.EditTodoRequest>;
    responseSerialize: grpc.serialize<unitodo_pb.EditTodoResponse>;
    responseDeserialize: grpc.deserialize<unitodo_pb.EditTodoResponse>;
}
interface ITodoServiceService_IAddTodo extends grpc.MethodDefinition<unitodo_pb.AddTodoRequest, unitodo_pb.AddTodoResponse> {
    path: "/unitodo.TodoService/AddTodo";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<unitodo_pb.AddTodoRequest>;
    requestDeserialize: grpc.deserialize<unitodo_pb.AddTodoRequest>;
    responseSerialize: grpc.serialize<unitodo_pb.AddTodoResponse>;
    responseDeserialize: grpc.deserialize<unitodo_pb.AddTodoResponse>;
}
interface ITodoServiceService_IMarkDone extends grpc.MethodDefinition<unitodo_pb.MarkDoneRequest, unitodo_pb.MarkDoneResponse> {
    path: "/unitodo.TodoService/MarkDone";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<unitodo_pb.MarkDoneRequest>;
    requestDeserialize: grpc.deserialize<unitodo_pb.MarkDoneRequest>;
    responseSerialize: grpc.serialize<unitodo_pb.MarkDoneResponse>;
    responseDeserialize: grpc.deserialize<unitodo_pb.MarkDoneResponse>;
}

export const TodoServiceService: ITodoServiceService;

export interface ITodoServiceServer extends grpc.UntypedServiceImplementation {
    getTodos: grpc.handleUnaryCall<unitodo_pb.GetTodosRequest, unitodo_pb.GetTodosResponse>;
    editTodo: grpc.handleUnaryCall<unitodo_pb.EditTodoRequest, unitodo_pb.EditTodoResponse>;
    addTodo: grpc.handleUnaryCall<unitodo_pb.AddTodoRequest, unitodo_pb.AddTodoResponse>;
    markDone: grpc.handleUnaryCall<unitodo_pb.MarkDoneRequest, unitodo_pb.MarkDoneResponse>;
}

export interface ITodoServiceClient {
    getTodos(request: unitodo_pb.GetTodosRequest, callback: (error: grpc.ServiceError | null, response: unitodo_pb.GetTodosResponse) => void): grpc.ClientUnaryCall;
    getTodos(request: unitodo_pb.GetTodosRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: unitodo_pb.GetTodosResponse) => void): grpc.ClientUnaryCall;
    getTodos(request: unitodo_pb.GetTodosRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: unitodo_pb.GetTodosResponse) => void): grpc.ClientUnaryCall;
    editTodo(request: unitodo_pb.EditTodoRequest, callback: (error: grpc.ServiceError | null, response: unitodo_pb.EditTodoResponse) => void): grpc.ClientUnaryCall;
    editTodo(request: unitodo_pb.EditTodoRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: unitodo_pb.EditTodoResponse) => void): grpc.ClientUnaryCall;
    editTodo(request: unitodo_pb.EditTodoRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: unitodo_pb.EditTodoResponse) => void): grpc.ClientUnaryCall;
    addTodo(request: unitodo_pb.AddTodoRequest, callback: (error: grpc.ServiceError | null, response: unitodo_pb.AddTodoResponse) => void): grpc.ClientUnaryCall;
    addTodo(request: unitodo_pb.AddTodoRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: unitodo_pb.AddTodoResponse) => void): grpc.ClientUnaryCall;
    addTodo(request: unitodo_pb.AddTodoRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: unitodo_pb.AddTodoResponse) => void): grpc.ClientUnaryCall;
    markDone(request: unitodo_pb.MarkDoneRequest, callback: (error: grpc.ServiceError | null, response: unitodo_pb.MarkDoneResponse) => void): grpc.ClientUnaryCall;
    markDone(request: unitodo_pb.MarkDoneRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: unitodo_pb.MarkDoneResponse) => void): grpc.ClientUnaryCall;
    markDone(request: unitodo_pb.MarkDoneRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: unitodo_pb.MarkDoneResponse) => void): grpc.ClientUnaryCall;
}

export class TodoServiceClient extends grpc.Client implements ITodoServiceClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: Partial<grpc.ClientOptions>);
    public getTodos(request: unitodo_pb.GetTodosRequest, callback: (error: grpc.ServiceError | null, response: unitodo_pb.GetTodosResponse) => void): grpc.ClientUnaryCall;
    public getTodos(request: unitodo_pb.GetTodosRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: unitodo_pb.GetTodosResponse) => void): grpc.ClientUnaryCall;
    public getTodos(request: unitodo_pb.GetTodosRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: unitodo_pb.GetTodosResponse) => void): grpc.ClientUnaryCall;
    public editTodo(request: unitodo_pb.EditTodoRequest, callback: (error: grpc.ServiceError | null, response: unitodo_pb.EditTodoResponse) => void): grpc.ClientUnaryCall;
    public editTodo(request: unitodo_pb.EditTodoRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: unitodo_pb.EditTodoResponse) => void): grpc.ClientUnaryCall;
    public editTodo(request: unitodo_pb.EditTodoRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: unitodo_pb.EditTodoResponse) => void): grpc.ClientUnaryCall;
    public addTodo(request: unitodo_pb.AddTodoRequest, callback: (error: grpc.ServiceError | null, response: unitodo_pb.AddTodoResponse) => void): grpc.ClientUnaryCall;
    public addTodo(request: unitodo_pb.AddTodoRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: unitodo_pb.AddTodoResponse) => void): grpc.ClientUnaryCall;
    public addTodo(request: unitodo_pb.AddTodoRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: unitodo_pb.AddTodoResponse) => void): grpc.ClientUnaryCall;
    public markDone(request: unitodo_pb.MarkDoneRequest, callback: (error: grpc.ServiceError | null, response: unitodo_pb.MarkDoneResponse) => void): grpc.ClientUnaryCall;
    public markDone(request: unitodo_pb.MarkDoneRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: unitodo_pb.MarkDoneResponse) => void): grpc.ClientUnaryCall;
    public markDone(request: unitodo_pb.MarkDoneRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: unitodo_pb.MarkDoneResponse) => void): grpc.ClientUnaryCall;
}

interface IConfigServiceService extends grpc.ServiceDefinition<grpc.UntypedServiceImplementation> {
    getConfig: IConfigServiceService_IGetConfig;
    updateConfig: IConfigServiceService_IUpdateConfig;
    getActiveProfile: IConfigServiceService_IGetActiveProfile;
    setActiveProfile: IConfigServiceService_ISetActiveProfile;
    listProfiles: IConfigServiceService_IListProfiles;
    addProfile: IConfigServiceService_IAddProfile;
    deleteProfile: IConfigServiceService_IDeleteProfile;
}

interface IConfigServiceService_IGetConfig extends grpc.MethodDefinition<unitodo_pb.GetConfigRequest, unitodo_pb.GetConfigResponse> {
    path: "/unitodo.ConfigService/GetConfig";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<unitodo_pb.GetConfigRequest>;
    requestDeserialize: grpc.deserialize<unitodo_pb.GetConfigRequest>;
    responseSerialize: grpc.serialize<unitodo_pb.GetConfigResponse>;
    responseDeserialize: grpc.deserialize<unitodo_pb.GetConfigResponse>;
}
interface IConfigServiceService_IUpdateConfig extends grpc.MethodDefinition<unitodo_pb.UpdateConfigRequest, unitodo_pb.UpdateConfigResponse> {
    path: "/unitodo.ConfigService/UpdateConfig";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<unitodo_pb.UpdateConfigRequest>;
    requestDeserialize: grpc.deserialize<unitodo_pb.UpdateConfigRequest>;
    responseSerialize: grpc.serialize<unitodo_pb.UpdateConfigResponse>;
    responseDeserialize: grpc.deserialize<unitodo_pb.UpdateConfigResponse>;
}
interface IConfigServiceService_IGetActiveProfile extends grpc.MethodDefinition<unitodo_pb.GetActiveProfileRequest, unitodo_pb.GetActiveProfileResponse> {
    path: "/unitodo.ConfigService/GetActiveProfile";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<unitodo_pb.GetActiveProfileRequest>;
    requestDeserialize: grpc.deserialize<unitodo_pb.GetActiveProfileRequest>;
    responseSerialize: grpc.serialize<unitodo_pb.GetActiveProfileResponse>;
    responseDeserialize: grpc.deserialize<unitodo_pb.GetActiveProfileResponse>;
}
interface IConfigServiceService_ISetActiveProfile extends grpc.MethodDefinition<unitodo_pb.SetActiveProfileRequest, unitodo_pb.SetActiveProfileResponse> {
    path: "/unitodo.ConfigService/SetActiveProfile";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<unitodo_pb.SetActiveProfileRequest>;
    requestDeserialize: grpc.deserialize<unitodo_pb.SetActiveProfileRequest>;
    responseSerialize: grpc.serialize<unitodo_pb.SetActiveProfileResponse>;
    responseDeserialize: grpc.deserialize<unitodo_pb.SetActiveProfileResponse>;
}
interface IConfigServiceService_IListProfiles extends grpc.MethodDefinition<unitodo_pb.ListProfilesRequest, unitodo_pb.ListProfilesResponse> {
    path: "/unitodo.ConfigService/ListProfiles";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<unitodo_pb.ListProfilesRequest>;
    requestDeserialize: grpc.deserialize<unitodo_pb.ListProfilesRequest>;
    responseSerialize: grpc.serialize<unitodo_pb.ListProfilesResponse>;
    responseDeserialize: grpc.deserialize<unitodo_pb.ListProfilesResponse>;
}
interface IConfigServiceService_IAddProfile extends grpc.MethodDefinition<unitodo_pb.AddProfileRequest, unitodo_pb.AddProfileResponse> {
    path: "/unitodo.ConfigService/AddProfile";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<unitodo_pb.AddProfileRequest>;
    requestDeserialize: grpc.deserialize<unitodo_pb.AddProfileRequest>;
    responseSerialize: grpc.serialize<unitodo_pb.AddProfileResponse>;
    responseDeserialize: grpc.deserialize<unitodo_pb.AddProfileResponse>;
}
interface IConfigServiceService_IDeleteProfile extends grpc.MethodDefinition<unitodo_pb.DeleteProfileRequest, unitodo_pb.DeleteProfileResponse> {
    path: "/unitodo.ConfigService/DeleteProfile";
    requestStream: false;
    responseStream: false;
    requestSerialize: grpc.serialize<unitodo_pb.DeleteProfileRequest>;
    requestDeserialize: grpc.deserialize<unitodo_pb.DeleteProfileRequest>;
    responseSerialize: grpc.serialize<unitodo_pb.DeleteProfileResponse>;
    responseDeserialize: grpc.deserialize<unitodo_pb.DeleteProfileResponse>;
}

export const ConfigServiceService: IConfigServiceService;

export interface IConfigServiceServer extends grpc.UntypedServiceImplementation {
    getConfig: grpc.handleUnaryCall<unitodo_pb.GetConfigRequest, unitodo_pb.GetConfigResponse>;
    updateConfig: grpc.handleUnaryCall<unitodo_pb.UpdateConfigRequest, unitodo_pb.UpdateConfigResponse>;
    getActiveProfile: grpc.handleUnaryCall<unitodo_pb.GetActiveProfileRequest, unitodo_pb.GetActiveProfileResponse>;
    setActiveProfile: grpc.handleUnaryCall<unitodo_pb.SetActiveProfileRequest, unitodo_pb.SetActiveProfileResponse>;
    listProfiles: grpc.handleUnaryCall<unitodo_pb.ListProfilesRequest, unitodo_pb.ListProfilesResponse>;
    addProfile: grpc.handleUnaryCall<unitodo_pb.AddProfileRequest, unitodo_pb.AddProfileResponse>;
    deleteProfile: grpc.handleUnaryCall<unitodo_pb.DeleteProfileRequest, unitodo_pb.DeleteProfileResponse>;
}

export interface IConfigServiceClient {
    getConfig(request: unitodo_pb.GetConfigRequest, callback: (error: grpc.ServiceError | null, response: unitodo_pb.GetConfigResponse) => void): grpc.ClientUnaryCall;
    getConfig(request: unitodo_pb.GetConfigRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: unitodo_pb.GetConfigResponse) => void): grpc.ClientUnaryCall;
    getConfig(request: unitodo_pb.GetConfigRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: unitodo_pb.GetConfigResponse) => void): grpc.ClientUnaryCall;
    updateConfig(request: unitodo_pb.UpdateConfigRequest, callback: (error: grpc.ServiceError | null, response: unitodo_pb.UpdateConfigResponse) => void): grpc.ClientUnaryCall;
    updateConfig(request: unitodo_pb.UpdateConfigRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: unitodo_pb.UpdateConfigResponse) => void): grpc.ClientUnaryCall;
    updateConfig(request: unitodo_pb.UpdateConfigRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: unitodo_pb.UpdateConfigResponse) => void): grpc.ClientUnaryCall;
    getActiveProfile(request: unitodo_pb.GetActiveProfileRequest, callback: (error: grpc.ServiceError | null, response: unitodo_pb.GetActiveProfileResponse) => void): grpc.ClientUnaryCall;
    getActiveProfile(request: unitodo_pb.GetActiveProfileRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: unitodo_pb.GetActiveProfileResponse) => void): grpc.ClientUnaryCall;
    getActiveProfile(request: unitodo_pb.GetActiveProfileRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: unitodo_pb.GetActiveProfileResponse) => void): grpc.ClientUnaryCall;
    setActiveProfile(request: unitodo_pb.SetActiveProfileRequest, callback: (error: grpc.ServiceError | null, response: unitodo_pb.SetActiveProfileResponse) => void): grpc.ClientUnaryCall;
    setActiveProfile(request: unitodo_pb.SetActiveProfileRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: unitodo_pb.SetActiveProfileResponse) => void): grpc.ClientUnaryCall;
    setActiveProfile(request: unitodo_pb.SetActiveProfileRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: unitodo_pb.SetActiveProfileResponse) => void): grpc.ClientUnaryCall;
    listProfiles(request: unitodo_pb.ListProfilesRequest, callback: (error: grpc.ServiceError | null, response: unitodo_pb.ListProfilesResponse) => void): grpc.ClientUnaryCall;
    listProfiles(request: unitodo_pb.ListProfilesRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: unitodo_pb.ListProfilesResponse) => void): grpc.ClientUnaryCall;
    listProfiles(request: unitodo_pb.ListProfilesRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: unitodo_pb.ListProfilesResponse) => void): grpc.ClientUnaryCall;
    addProfile(request: unitodo_pb.AddProfileRequest, callback: (error: grpc.ServiceError | null, response: unitodo_pb.AddProfileResponse) => void): grpc.ClientUnaryCall;
    addProfile(request: unitodo_pb.AddProfileRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: unitodo_pb.AddProfileResponse) => void): grpc.ClientUnaryCall;
    addProfile(request: unitodo_pb.AddProfileRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: unitodo_pb.AddProfileResponse) => void): grpc.ClientUnaryCall;
    deleteProfile(request: unitodo_pb.DeleteProfileRequest, callback: (error: grpc.ServiceError | null, response: unitodo_pb.DeleteProfileResponse) => void): grpc.ClientUnaryCall;
    deleteProfile(request: unitodo_pb.DeleteProfileRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: unitodo_pb.DeleteProfileResponse) => void): grpc.ClientUnaryCall;
    deleteProfile(request: unitodo_pb.DeleteProfileRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: unitodo_pb.DeleteProfileResponse) => void): grpc.ClientUnaryCall;
}

export class ConfigServiceClient extends grpc.Client implements IConfigServiceClient {
    constructor(address: string, credentials: grpc.ChannelCredentials, options?: Partial<grpc.ClientOptions>);
    public getConfig(request: unitodo_pb.GetConfigRequest, callback: (error: grpc.ServiceError | null, response: unitodo_pb.GetConfigResponse) => void): grpc.ClientUnaryCall;
    public getConfig(request: unitodo_pb.GetConfigRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: unitodo_pb.GetConfigResponse) => void): grpc.ClientUnaryCall;
    public getConfig(request: unitodo_pb.GetConfigRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: unitodo_pb.GetConfigResponse) => void): grpc.ClientUnaryCall;
    public updateConfig(request: unitodo_pb.UpdateConfigRequest, callback: (error: grpc.ServiceError | null, response: unitodo_pb.UpdateConfigResponse) => void): grpc.ClientUnaryCall;
    public updateConfig(request: unitodo_pb.UpdateConfigRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: unitodo_pb.UpdateConfigResponse) => void): grpc.ClientUnaryCall;
    public updateConfig(request: unitodo_pb.UpdateConfigRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: unitodo_pb.UpdateConfigResponse) => void): grpc.ClientUnaryCall;
    public getActiveProfile(request: unitodo_pb.GetActiveProfileRequest, callback: (error: grpc.ServiceError | null, response: unitodo_pb.GetActiveProfileResponse) => void): grpc.ClientUnaryCall;
    public getActiveProfile(request: unitodo_pb.GetActiveProfileRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: unitodo_pb.GetActiveProfileResponse) => void): grpc.ClientUnaryCall;
    public getActiveProfile(request: unitodo_pb.GetActiveProfileRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: unitodo_pb.GetActiveProfileResponse) => void): grpc.ClientUnaryCall;
    public setActiveProfile(request: unitodo_pb.SetActiveProfileRequest, callback: (error: grpc.ServiceError | null, response: unitodo_pb.SetActiveProfileResponse) => void): grpc.ClientUnaryCall;
    public setActiveProfile(request: unitodo_pb.SetActiveProfileRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: unitodo_pb.SetActiveProfileResponse) => void): grpc.ClientUnaryCall;
    public setActiveProfile(request: unitodo_pb.SetActiveProfileRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: unitodo_pb.SetActiveProfileResponse) => void): grpc.ClientUnaryCall;
    public listProfiles(request: unitodo_pb.ListProfilesRequest, callback: (error: grpc.ServiceError | null, response: unitodo_pb.ListProfilesResponse) => void): grpc.ClientUnaryCall;
    public listProfiles(request: unitodo_pb.ListProfilesRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: unitodo_pb.ListProfilesResponse) => void): grpc.ClientUnaryCall;
    public listProfiles(request: unitodo_pb.ListProfilesRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: unitodo_pb.ListProfilesResponse) => void): grpc.ClientUnaryCall;
    public addProfile(request: unitodo_pb.AddProfileRequest, callback: (error: grpc.ServiceError | null, response: unitodo_pb.AddProfileResponse) => void): grpc.ClientUnaryCall;
    public addProfile(request: unitodo_pb.AddProfileRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: unitodo_pb.AddProfileResponse) => void): grpc.ClientUnaryCall;
    public addProfile(request: unitodo_pb.AddProfileRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: unitodo_pb.AddProfileResponse) => void): grpc.ClientUnaryCall;
    public deleteProfile(request: unitodo_pb.DeleteProfileRequest, callback: (error: grpc.ServiceError | null, response: unitodo_pb.DeleteProfileResponse) => void): grpc.ClientUnaryCall;
    public deleteProfile(request: unitodo_pb.DeleteProfileRequest, metadata: grpc.Metadata, callback: (error: grpc.ServiceError | null, response: unitodo_pb.DeleteProfileResponse) => void): grpc.ClientUnaryCall;
    public deleteProfile(request: unitodo_pb.DeleteProfileRequest, metadata: grpc.Metadata, options: Partial<grpc.CallOptions>, callback: (error: grpc.ServiceError | null, response: unitodo_pb.DeleteProfileResponse) => void): grpc.ClientUnaryCall;
}
