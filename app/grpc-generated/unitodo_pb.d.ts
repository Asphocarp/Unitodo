// package: unitodo
// file: unitodo.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class TodoItem extends jspb.Message { 
    getContent(): string;
    setContent(value: string): TodoItem;
    getLocation(): string;
    setLocation(value: string): TodoItem;
    getCompleted(): boolean;
    setCompleted(value: boolean): TodoItem;

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
    setName(value: string): TodoCategory;
    getIcon(): string;
    setIcon(value: string): TodoCategory;
    clearTodosList(): void;
    getTodosList(): Array<TodoItem>;
    setTodosList(value: Array<TodoItem>): TodoCategory;
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
    setCategoriesList(value: Array<TodoCategory>): GetTodosResponse;
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
    setLocation(value: string): EditTodoRequest;
    getNewContent(): string;
    setNewContent(value: string): EditTodoRequest;
    getOriginalContent(): string;
    setOriginalContent(value: string): EditTodoRequest;
    getCompleted(): boolean;
    setCompleted(value: boolean): EditTodoRequest;

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
    setStatus(value: string): EditTodoResponse;
    getMessage(): string;
    setMessage(value: string): EditTodoResponse;

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
    setCategoryType(value: string): AddTodoRequest;
    getCategoryName(): string;
    setCategoryName(value: string): AddTodoRequest;
    getContent(): string;
    setContent(value: string): AddTodoRequest;

    hasExampleItemLocation(): boolean;
    clearExampleItemLocation(): void;
    getExampleItemLocation(): string | undefined;
    setExampleItemLocation(value: string): AddTodoRequest;

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
        exampleItemLocation?: string,
    }
}

export class AddTodoResponse extends jspb.Message { 
    getStatus(): string;
    setStatus(value: string): AddTodoResponse;
    getMessage(): string;
    setMessage(value: string): AddTodoResponse;

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
    setLocation(value: string): MarkDoneRequest;
    getOriginalContent(): string;
    setOriginalContent(value: string): MarkDoneRequest;

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
    setStatus(value: string): MarkDoneResponse;
    getMessage(): string;
    setMessage(value: string): MarkDoneResponse;
    getNewContent(): string;
    setNewContent(value: string): MarkDoneResponse;
    getCompleted(): boolean;
    setCompleted(value: boolean): MarkDoneResponse;

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
    setPathsList(value: Array<string>): RgConfigMessage;
    addPaths(value: string, index?: number): string;
    clearIgnoreList(): void;
    getIgnoreList(): Array<string>;
    setIgnoreList(value: Array<string>): RgConfigMessage;
    addIgnore(value: string, index?: number): string;
    clearFileTypesList(): void;
    getFileTypesList(): Array<string>;
    setFileTypesList(value: Array<string>): RgConfigMessage;
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
    setPatternsList(value: Array<string>): ProjectConfigMessage;
    addPatterns(value: string, index?: number): string;

    hasAppendFilePath(): boolean;
    clearAppendFilePath(): void;
    getAppendFilePath(): string | undefined;
    setAppendFilePath(value: string): ProjectConfigMessage;

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
        appendFilePath?: string,
    }
}

export class ConfigMessage extends jspb.Message { 

    hasRg(): boolean;
    clearRg(): void;
    getRg(): RgConfigMessage | undefined;
    setRg(value?: RgConfigMessage): ConfigMessage;

