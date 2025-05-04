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
  const itemsContainerRef = useRef<HTMLDivElement>(null);
  
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
  
  // Scroll category into view when it contains focused item
  useEffect(() => {
    if (isAnyChildFocused && focusedItem.itemIndex !== -1) {
      // Don't scroll the category header, let the TodoItem handle scrolling
      // The TodoItem's useEffect will take care of scrolling the item into view
      // Remove the categoryRef.current.scrollIntoView call
    }
  }, [isAnyChildFocused, focusedItem.itemIndex]);
  
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
      className={`hn-category ${isAnyChildFocused ? 'has-focus' : ''}`}
      ref={categoryRef}
    >
      <div 
        className="hn-category-header dark:border-gray-700 dark:text-gray-200 sticky top-0 bg-white dark:bg-gray-900 z-10"
        onClick={() => setExpanded(!expanded)}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        role="button"
        aria-expanded={expanded}
      >
        <NerdFontIcon 
          icon={category.icon} 
          category={category.name} 
          className="text-sm mr-1"
        />
        {category.name}
        <span className="ml-1 text-subtle-color dark:text-gray-500 text-xs">
          ({completedCount}/{totalCount})
        </span>
        <span className="ml-1 text-subtle-color dark:text-gray-500 text-xs">
          {expanded ? '▼' : '►'}
        </span>
      </div>
      
      {expanded && (
        <div ref={itemsContainerRef} role="list" className="focus-within:outline-none">
          {category.todos.length > 0 ? (
            category.todos.map((todo, index) => {
              // Determine if this specific item is focused
              const isFocused = isAnyChildFocused && focusedItem.itemIndex === index;
              return (
                <TodoItem 
                  key={`${todo.location}-${index}`} 
                  todo={todo} 
                  isFocused={isFocused}
                  onClick={() => handleItemClick(index)}
                  categoryIndex={categoryIndex}
                  originalCategoryIndex={originalCategoryIndex}
                  itemIndex={index}
                  role="listitem"
                />
              );
            })
          ) : (
            <div className="text-center p-1 text-subtle-color dark:text-gray-500 text-xs">
              No todos in this category
            </div>
          )}
        </div>
      )}
    </div>
  );
} 