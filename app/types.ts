export interface TodoItem {
  content: string;
  location: string; // Example: "src/main.rs:123"
  status: string;
}

export interface TodoCategory {
  name: string;
  icon: string;
  todos: TodoItem[];
}

// Corresponds to the Rust Config struct
export interface Config {
  rg: RgConfig;
  projects: Record<string, ProjectConfig>; // Updated: Value is now ProjectConfig
  editor_scheme?: string;
  refresh_interval?: number;
  todo_states?: string[][];
  editor_uri_scheme?: string;
  default_priority?: string;
  default_project_priority?: string;
  default_git_project_priority?: string;
  file_scan_depth?: number;
  auto_scan_interval?: number;
  always_show_project_root_todo?: boolean;
  auto_create_project_root_todo?: boolean;
  default_append_basename?: string;
}

// Added: Corresponds to the Rust ProjectConfig struct
export interface ProjectConfig {
  patterns: string[];
  append_file_path?: string; // Optional path for appending todos
}

// Corresponds to the Rust RgConfig struct
export interface RgConfig {
  paths: string[];
  ignore?: string[]; // Option<Vec<String>> -> string[] | undefined
  file_types?: string[]; // Option<Vec<String>> -> string[] | undefined
}

// Added type definitions for Todo component's flattened list
export interface FlatHeaderItem {
  type: 'header';
  category: TodoCategory;
  categoryIndex: number; // Original index in todoStore.categories
  flatIndex: number;
}

export interface FlatTodoItem {
  type: 'item';
  todo: TodoItem;
  categoryIndex: number; // Original index in todoStore.categories
  itemIndex: number;    // Original index in todoStore.categories[categoryIndex].todos
  flatIndex: number;
}

export type FlatListItem = FlatHeaderItem | FlatTodoItem;

// Added type definition for TodoTable component's row data
export interface TodoTableRow {
  id: string; // Unique ID for the row (e.g., todo.location + todo.content hash, or header type)
  isSectionHeader?: boolean; // True if this row represents a section header
  sectionHeaderText?: string; // Text for the section header (e.g., "DOING", "TODO")

  // Fields for actual todo items - optional if isSectionHeader is true
  content?: string;
  parsedContent?: any; // ReturnType<typeof parseTodoContent>; Adjust if parseTodoContent is moved/typed
  zone?: string; // Category name (git-repo or project-name)
  zoneIcon?: string; // Added for category icon
  filePath?: string;
  lineNumber?: string;
  created?: string | null; // Will be extracted from parsedContent.idPart
  finished?: string | null; // Will be extracted from parsedContent.donePart
  estDuration?: string | null; // Placeholder
  originalTodo?: TodoItem; // Keep original todo for actions
  categoryIndex?: number;
  itemIndex?: number;
} 