    getProjectsMap(): jspb.Map<string, ProjectConfigMessage>;
    clearProjectsMap(): void;
    getRefreshInterval(): number;
    setRefreshInterval(value: number): ConfigMessage;
    getEditorUriScheme(): string;
    setEditorUriScheme(value: string): ConfigMessage;
    clearTodoDonePairsList(): void;
    getTodoDonePairsList(): Array<TodoDonePair>;
    setTodoDonePairsList(value: Array<TodoDonePair>): ConfigMessage;
    addTodoDonePairs(value?: TodoDonePair, index?: number): TodoDonePair;
    getDefaultAppendBasename(): string;
    setDefaultAppendBasename(value: string): ConfigMessage;

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
    setTodoMarker(value: string): TodoDonePair;
    getDoneMarker(): string;
    setDoneMarker(value: string): TodoDonePair;

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

export class GetActiveProfileRequest extends jspb.Message { 

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetActiveProfileRequest.AsObject;
    static toObject(includeInstance: boolean, msg: GetActiveProfileRequest): GetActiveProfileRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetActiveProfileRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetActiveProfileRequest;
    static deserializeBinaryFromReader(message: GetActiveProfileRequest, reader: jspb.BinaryReader): GetActiveProfileRequest;
}

export namespace GetActiveProfileRequest {
    export type AsObject = {
    }
}

export class GetActiveProfileResponse extends jspb.Message { 
    getProfileName(): string;
    setProfileName(value: string): GetActiveProfileResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetActiveProfileResponse.AsObject;
    static toObject(includeInstance: boolean, msg: GetActiveProfileResponse): GetActiveProfileResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetActiveProfileResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetActiveProfileResponse;
    static deserializeBinaryFromReader(message: GetActiveProfileResponse, reader: jspb.BinaryReader): GetActiveProfileResponse;
}

export namespace GetActiveProfileResponse {
    export type AsObject = {
        profileName: string,
    }
}

export class SetActiveProfileRequest extends jspb.Message { 
    getProfileName(): string;
    setProfileName(value: string): SetActiveProfileRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SetActiveProfileRequest.AsObject;
    static toObject(includeInstance: boolean, msg: SetActiveProfileRequest): SetActiveProfileRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SetActiveProfileRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SetActiveProfileRequest;
    static deserializeBinaryFromReader(message: SetActiveProfileRequest, reader: jspb.BinaryReader): SetActiveProfileRequest;
}

export namespace SetActiveProfileRequest {
    export type AsObject = {
        profileName: string,
    }
}

export class SetActiveProfileResponse extends jspb.Message { 
    getStatus(): string;
    setStatus(value: string): SetActiveProfileResponse;
    getMessage(): string;
    setMessage(value: string): SetActiveProfileResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SetActiveProfileResponse.AsObject;
    static toObject(includeInstance: boolean, msg: SetActiveProfileResponse): SetActiveProfileResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SetActiveProfileResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SetActiveProfileResponse;
    static deserializeBinaryFromReader(message: SetActiveProfileResponse, reader: jspb.BinaryReader): SetActiveProfileResponse;
}

export namespace SetActiveProfileResponse {
    export type AsObject = {
        status: string,
        message: string,
    }
}

export class ListProfilesRequest extends jspb.Message { 

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ListProfilesRequest.AsObject;
    static toObject(includeInstance: boolean, msg: ListProfilesRequest): ListProfilesRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ListProfilesRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ListProfilesRequest;
    static deserializeBinaryFromReader(message: ListProfilesRequest, reader: jspb.BinaryReader): ListProfilesRequest;
}

export namespace ListProfilesRequest {
    export type AsObject = {
    }
}

export class ProfileInfo extends jspb.Message { 
    getName(): string;
    setName(value: string): ProfileInfo;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ProfileInfo.AsObject;
    static toObject(includeInstance: boolean, msg: ProfileInfo): ProfileInfo.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ProfileInfo, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ProfileInfo;
    static deserializeBinaryFromReader(message: ProfileInfo, reader: jspb.BinaryReader): ProfileInfo;
}

export namespace ProfileInfo {
    export type AsObject = {
        name: string,
    }
}

export class ListProfilesResponse extends jspb.Message { 
    clearProfilesList(): void;
    getProfilesList(): Array<ProfileInfo>;
    setProfilesList(value: Array<ProfileInfo>): ListProfilesResponse;
    addProfiles(value?: ProfileInfo, index?: number): ProfileInfo;
    getActiveProfileName(): string;
    setActiveProfileName(value: string): ListProfilesResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ListProfilesResponse.AsObject;
    static toObject(includeInstance: boolean, msg: ListProfilesResponse): ListProfilesResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ListProfilesResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ListProfilesResponse;
    static deserializeBinaryFromReader(message: ListProfilesResponse, reader: jspb.BinaryReader): ListProfilesResponse;
}

export namespace ListProfilesResponse {
    export type AsObject = {
        profilesList: Array<ProfileInfo.AsObject>,
        activeProfileName: string,
    }
}

export class AddProfileRequest extends jspb.Message { 
    getNewProfileName(): string;
    setNewProfileName(value: string): AddProfileRequest;

