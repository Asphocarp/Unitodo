import { TodoCategory } from '../types';

export async function fetchTodoData(): Promise<TodoCategory[]> {
  try {
    // Always use the API endpoint which now runs the Rust program
    const response = await fetch('/api/todos');
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
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

export async function editTodoItem(payload: EditTodoPayload): Promise<any> { // Return type can be more specific if backend sends data
  try {
    const response = await fetch('/api/todos/edit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        error: 'Could not parse error response',
        code: response.status 
      }));
      
      // Special handling for 409 Conflict status - content was modified by someone else
      if (response.status === 409) {
        throw new Error('CONFLICT_ERROR: Todo content was modified by someone else. Please refresh and try again.');
      }
      
      throw new Error(`API error: ${response.status} ${response.statusText} - ${errorData.error || 'No details'}`);
    }

    // Assuming the backend sends back a success status or updated item
    return await response.json(); 
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
    const response = await fetch('/api/todos/add', { // Assuming endpoint is /api/todos/add
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        error: 'Could not parse error response from add todo endpoint',
        code: response.status 
      }));
      throw new Error(`API error adding todo: ${response.status} ${response.statusText} - ${errorData.error || 'No details'}`);
    }

    return await response.json();
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
    const response = await fetch('/api/todos/mark-done', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store' // Ensure the request is always sent
    });

    const responseData: MarkDoneResponse = await response.json();

    if (!response.ok) {
      // Throw an error that includes backend-provided details if available
      const errorMessage = responseData.error || 'Failed to mark todo as done';
      const errorDetails = responseData.details || 'No specific details provided by the backend.';
      const errorCode = responseData.code || response.status;
      
      if (response.status === 409) { // Conflict error from backend
          throw new Error(`CONFLICT_ERROR: ${errorMessage} - ${errorDetails}`);
      }
      throw new Error(`API error ${errorCode}: ${errorMessage} - ${errorDetails}`);
    }

    return responseData;
  } catch (error) {
    console.error('Error marking todo as done:', error);
    throw error; // Re-throw for component handling
  }
} 