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
  projects: Record<string, string[]>; // HashMap<String, Vec<String>> -> Record<string, string[]>
  refresh_interval: number; // u32 -> number
  editor_uri_scheme: string;
}

// Corresponds to the Rust RgConfig struct
export interface RgConfig {
  pattern: string;
  paths: string[];
  ignore?: string[]; // Option<Vec<String>> -> string[] | undefined
  file_types?: string[]; // Option<Vec<String>> -> string[] | undefined
} 