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

export function categorizeTodos(todos: TodoItem[]) {
  const categorized: { [key: string]: TodoItem[] } = {
    Project: [],
    'Git Repo': [],
    Other: [],
  };

  todos.forEach(todo => {
    if (todo.location) {
      if (todo.location.includes('/') || todo.location.includes('\\')) {
        // Basic check if location looks like a path (contains slashes)
        // More sophisticated checks could involve checking against known project roots
        // or looking for specific file types associated with projects.
        
        // Simple check for common git repo indicators in the path
        if (todo.location.toLowerCase().includes('/.git/') || todo.location.endsWith('.git')) {
           categorized['Git Repo'].push(todo);
        } else {
          // Assume it's a project file if it has a path but isn't clearly git-related
          categorized.Project.push(todo);
        }
      } else {
        // If location doesn't look like a path, categorize as Other
        categorized.Other.push(todo);
      }
    } else {
      // Todos without location are categorized as Other
      categorized.Other.push(todo);
    }
  });

  return categorized;
}

// Regex explanation:
// ^                                      - Start of the string
// (\s*                                  - Start group 1: Leading whitespace and optional marker
//   (?:- \[ \] |T0DO[:]?)\s+          - Non-capturing group for the marker ('- [ ] ' or 'T0DO' or 'T0DO:') followed by one or more spaces
// )?                                     - End group 1, make it optional
// (                                      - Start group 2: The first word (priority, id, done timestamp)
//   ([a-zA-Z0-9]+)?                      - Start group 3 (optional): Priority (alphanumeric)
//   (                                    - Start group 4: ID part (timestamp or unique ID)
//     @[a-zA-Z0-9_\-]{5}                 -   Option 1: @ followed by 5 base64 chars (timestamp)
//     |                                  -   OR
//     \#\#[0-9]+                        -   Option 2: ## followed by digits (incremented ID)
//     |                                  -   OR
//     \#[a-zA-Z0-9_\-]{20}              -   Option 3: # followed by 20 base64 chars (nanoid)
//   )                                    - End group 4
//   (@@[a-zA-Z0-9_\-]{5})?               - Start group 5 (optional): Done timestamp (@@ followed by 5 base64 chars)
// )                                      - End group 2
// (\s+                                   - Start group 6: Separator space(s)
//   (.*)                                 - Start group 7: The rest of the content
// )?                                     - End group 6 & 7, make them optional (for lines with only the first word)
// $                                      - End of the string
const TODO_REGEX = /^(\s*(?:- \[ \] |T0DO[:]?)\s+)?(([a-zA-Z0-9]+)?((?:@[a-zA-Z0-9_\-]{5})|(?:\#\#[0-9]+)|(?:\#[a-zA-Z0-9_\-]{20}))(@@[a-zA-Z0-9_\-]{5})?)(\s+(.*))?$/;


export interface ParsedTodo {
  prefix: string;
  priority: string | null;
  idPart: string | null;      // Includes the marker (@, #, ##)
  donePart: string | null;    // Includes the marker (@@)
  mainContent: string;
  isUnique: boolean;
  isValidTodoFormat: boolean; // Indicates if the line matches the basic structure
}

/**
 * Parses a raw todo line based on the Unitodo format specification.
 * Handles different ID formats (@timestamp, #nanoid, ##incremented) and optional priority/done markers.
 */
export function parseTodoContent(content: string): ParsedTodo {
  const match = content.match(TODO_REGEX);

  if (match) {
    console.log("TODO PARSER MATCH:", match); // DEBUGGING
    const prefix = match[1] || ''; // Optional prefix like '- [ ] ' or 'T0DO: '
    // Full first word is match[2]
    const priority = match[3] || null; // Optional priority
    const idPart = match[4] || null;   // ID part (@..., #..., ##...)
    const donePart = match[6] || null; // Optional done timestamp (@@...) - Adjusted index
    const mainContent = match[8] || ''; // The actual todo text content - Adjusted index

    // Re-check group indices based on regex structure and optional groups
    // Group 1: prefix?                              e.g., '- [ ] '
    // Group 2: firstWord                           e.g., '1@abcde@@fghij'
    // Group 3:   priority?                          e.g., '1'
    // Group 4:   idPart (@ | ## | #)                e.g., '@abcde'
    // Group 5:     (internal to idPart options)
    // Group 6:   donePart? (@@...)                  e.g., '@@fghij'
    // Group 7: separatorAndContent? (\s+ .*)        e.g., '  the content'
    // Group 8:   mainContent? (.*)                  e.g., 'the content'

    const isUnique = !!idPart && (idPart.startsWith('#') || idPart.startsWith('@')); // NEW: Unique if ID starts with #, ##, or @

    return {
      prefix,
      priority,
      idPart,
      donePart,
      mainContent: mainContent.trim(), // Trim whitespace from main content
      isUnique,
      isValidTodoFormat: true,
    };
  }

  // If no match, return the original content as mainContent and mark as not unique/invalid format
  return {
    prefix: '',
    priority: null,
    idPart: null,
    donePart: null,
    mainContent: content.trim(), // Use the original content trimmed
    isUnique: false,
    isValidTodoFormat: false,
  };
}