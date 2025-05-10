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
    // If line starts with TODO, - [ ], or contains a todo item pattern // UNITODO_IGNORE_LINE
    else if (currentCategory && (line.startsWith('TODO') || line.startsWith('- [') || line.match(/^[^-]*?TODO/))) { // UNITODO_IGNORE_LINE
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
      if (content.startsWith('- [ ] ')) { // UNITODO_IGNORE_LINE
        content = content.substring(6);
      } else if (content.startsWith('- [x] ') || content.startsWith('- [X] ')) {
        content = content.substring(6);
      } else if (content.startsWith('TODO ')) { // UNITODO_IGNORE_LINE
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

// Constants for timestamp encoding/decoding
const URL_SAFE_BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
// DONE: 2@@Aqp_f X maybe use -0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz to follow the alphabetically sorting
const CUSTOM_EPOCH_SECONDS = Math.floor(new Date('2025-01-01T00:00:00Z').getTime() / 1000);

/**
 * Generates a 5-character timestamp in URL-safe base64 format.
 * Starting from a custom epoch (Jan 1, 2025).
 * @returns A 5-character base64 string.
 */
export function generateTimestamp(): string {
  const now = new Date();
  const currentUnixTimestamp = Math.floor(now.getTime() / 1000);
  const secondsSinceCustomEpoch = currentUnixTimestamp - CUSTOM_EPOCH_SECONDS;
  const timestampValue = Math.max(0, secondsSinceCustomEpoch); // Ensure non-negative

  let base64Timestamp = '';
  const mask6bit = 0x3F; // 63

  base64Timestamp += URL_SAFE_BASE64_CHARS.charAt((timestampValue >> 24) & mask6bit);
  base64Timestamp += URL_SAFE_BASE64_CHARS.charAt((timestampValue >> 18) & mask6bit);
  base64Timestamp += URL_SAFE_BASE64_CHARS.charAt((timestampValue >> 12) & mask6bit);
  base64Timestamp += URL_SAFE_BASE64_CHARS.charAt((timestampValue >> 6) & mask6bit);
  base64Timestamp += URL_SAFE_BASE64_CHARS.charAt(timestampValue & mask6bit);

  return base64Timestamp;
}

/**
 * Decodes a 5-character base64 ID back into a Date object.
 * The encoding is based on seconds since a custom epoch (Jan 1, 2025).
 * @param encodedId The 5-character base64 string (e.g., "fffff").
 * @returns A Date object if decoding is successful, otherwise null.
 */
export function decodeTimestampId(encodedId: string): Date | null {
  if (typeof encodedId !== 'string' || encodedId.length !== 5) {
    return null;
  }

  let secondsSinceCustomEpoch = 0;
  for (let i = 0; i < 5; i++) {
    const char = encodedId[i];
    const charValue = URL_SAFE_BASE64_CHARS.indexOf(char);
    if (charValue === -1) {
      return null; // Invalid character in encodedId
    }
    // Reconstruct the 30-bit number. The first char is the most significant 6 bits.
    secondsSinceCustomEpoch = (secondsSinceCustomEpoch << 6) | charValue;
  }

  const unixTimestampSeconds = CUSTOM_EPOCH_SECONDS + secondsSinceCustomEpoch;
  return new Date(unixTimestampSeconds * 1000); // Date constructor expects milliseconds
}

/**
 * Abbreviates a time distance string from 'X unit(s)' to 'Xu'.
 * E.g., '5 minutes' becomes '5m', '2 days' becomes '2d'.
 * @param distanceString The string from date-fns formatDistanceStrict (e.g., "5 minutes").
 * @returns Abbreviated string (e.g., "5m") or original if no match.
 */
export function abbreviateTimeDistanceString(distanceString: string): string {
  if (!distanceString) return '';
  const parts = distanceString.split(' '); // e.g., ["5", "minutes"]
  if (parts.length !== 2) return distanceString; // Expects 'X unit'

  const value = parts[0];
  const unit = parts[1].toLowerCase();

  if (unit.startsWith('second')) return `${value}s`;
  if (unit.startsWith('minute')) return `${value}m`;
  if (unit.startsWith('hour')) return `${value}h`;
  if (unit.startsWith('day')) return `${value}d`;
  // formatDistanceStrict typically doesn't output weeks by default without specific options,
  // but we can add it for completeness if other functions might produce it.
  if (unit.startsWith('week')) return `${value}w`; 
  if (unit.startsWith('month')) return `${value}mo`;
  if (unit.startsWith('year')) return `${value}y`;

  return distanceString; // Fallback to the original string if unit is not recognized
}

// Regex explanation:
// ^                                      - Start of the string
// (\\s*)?                                - Start group 1 (optional): Leading whitespace
// (                                      - Start group 2: The first word (priority, id, done timestamp)
//   ([a-zA-Z0-9]+)?                      - Start group 3 (optional): Priority (alphanumeric)
//   (                                    - Start group 4: ID part (timestamp or unique ID)
//     @[a-zA-Z0-9_\-]{5}                 -   Option 1: @ followed by 5 base64 chars (timestamp)
//     |                                  -   OR
//     \\#\\#[0-9]+                        -   Option 2: ## followed by digits (incremented ID)
//     |                                  -   OR
//     \\#[a-zA-Z0-9_\-]{20}              -   Option 3: # followed by 20 base64 chars (nanoid)
//   )                                    - End group 4
//   (@@[a-zA-Z0-9_\-]{5})?               - Start group 5 (optional): Done timestamp (@@ followed by 5 base64 chars)
// )                                      - End group 2
// (\\s+                                   - Start group 6: Separator space(s)
//   (.*)                                 - Start group 7: The rest of the content
// )?                                     - End group 6 & 7, make them optional (for lines with only the first word)
// $                                      - End of the string
const TODO_REGEX = /^(\s*)?(([a-zA-Z0-9]+)?((?:@[a-zA-Z0-9_\-]{5})|(?:\#\#[0-9]+)|(?:\#[a-zA-Z0-9_\-]{20}))(@@[a-zA-Z0-9_\-]{5})?)(\s+(.*))?$/; // UNITODO_IGNORE_LINE

export interface ParsedTodo {
  priority: string | null;
  idPart: string | null;
  donePart: string | null;
  mainContent: string;
  isUnique: boolean;
  isValidTodoFormat: boolean;
}

/**
 * Parses a raw todo line based on the Unitodo format specification.
 * ASSUMES input string starts optionally with whitespace, then the first word (priority/id/timestamp).
 * Handles different ID formats (@timestamp, #nanoid, ##incremented) and optional priority/done markers.
 */
export function parseTodoContent(content: string): ParsedTodo {
  const match = content.match(TODO_REGEX); // UNITODO_IGNORE_LINE

  if (match) {
    // Corrected group indices
    const priority = match[3] || null; // Optional priority (Group 3)
    const idPart = match[4] || null;   // ID part (@..., #..., ##...) (Group 4)
    const donePart = match[5] || null; // Optional done timestamp (@@...) (Corrected: Group 5)
    const mainContent = match[7] || ''; // The actual todo text content (Corrected: Group 7)

    // Corrected Group Indices Explanation:
    // Group 1: leadingWhitespace?                  e.g., '   '
    // Group 2: firstWord                           e.g., '123@abcde@@fghij'
    // Group 3:   priority?                          e.g., '123'
    // Group 4:   idPart (@ | ## | #)                e.g., '@abcde'
    // Group 5:   donePart? (@@...)                  e.g., '@@fghij'
    // Group 6: separatorAndContent? (\s+ .*)        e.g., '  the content'
    // Group 7:   mainContent? (.*)                  e.g., 'the content'

    const isUnique = !!idPart && (idPart.startsWith('#') || idPart.startsWith('@')); 

    return {
      priority,
      idPart,
      donePart,
      mainContent: mainContent.trim(),
      isUnique,
      isValidTodoFormat: true,
    };
  }

  // If no match, return the original content as mainContent and mark as not unique/invalid format
  return {
    priority: null,
    idPart: null,
    donePart: null,
    mainContent: content.trim(),
    isUnique: false,
    isValidTodoFormat: false,
  };
}