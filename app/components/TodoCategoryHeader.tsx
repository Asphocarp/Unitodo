import React from 'react';
import { TodoCategory } from '../types';
import NerdFontIcon from './NerdFontIcon';
import todoStore from '../store/todoStore'; // Import MobX store
import { observer } from 'mobx-react-lite'; // Import observer

interface TodoCategoryHeaderProps {
  category: TodoCategory;
}

// Simple, non-interactive header for virtualized list
function TodoCategoryHeader({ category }: TodoCategoryHeaderProps) { // Changed for observer
  const { filteredCategoryInfo } = todoStore; // Access MobX store

  // Get counts from filteredCategoryInfo if available, otherwise calculate manually as fallback
  const currentCategoryInfo = filteredCategoryInfo.find(info => info.name === category.name);
  const completedCount = currentCategoryInfo 
    ? (currentCategoryInfo.totalCount - currentCategoryInfo.count) // Assuming count is active items
    : category.todos.filter(todo => todoStore.isStatusDoneLike(todo.status)).length; // Fallback
  const totalCount = currentCategoryInfo 
    ? currentCategoryInfo.totalCount 
    : category.todos.length;

  return (
    <div 
      className="hn-category-header dark:border-neutral-700 dark:text-neutral-200 sticky top-0 bg-white dark:bg-neutral-900 z-10 border-b border-border-color px-1 py-1 flex items-center" // Simplified styling, removed interactive parts
      style={{ height: `${CATEGORY_HEADER_HEIGHT}px` }} // Ensure height matches constant
    >
      <NerdFontIcon 
        icon={category.icon} 
        category={category.name} 
        className="text-sm mr-1"
      />
      {category.name}
      <span className="ml-1 text-subtle-color dark:text-neutral-500 text-xs">
        ({completedCount}/{totalCount}) {/* Counts now derived using MobX store info */}
      </span>
      {/* Removed expansion indicator ▼/► */}
    </div>
  );
}

// Make sure CATEGORY_HEADER_HEIGHT is defined or imported if used here
const CATEGORY_HEADER_HEIGHT = 30;

export default observer(TodoCategoryHeader); // Wrap with observer