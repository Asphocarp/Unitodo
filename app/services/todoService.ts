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