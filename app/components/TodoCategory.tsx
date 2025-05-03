'use client';

import React from 'react';
import { TodoCategory as TodoCategoryType, TodoItem as TodoItemType } from '../types';
import TodoItem from './TodoItem';
import NerdFontIcon from './NerdFontIcon';

interface TodoCategoryProps {
  category: TodoCategoryType;
  onTodoUpdate?: (updatedTodo: TodoItemType) => void;
}

export default function TodoCategory({ category, onTodoUpdate }: TodoCategoryProps) {
  const [expanded, setExpanded] = React.useState(true);
  const completedCount = category.todos.filter(todo => todo.completed).length;
  const totalCount = category.todos.length;
  
  // Handle todo updates
  const handleTodoUpdate = (updatedTodo: TodoItemType) => {
    if (onTodoUpdate) {
      onTodoUpdate(updatedTodo);
    }
  };
  
  // Function to get appropriate icon class based on category name
  const getIconClass = () => {
    const name = category.name.toLowerCase();
    if (name.includes('git')) return 'icon-git';
    if (name === 'other') return 'icon-other';
    return 'icon-project';
  };
  
  return (
    <div className="mb-6 border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <div 
        className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
        onClick={() => setExpanded(!expanded)}
      >
        <h2 className="text-lg font-medium flex items-center gap-2">
          <NerdFontIcon 
            icon={category.icon} 
            category={category.name} 
            className="text-xl"
          />
          <span>{category.name}</span>
          <span className="ml-2 text-xs bg-gray-200 rounded-full px-2 py-0.5">
            {completedCount}/{totalCount}
          </span>
        </h2>
        <span className="text-gray-500">
          {expanded ? '▼' : '►'}
        </span>
      </div>
      
      {expanded && (
        <div className="divide-y divide-gray-200">
          {category.todos.length > 0 ? (
            category.todos.map((todo, index) => (
              <TodoItem 
                key={`${todo.location}-${index}`} 
                todo={todo} 
                onEditSuccess={handleTodoUpdate}
              />
            ))
          ) : (
            <div className="p-4 text-center text-gray-500">
              No todos in this category
            </div>
          )}
        </div>
      )}
    </div>
  );
} 