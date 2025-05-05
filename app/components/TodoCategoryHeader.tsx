'use client';

import React from 'react';
import { TodoCategory } from '../types';
import NerdFontIcon from './NerdFontIcon';

interface TodoCategoryHeaderProps {
  category: TodoCategory;
}

// Simple, non-interactive header for virtualized list
export default function TodoCategoryHeader({ category }: TodoCategoryHeaderProps) {
  const completedCount = category.todos.filter(todo => todo.completed).length;
  const totalCount = category.todos.length;

  return (
    <div 
      className="hn-category-header dark:border-gray-700 dark:text-gray-200 sticky top-0 bg-white dark:bg-gray-900 z-10 border-b border-border-color dark:border-gray-700 px-1 py-1 flex items-center" // Simplified styling, removed interactive parts
      style={{ height: `${CATEGORY_HEADER_HEIGHT}px` }} // Ensure height matches constant
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
      {/* Removed expansion indicator ▼/► */}
    </div>
  );
}

// Make sure CATEGORY_HEADER_HEIGHT is defined or imported if used here
const CATEGORY_HEADER_HEIGHT = 30; 