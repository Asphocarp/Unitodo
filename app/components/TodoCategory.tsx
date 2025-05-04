'use client';

import React, { KeyboardEvent, useRef, useEffect } from 'react';
import { TodoCategory as TodoCategoryType, TodoItem as TodoItemType } from '../types';
import TodoItem from './TodoItem';
import NerdFontIcon from './NerdFontIcon';

interface TodoCategoryProps {
  category: TodoCategoryType;
  onTodoUpdate?: (updatedTodo: TodoItemType) => void;
  focusedItemIndex?: number;
  onItemClick?: (itemIndex: number) => void;
  onKeyNavigation?: (direction: 'up' | 'down', localIndex: number) => void;
  categoryIndex?: number;
}

export default function TodoCategory({ 
  category, 
  onTodoUpdate, 
  focusedItemIndex = -1, 
  onItemClick,
  onKeyNavigation,
  categoryIndex = -1
}: TodoCategoryProps) {
  const [expanded, setExpanded] = React.useState(true);
  const categoryRef = useRef<HTMLDivElement>(null);
  const completedCount = category.todos.filter(todo => todo.completed).length;
  const totalCount = category.todos.length;
  
  // Ensure category is always expanded when it contains a focused item
  useEffect(() => {
    if (focusedItemIndex >= 0 && !expanded) {
      setExpanded(true);
    }
  }, [focusedItemIndex, expanded]);
  
  // Handle todo updates
  const handleTodoUpdate = (updatedTodo: TodoItemType) => {
    if (onTodoUpdate) {
      onTodoUpdate(updatedTodo);
    }
  };
  
  // Handle item navigation - just pass through to parent
  const handleItemNavigation = (direction: 'up' | 'down', index: number) => {
    if (onKeyNavigation) {
      onKeyNavigation(direction, index);
    }
  };
  
  // Handle keyboard events for the category header
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Space') {
      e.preventDefault();
      setExpanded(!expanded);
    }
  };
  
  // Function to get appropriate icon class based on category name
  const getIconClass = () => {
    const name = category.name.toLowerCase();
    if (name.includes('git')) return 'icon-git';
    if (name === 'other') return 'icon-other';
    return 'icon-project';
  };
  
  // Handle item clicks by calling the passed handler
  const handleItemClick = (index: number) => {
    if (onItemClick) {
      onItemClick(index);
    }
  };
  
  return (
    <div className={`hn-category`}>
      <div 
        className="hn-category-header"
        onClick={() => setExpanded(!expanded)}
        ref={categoryRef}
        tabIndex={-1} // Don't make header focusable with tab navigation
        onKeyDown={handleKeyDown}
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
                isFocused={focusedItemIndex === index}
                onKeyNavigation={handleItemNavigation}
                onClick={() => handleItemClick(index)}
                categoryIndex={categoryIndex}
                itemIndex={index}
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