    hasCopyFromProfileName(): boolean;
    clearCopyFromProfileName(): void;
    getCopyFromProfileName(): string | undefined;
    setCopyFromProfileName(value: string): AddProfileRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AddProfileRequest.AsObject;
    static toObject(includeInstance: boolean, msg: AddProfileRequest): AddProfileRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AddProfileRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AddProfileRequest;
    static deserializeBinaryFromReader(message: AddProfileRequest, reader: jspb.BinaryReader): AddProfileRequest;
}

export namespace AddProfileRequest {
    export type AsObject = {
        newProfileName: string,
        copyFromProfileName?: string,
    }
}

export class AddProfileResponse extends jspb.Message { 
    getStatus(): string;
    setStatus(value: string): AddProfileResponse;
    getMessage(): string;
    setMessage(value: string): AddProfileResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AddProfileResponse.AsObject;
    static toObject(includeInstance: boolean, msg: AddProfileResponse): AddProfileResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AddProfileResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AddProfileResponse;
    static deserializeBinaryFromReader(message: AddProfileResponse, reader: jspb.BinaryReader): AddProfileResponse;
}

export namespace AddProfileResponse {
    export type AsObject = {
        status: string,
        message: string,
    }
}

export class DeleteProfileRequest extends jspb.Message { 
    getProfileName(): string;
    setProfileName(value: string): DeleteProfileRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): DeleteProfileRequest.AsObject;
    static toObject(includeInstance: boolean, msg: DeleteProfileRequest): DeleteProfileRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: DeleteProfileRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): DeleteProfileRequest;
    static deserializeBinaryFromReader(message: DeleteProfileRequest, reader: jspb.BinaryReader): DeleteProfileRequest;
}

export namespace DeleteProfileRequest {
    export type AsObject = {
        profileName: string,
    }
}

export class DeleteProfileResponse extends jspb.Message { 
    getStatus(): string;
    setStatus(value: string): DeleteProfileResponse;
    getMessage(): string;
    setMessage(value: string): DeleteProfileResponse;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): DeleteProfileResponse.AsObject;
    static toObject(includeInstance: boolean, msg: DeleteProfileResponse): DeleteProfileResponse.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: DeleteProfileResponse, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): DeleteProfileResponse;
    static deserializeBinaryFromReader(message: DeleteProfileResponse, reader: jspb.BinaryReader): DeleteProfileResponse;
}

export namespace DeleteProfileResponse {
    export type AsObject = {
        status: string,
        message: string,
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
    setConfig(value?: ConfigMessage): GetConfigResponse;
    getActiveProfileName(): string;
    setActiveProfileName(value: string): GetConfigResponse;

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
        activeProfileName: string,
    }
}

export class UpdateConfigRequest extends jspb.Message { 

    hasConfig(): boolean;
    clearConfig(): void;
    getConfig(): ConfigMessage | undefined;
    setConfig(value?: ConfigMessage): UpdateConfigRequest;

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
    setStatus(value: string): UpdateConfigResponse;
    getMessage(): string;
    setMessage(value: string): UpdateConfigResponse;

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
