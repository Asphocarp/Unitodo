import { TodoCategory } from '../types';
import { fetchApi, postApi } from '../utils/apiUtils';

export async function fetchTodoData(): Promise<TodoCategory[]> {
  try {
    const data = await fetchApi<{categories: TodoCategory[]}>('/api/todos');
    return data.categories || [];
  } catch (error) {
    console.error('Error fetching todo data:', error);
    throw error; // Re-throw to allow component to handle the error
  }
} 

// Define the payload structure for editing a todo item
interface EditTodoPayload {
  location: string;
  new_content: string;
  original_content: string; // Add original content for verification
  completed: boolean;
}

export async function editTodoItem(payload: EditTodoPayload): Promise<any> {
  try {
    return await postApi<any>('/api/todos/edit', payload);
  } catch (error) {
    console.error('Error editing todo item:', error);
    throw error; // Re-throw for component handling
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
export async function addTodoItem(payload: AddTodoPayload): Promise<any> {
  try {
    return await postApi<any>('/api/todos/add', payload);
  } catch (error) {
    console.error('Error adding todo item:', error);
    throw error;
  }
} 

// Define the payload structure for marking a todo item as done
export interface MarkDonePayload {
  location: string;
  original_content: string;
}

// Define the expected response structure from the mark-done endpoint
export interface MarkDoneResponse {
  status: string;
  message: string;
  new_content: string;
  completed: boolean;
  error?: string; // Optional error field from backend if status is error
  details?: string; // Optional details field
  code?: number; // Optional HTTP status code from backend error
}

// Function to mark a todo item as done via the backend
export async function markTodoAsDone(payload: MarkDonePayload): Promise<MarkDoneResponse> {
  try {
    return await postApi<MarkDoneResponse>('/api/todos/mark-done', payload);
  } catch (error) {
    console.error('Error marking todo as done:', error);
    throw error; // Re-throw for component handling
  }
} 