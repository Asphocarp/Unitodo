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