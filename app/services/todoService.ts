import { invoke } from '@tauri-apps/api/core';
import { TodoCategory as AppTodoCategory, TodoItem as AppTodoItem } from '../types';
import {
    GetTodosResponse as ProtoGetTodosResponse,
    EditTodoRequest as ProtoEditTodoRequest, // Assuming frontend EditTodoPayload matches this structure
    EditTodoResponse as ProtoEditTodoResponse,
    AddTodoRequest as ProtoAddTodoRequest,   // Assuming frontend AddTodoPayload matches this structure
    AddTodoResponse as ProtoAddTodoResponse,
    MarkDoneRequest as ProtoMarkDoneRequest, // Assuming frontend MarkDonePayload matches this structure
    MarkDoneResponse as ProtoMarkDoneResponse,
    TodoCategory as ProtoTodoCategory, // For mapping
    TodoItem as ProtoTodoItem      // For mapping
} from '../grpc-generated/unitodo_pb';

// Type guard or helper to check if an object is a ProtoTodoCategory (if needed, often not for plain objects)
// function isProtoTodoCategory(obj: any): obj is ProtoTodoCategory { ... }

export async function fetchTodoData(): Promise<AppTodoCategory[]> {
  try {
    // The Rust command get_todos_command returns GetTodosResponse structure
    const response = await invoke<ProtoGetTodosResponse>('get_todos_command');
    
    // If response.getCategoriesList is not available because 'response' is a plain object:
    // const categoriesList = response.categories || []; (assuming field name from Rust struct is 'categories')
    // For protobuf.js generated types, if it's an instance, getCategoriesList() would be correct.
    // Given Tauri returns plain JSON objects, direct property access is more likely.
    const categoriesList = (response as any).categories || [];

    return categoriesList.map((cat: any /* ProtoTodoCategory as plain object */) => ({
        name: cat.name,
        icon: cat.icon,
        // todosList from proto, map to todos for AppTodoCategory
        // Again, if cat.todos is a list of plain objects:
        todos: (cat.todos || []).map((item: any /* ProtoTodoItem as plain object */) => ({
            content: item.content,
            location: item.location,
            completed: item.completed,
        })),
    }));
  } catch (error) {
    console.error('Error invoking get_todos_command:', error);
    return Promise.resolve([]); // Return empty or default
  }
} 

// Define the payload structure for editing a todo item (matches ProtoEditTodoRequest)
interface EditTodoPayload {
  location: string;
  new_content: string;
  original_content: string; 
  completed: boolean;
}

export async function editTodoItem(payload: EditTodoPayload): Promise<ProtoEditTodoResponse> {
  try {
    // Payload structure matches ProtoEditTodoRequest, pass it directly as named argument
    return await invoke<ProtoEditTodoResponse>('edit_todo_command', { payload });
  } catch (error) {
    console.error('Error invoking edit_todo_command:', error);
    throw error; // Or return a custom error object: Promise.reject({ status: 'error', message: ...});
  }
} 

interface AddTodoPayload {
  category_type: string; 
  category_name: string; 
  content: string; 
  example_item_location?: string; 
}

export async function addTodoItem(payload: AddTodoPayload): Promise<ProtoAddTodoResponse> {
  try {
    // Payload structure matches ProtoAddTodoRequest
    return await invoke<ProtoAddTodoResponse>('add_todo_command', { payload });
  } catch (error) {
    console.error('Error invoking add_todo_command:', error);
    throw error;
  }
} 

export interface MarkDonePayload {
  location: string;
  original_content: string;
}

// Using ProtoMarkDoneResponse directly as the return type from invoke
export async function markTodoAsDone(payload: MarkDonePayload): Promise<ProtoMarkDoneResponse> { 
  try {
    // Payload structure matches ProtoMarkDoneRequest
    // The Rust command returns ProtoMarkDoneResponse structure.
    // Field names from Rust (e.g., new_content) will be preserved in the JSON.
    return await invoke<ProtoMarkDoneResponse>('mark_done_command', { payload });
  } catch (error) {
    console.error('Error invoking mark_done_command:', error);
    throw error;
  }
} 