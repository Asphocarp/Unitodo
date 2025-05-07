import { TodoCategory as AppTodoCategory, TodoItem as AppTodoItem } from '../types'; // Renamed for clarity
// Remove fetchApi, postApi from apiUtils if they are no longer needed by other functions in this file, or keep if used elsewhere.
// For now, we assume other functions will also be refactored, so remove it from here.
// import { fetchApi, postApi } from '../utils/apiUtils';

// @ts-ignore: electronApi is exposed on window via preload.js
const electronApi = typeof window !== 'undefined' ? window.electronApi : undefined;

export async function fetchTodoData(): Promise<AppTodoCategory[]> {
  if (!electronApi) {
    console.warn('[todoService] Electron API not available during fetchTodoData. Build-time or preload issue?');
    // Return empty or default to allow build to pass; actual data will be fetched client-side in Electron.
    return Promise.resolve([]); 
  }
  try {
    // The main process handler for 'get-todos' should return { categoriesList: [...] }
    // where categoriesList contains items that are already plain objects.
    const response = await electronApi.getTodos();
    // Assuming the main process returns data structured like GetTodosResponse.toObject(),
    // which includes categoriesList. Or it directly returns the AppTodoCategory[] array.
    // Let's assume it returns an object { categoriesList: AppTodoCategory[] } 
    // or the main process maps it to AppTodoCategory[] directly.
    // Based on the main process handler, it resolves with { categoriesList: transformedCategories }
    // where transformedCategories items are like cat.toObject() and item.toObject().
    // We need to ensure this structure matches AppTodoCategory[]
    
    // If main returns { categoriesList: [{ name, icon, todosList: [{...}] }] }
    // We need to map todosList to todos
    return response.categoriesList.map((cat: { name: string; icon: string; todosList: AppTodoItem[] }) => ({
        name: cat.name,
        icon: cat.icon,
        todos: cat.todosList || [] // Map field name and ensure it's an array
    }));
  } catch (error) {
    console.error('Error invoking getTodos via IPC:', error);
    throw error;
  }
} 

// Define the payload structure for editing a todo item
interface EditTodoPayload {
  location: string;
  new_content: string;
  original_content: string; // Add original content for verification
  completed: boolean;
}

export async function editTodoItem(payload: EditTodoPayload): Promise<{ status: string; message: string }> {
  if (!electronApi) {
    console.warn('[todoService] Electron API not available during editTodoItem.');
    return Promise.reject(new Error('Electron API not available'));
  }
  try {
    // Main process editTodo handler returns response.toObject()
    return await electronApi.editTodo(payload);
  } catch (error) {
    console.error('Error invoking editTodo via IPC:', error);
    throw error;
  }
} 

// Define the payload structure for adding a todo item
interface AddTodoPayload {
  category_type: string; // "git" or "project"
  category_name: string; // Name of the repo or project
  content: string; // The raw content for the new todo item
  example_item_location?: string; // Required for "git" type
}

// Function to add a new todo item via the backend
export async function addTodoItem(payload: AddTodoPayload): Promise<{ status: string; message: string }> {
  if (!electronApi) {
    console.warn('[todoService] Electron API not available during addTodoItem.');
    return Promise.reject(new Error('Electron API not available'));
  }
  try {
    // Main process addTodo handler returns response.toObject()
    return await electronApi.addTodo(payload);
  } catch (error) {
    console.error('Error invoking addTodo via IPC:', error);
    throw error;
  }
} 

// Define the payload structure for marking a todo item as done
export interface MarkDonePayload {
  location: string;
  original_content: string;
}

// Define the expected response structure from the mark-done endpoint
// This local interface should match the fields from PbMarkDoneResponse
export interface MarkDoneResponse {
  status: string;
  message: string;
  new_content: string;
  completed: boolean;
  error?: string; 
  details?: string; 
  code?: number; 
}

// Function to mark a todo item as done via the backend
export async function markTodoAsDone(payload: MarkDonePayload): Promise<MarkDoneResponse> { // Return type matches local interface
  if (!electronApi) {
    console.warn('[todoService] Electron API not available during markTodoAsDone.');
    return Promise.reject(new Error('Electron API not available'));
  }
  try {
    // Main process markDone handler returns response.toObject()
    // which matches {status, message, newContent, completed}
    const result = await electronApi.markDone(payload);
    return {
        status: result.status,
        message: result.message,
        new_content: result.newContent, // Ensure field name matches if different from PbMarkDoneResponse
        completed: result.completed,
    };
  } catch (error) {
    console.error('Error invoking markDone via IPC:', error);
    throw error;
  }
} 