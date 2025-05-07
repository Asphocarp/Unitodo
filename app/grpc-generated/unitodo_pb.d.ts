// package: unitodo
// file: unitodo.proto

import * as jspb from "google-protobuf";

export class TodoItem extends jspb.Message {
  getContent(): string;
  setContent(value: string): void;

  getLocation(): string;
  setLocation(value: string): void;

  getCompleted(): boolean;
  setCompleted(value: boolean): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): TodoItem.AsObject;
  static toObject(includeInstance: boolean, msg: TodoItem): TodoItem.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: TodoItem, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): TodoItem;
  static deserializeBinaryFromReader(message: TodoItem, reader: jspb.BinaryReader): TodoItem;
}

export namespace TodoItem {
  export type AsObject = {
    content: string,
    location: string,
    completed: boolean,
  }
}

export class TodoCategory extends jspb.Message {
  getName(): string;
  setName(value: string): void;

  getIcon(): string;
  setIcon(value: string): void;

  clearTodosList(): void;
  getTodosList(): Array<TodoItem>;
  setTodosList(value: Array<TodoItem>): void;
  addTodos(value?: TodoItem, index?: number): TodoItem;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): TodoCategory.AsObject;
  static toObject(includeInstance: boolean, msg: TodoCategory): TodoCategory.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: TodoCategory, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): TodoCategory;
  static deserializeBinaryFromReader(message: TodoCategory, reader: jspb.BinaryReader): TodoCategory;
}

export namespace TodoCategory {
  export type AsObject = {
    name: string,
    icon: string,
    todosList: Array<TodoItem.AsObject>,
  }
}

export class GetTodosRequest extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetTodosRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetTodosRequest): GetTodosRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: GetTodosRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetTodosRequest;
  static deserializeBinaryFromReader(message: GetTodosRequest, reader: jspb.BinaryReader): GetTodosRequest;
}

export namespace GetTodosRequest {
  export type AsObject = {
  }
}

export class GetTodosResponse extends jspb.Message {
  clearCategoriesList(): void;
  getCategoriesList(): Array<TodoCategory>;
  setCategoriesList(value: Array<TodoCategory>): void;
  addCategories(value?: TodoCategory, index?: number): TodoCategory;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetTodosResponse.AsObject;
  static toObject(includeInstance: boolean, msg: GetTodosResponse): GetTodosResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: GetTodosResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetTodosResponse;
  static deserializeBinaryFromReader(message: GetTodosResponse, reader: jspb.BinaryReader): GetTodosResponse;
}

export namespace GetTodosResponse {
  export type AsObject = {
    categoriesList: Array<TodoCategory.AsObject>,
  }
}

export class EditTodoRequest extends jspb.Message {
  getLocation(): string;
  setLocation(value: string): void;

  getNewContent(): string;
  setNewContent(value: string): void;

  getOriginalContent(): string;
  setOriginalContent(value: string): void;

  getCompleted(): boolean;
  setCompleted(value: boolean): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): EditTodoRequest.AsObject;
  static toObject(includeInstance: boolean, msg: EditTodoRequest): EditTodoRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: EditTodoRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): EditTodoRequest;
  static deserializeBinaryFromReader(message: EditTodoRequest, reader: jspb.BinaryReader): EditTodoRequest;
}

export namespace EditTodoRequest {
  export type AsObject = {
    location: string,
    newContent: string,
    originalContent: string,
    completed: boolean,
  }
}

export class EditTodoResponse extends jspb.Message {
  getStatus(): string;
  setStatus(value: string): void;

  getMessage(): string;
  setMessage(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): EditTodoResponse.AsObject;
  static toObject(includeInstance: boolean, msg: EditTodoResponse): EditTodoResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: EditTodoResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): EditTodoResponse;
  static deserializeBinaryFromReader(message: EditTodoResponse, reader: jspb.BinaryReader): EditTodoResponse;
}

export namespace EditTodoResponse {
  export type AsObject = {
    status: string,
    message: string,
  }
}

export class AddTodoRequest extends jspb.Message {
  getCategoryType(): string;
  setCategoryType(value: string): void;

  getCategoryName(): string;
  setCategoryName(value: string): void;

  getContent(): string;
  setContent(value: string): void;

