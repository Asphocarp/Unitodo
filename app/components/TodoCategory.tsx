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
    <div className="hn-category">
      <div 
        className="hn-category-header"
        onClick={() => setExpanded(!expanded)}
      >
        <NerdFontIcon 
          icon={category.icon} 
          category={category.name} 
          className="text-sm mr-1"
        />
        {category.name}
        <span className="ml-1 text-subtle-color text-xs">
          ({completedCount}/{totalCount})
        </span>
        <span className="ml-1 text-subtle-color text-xs">
          {expanded ? '▼' : '►'}
        </span>
      </div>
      
      {expanded && (
        <div>
          {category.todos.length > 0 ? (
            category.todos.map((todo, index) => (
              <TodoItem 
                key={`${todo.location}-${index}`} 
                todo={todo} 
                onEditSuccess={handleTodoUpdate}
              />
            ))
          ) : (
            <div className="text-center p-1 text-subtle-color text-xs">
              No todos in this category
            </div>
          )}
        </div>
      )}
    </div>
  );
} 