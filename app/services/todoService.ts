import { TodoCategory } from '../types';

export async function fetchTodoData(): Promise<TodoCategory[]> {
  try {
    // Try to fetch from API first
    const response = await fetch('/api/todos');
    
    if (response.ok) {
      const data = await response.json();
      return data.categories || [];
    }
    
    // Fallback to direct file fetch if API fails
    const fileResponse = await fetch('/unitodo.sync.md');
    if (!fileResponse.ok) {
      throw new Error('Failed to fetch todo data');
    }
    
    const markdown = await fileResponse.text();
    
    // Import the parser dynamically to avoid issues with SSR
    const { parseTodoMarkdown } = await import('../utils');
    return parseTodoMarkdown(markdown);
  } catch (error) {
    console.error('Error fetching todo data:', error);
    return [];
  }
} 