  hasExampleItemLocation(): boolean;
  clearExampleItemLocation(): void;
  getExampleItemLocation(): string;
  setExampleItemLocation(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): AddTodoRequest.AsObject;
  static toObject(includeInstance: boolean, msg: AddTodoRequest): AddTodoRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: AddTodoRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): AddTodoRequest;
  static deserializeBinaryFromReader(message: AddTodoRequest, reader: jspb.BinaryReader): AddTodoRequest;
}

export namespace AddTodoRequest {
  export type AsObject = {
    categoryType: string,
    categoryName: string,
    content: string,
    exampleItemLocation: string,
  }
}

export class AddTodoResponse extends jspb.Message {
  getStatus(): string;
  setStatus(value: string): void;

  getMessage(): string;
  setMessage(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): AddTodoResponse.AsObject;
  static toObject(includeInstance: boolean, msg: AddTodoResponse): AddTodoResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: AddTodoResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): AddTodoResponse;
  static deserializeBinaryFromReader(message: AddTodoResponse, reader: jspb.BinaryReader): AddTodoResponse;
}

export namespace AddTodoResponse {
  export type AsObject = {
    status: string,
    message: string,
  }
}

export class MarkDoneRequest extends jspb.Message {
  getLocation(): string;
  setLocation(value: string): void;

  getOriginalContent(): string;
  setOriginalContent(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): MarkDoneRequest.AsObject;
  static toObject(includeInstance: boolean, msg: MarkDoneRequest): MarkDoneRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: MarkDoneRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): MarkDoneRequest;
  static deserializeBinaryFromReader(message: MarkDoneRequest, reader: jspb.BinaryReader): MarkDoneRequest;
}

export namespace MarkDoneRequest {
  export type AsObject = {
    location: string,
    originalContent: string,
  }
}

export class MarkDoneResponse extends jspb.Message {
  getStatus(): string;
  setStatus(value: string): void;

  getMessage(): string;
  setMessage(value: string): void;

  getNewContent(): string;
  setNewContent(value: string): void;

  getCompleted(): boolean;
  setCompleted(value: boolean): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): MarkDoneResponse.AsObject;
  static toObject(includeInstance: boolean, msg: MarkDoneResponse): MarkDoneResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: MarkDoneResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): MarkDoneResponse;
  static deserializeBinaryFromReader(message: MarkDoneResponse, reader: jspb.BinaryReader): MarkDoneResponse;
}

export namespace MarkDoneResponse {
  export type AsObject = {
    status: string,
    message: string,
    newContent: string,
    completed: boolean,
  }
}

export class RgConfigMessage extends jspb.Message {
  clearPathsList(): void;
  getPathsList(): Array<string>;
  setPathsList(value: Array<string>): void;
  addPaths(value: string, index?: number): string;

  clearIgnoreList(): void;
  getIgnoreList(): Array<string>;
  setIgnoreList(value: Array<string>): void;
  addIgnore(value: string, index?: number): string;

  clearFileTypesList(): void;
  getFileTypesList(): Array<string>;
  setFileTypesList(value: Array<string>): void;
  addFileTypes(value: string, index?: number): string;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): RgConfigMessage.AsObject;
  static toObject(includeInstance: boolean, msg: RgConfigMessage): RgConfigMessage.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: RgConfigMessage, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): RgConfigMessage;
  static deserializeBinaryFromReader(message: RgConfigMessage, reader: jspb.BinaryReader): RgConfigMessage;
}

export namespace RgConfigMessage {
  export type AsObject = {
    pathsList: Array<string>,
    ignoreList: Array<string>,
    fileTypesList: Array<string>,
  }
}

export class ProjectConfigMessage extends jspb.Message {
  clearPatternsList(): void;
  getPatternsList(): Array<string>;
  setPatternsList(value: Array<string>): void;
  addPatterns(value: string, index?: number): string;

  hasAppendFilePath(): boolean;
  clearAppendFilePath(): void;
  getAppendFilePath(): string;
  setAppendFilePath(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ProjectConfigMessage.AsObject;
  static toObject(includeInstance: boolean, msg: ProjectConfigMessage): ProjectConfigMessage.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ProjectConfigMessage, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ProjectConfigMessage;
  static deserializeBinaryFromReader(message: ProjectConfigMessage, reader: jspb.BinaryReader): ProjectConfigMessage;
}

export namespace ProjectConfigMessage {
  export type AsObject = {
    patternsList: Array<string>,
    appendFilePath: string,
  }
}

export class ConfigMessage extends jspb.Message {
  hasRg(): boolean;
  clearRg(): void;
  getRg(): RgConfigMessage | undefined;
  setRg(value?: RgConfigMessage): void;

