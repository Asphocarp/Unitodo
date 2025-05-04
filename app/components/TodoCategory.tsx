'use client';

import React, { useRef, useEffect } from 'react';
import { TodoCategory as TodoCategoryType, TodoItem as TodoItemType } from '../types';
import TodoItem from './TodoItem';
import NerdFontIcon from './NerdFontIcon';
import { useTodoStore } from '../store/todoStore'; // Import Zustand store

interface TodoCategoryProps {
  category: TodoCategoryType;
  categoryIndex: number; // Index within the *filtered* list
  originalCategoryIndex: number; // Index within the *original* list
}

export default function TodoCategory({ 
  category, 
  categoryIndex,
  originalCategoryIndex
}: TodoCategoryProps) {
  const [expanded, setExpanded] = React.useState(true);
  const categoryRef = useRef<HTMLDivElement>(null);
  
  // Get necessary state and actions from Zustand store
  const focusedItem = useTodoStore(state => state.focusedItem);
  const setFocusedItem = useTodoStore(state => state.setFocusedItem);
  
  const completedCount = category.todos.filter(todo => todo.completed).length;
  const totalCount = category.todos.length;
  
  // Determine if any item within this category is currently focused
  const isAnyChildFocused = focusedItem.categoryIndex === categoryIndex;
  
  // Ensure category is always expanded when it contains a focused item
  useEffect(() => {
    if (isAnyChildFocused && focusedItem.itemIndex !== -1 && !expanded) {
      setExpanded(true);
    }
  }, [isAnyChildFocused, focusedItem.itemIndex, expanded]);
  
  // Handle item clicks - set focus in the store
  const handleItemClick = (itemIndex: number) => {
    setFocusedItem({ categoryIndex, itemIndex });
  };
  
  // Handle keyboard events for the category header (e.g., collapsing)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Space') {
      e.preventDefault();
      setExpanded(!expanded);
    }
    // Note: Item navigation (up/down) is now handled globally in Todo.tsx/store
  };
  
  return (
    <div 
      className={`hn-category ${isAnyChildFocused ? 'has-focus' : ''}`} // Optional: Add class if needed
      ref={categoryRef} // Ref might still be needed for other purposes
    >
      <div 
        className="hn-category-header"
        onClick={() => setExpanded(!expanded)}
        tabIndex={-1} // Header itself is not focusable via keyboard navigation
        onKeyDown={handleKeyDown}
        role="button" // Add role for accessibility
        aria-expanded={expanded}
        // Consider adding aria-controls pointing to the list of todos if applicable
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
        <div role="list"> {/* Add role for accessibility */}
          {category.todos.length > 0 ? (
            category.todos.map((todo, index) => {
              // Determine if this specific item is focused
              const isFocused = isAnyChildFocused && focusedItem.itemIndex === index;
              return (
                <TodoItem 
                  key={`${todo.location}-${index}`} 
                  todo={todo} 
                  isFocused={isFocused}
                  onClick={() => handleItemClick(index)} // Use internal handler to set store focus
                  categoryIndex={categoryIndex} // Pass filtered index
                  originalCategoryIndex={originalCategoryIndex} // Pass original index
                  itemIndex={index}
                  role="listitem" // Add role for accessibility
                />
              );
            })
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