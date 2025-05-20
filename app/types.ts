export interface TodoItem {
  content: string;
  location: string; // Example: "src/main.rs:123"
  completed: boolean;
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
  refresh_interval: number; // u32 -> number
  editor_uri_scheme: string;
  todo_states: string[][]; // Changed from todo_done_pairs, type updated to string[][]
  default_append_basename: string; // Default filename for appending todos in git repos
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