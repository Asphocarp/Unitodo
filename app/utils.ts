import { TodoCategory, TodoItem } from './types';

export function parseTodoMarkdown(markdown: string): TodoCategory[] {
  const lines = markdown.split('\n');
  const categories: TodoCategory[] = [];
  let currentCategory: TodoCategory | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    // Check if line is a category header
    if (line.startsWith('[')) {
      // Extract category name and icon
      const match = line.match(/\[(.*?) (.*)\]/);
      if (match && match.length >= 3) {
        let icon = match[1].trim();
        let name = match[2].trim();
        
        // If the icon is empty, set a default
        if (!icon) icon = '📋';
        
        currentCategory = {
          name,
          icon,
          todos: []
        };
        categories.push(currentCategory);
      }
    } 
    // If line starts with TODO, - [ ], or contains a todo item pattern
    else if (currentCategory && (line.startsWith('TODO') || line.startsWith('- [') || line.match(/^[^-]*?TODO/))) {
      // Default to incomplete
      let completed = false;
      
      // Check if it's marked as completed
      if (line.includes('- [x]') || line.includes('- [X]')) {
        completed = true;
      }
      
      // Extract the content and location parts
      let content = line;
      let location = '';
      
      // Check for location marker (@ symbol)
      const locationIndex = line.lastIndexOf('@');
      if (locationIndex > 0) {
        content = line.substring(0, locationIndex).trim();
        location = line.substring(locationIndex + 1).trim();
      }
      
      // Clean up the content based on different formats
      if (content.startsWith('- [ ] ')) {
        content = content.substring(6);
      } else if (content.startsWith('- [x] ') || content.startsWith('- [X] ')) {
        content = content.substring(6);
      } else if (content.startsWith('TODO ')) {
        content = content.substring(5);
      }
      
      // Further cleanup: remove any remaining dashes or markers
      content = content.replace(/^[-*]\s+/, '').trim();
      
      const todoItem: TodoItem = {
        content,
        location,
        completed
      };
      
      currentCategory.todos.push(todoItem);
    }
  }
  
  return categories;
} 