  getProjectsMap(): jspb.Map<string, ProjectConfigMessage>;
  clearProjectsMap(): void;
  getRefreshInterval(): number;
  setRefreshInterval(value: number): void;

  getEditorUriScheme(): string;
  setEditorUriScheme(value: string): void;

  clearTodoDonePairsList(): void;
  getTodoDonePairsList(): Array<TodoDonePair>;
  setTodoDonePairsList(value: Array<TodoDonePair>): void;
  addTodoDonePairs(value?: TodoDonePair, index?: number): TodoDonePair;

  getDefaultAppendBasename(): string;
  setDefaultAppendBasename(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ConfigMessage.AsObject;
  static toObject(includeInstance: boolean, msg: ConfigMessage): ConfigMessage.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ConfigMessage, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ConfigMessage;
  static deserializeBinaryFromReader(message: ConfigMessage, reader: jspb.BinaryReader): ConfigMessage;
}

export namespace ConfigMessage {
  export type AsObject = {
    rg?: RgConfigMessage.AsObject,
    projectsMap: Array<[string, ProjectConfigMessage.AsObject]>,
    refreshInterval: number,
    editorUriScheme: string,
    todoDonePairsList: Array<TodoDonePair.AsObject>,
    defaultAppendBasename: string,
  }
}

export class TodoDonePair extends jspb.Message {
  getTodoMarker(): string;
  setTodoMarker(value: string): void;

  getDoneMarker(): string;
  setDoneMarker(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): TodoDonePair.AsObject;
  static toObject(includeInstance: boolean, msg: TodoDonePair): TodoDonePair.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: TodoDonePair, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): TodoDonePair;
  static deserializeBinaryFromReader(message: TodoDonePair, reader: jspb.BinaryReader): TodoDonePair;
}

export namespace TodoDonePair {
  export type AsObject = {
    todoMarker: string,
    doneMarker: string,
  }
}

export class GetConfigRequest extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetConfigRequest.AsObject;
  static toObject(includeInstance: boolean, msg: GetConfigRequest): GetConfigRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: GetConfigRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetConfigRequest;
  static deserializeBinaryFromReader(message: GetConfigRequest, reader: jspb.BinaryReader): GetConfigRequest;
}

export namespace GetConfigRequest {
  export type AsObject = {
  }
}

export class GetConfigResponse extends jspb.Message {
  hasConfig(): boolean;
  clearConfig(): void;
  getConfig(): ConfigMessage | undefined;
  setConfig(value?: ConfigMessage): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): GetConfigResponse.AsObject;
  static toObject(includeInstance: boolean, msg: GetConfigResponse): GetConfigResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: GetConfigResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): GetConfigResponse;
  static deserializeBinaryFromReader(message: GetConfigResponse, reader: jspb.BinaryReader): GetConfigResponse;
}

export namespace GetConfigResponse {
  export type AsObject = {
    config?: ConfigMessage.AsObject,
  }
}

export class UpdateConfigRequest extends jspb.Message {
  hasConfig(): boolean;
  clearConfig(): void;
  getConfig(): ConfigMessage | undefined;
  setConfig(value?: ConfigMessage): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): UpdateConfigRequest.AsObject;
  static toObject(includeInstance: boolean, msg: UpdateConfigRequest): UpdateConfigRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: UpdateConfigRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): UpdateConfigRequest;
  static deserializeBinaryFromReader(message: UpdateConfigRequest, reader: jspb.BinaryReader): UpdateConfigRequest;
}

export namespace UpdateConfigRequest {
  export type AsObject = {
    config?: ConfigMessage.AsObject,
  }
}

export class UpdateConfigResponse extends jspb.Message {
  getStatus(): string;
  setStatus(value: string): void;

  getMessage(): string;
  setMessage(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): UpdateConfigResponse.AsObject;
  static toObject(includeInstance: boolean, msg: UpdateConfigResponse): UpdateConfigResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: UpdateConfigResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): UpdateConfigResponse;
  static deserializeBinaryFromReader(message: UpdateConfigResponse, reader: jspb.BinaryReader): UpdateConfigResponse;
}

export namespace UpdateConfigResponse {
  export type AsObject = {
    status: string,
    message: string,
  }
}

