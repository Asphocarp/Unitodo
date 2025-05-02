export type TodoCategory = {
  name: string;
  icon: string;
  todos: TodoItem[];
};

export type TodoItem = {
  content: string;
  location: string;
  completed: boolean;
}; 