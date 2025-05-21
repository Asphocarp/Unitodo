import React from 'react';
import { observer } from 'mobx-react-lite';
import { TodoCategory } from '../types';
import NerdFontIcon from './NerdFontIcon';
import configStore from '../store/configStore'; // Import MobX configStore
import { isStatusDoneLike } from '../store/todoStore'; // Import helper

interface TodoCategoryHeaderProps {
  category: TodoCategory;
}

const CATEGORY_HEADER_HEIGHT = 30; // Keep this if it's used for layout calculations elsewhere or here

// Wrap with observer to react to configStore.config changes if necessary for isStatusDoneLike
const TodoCategoryHeader: React.FC<TodoCategoryHeaderProps> = observer(({ category }) => {
  const { config: appConfig } = configStore;
  
  // Calculate completedCount based on status and appConfig
  const completedCount = category.todos.filter(todo => appConfig && isStatusDoneLike(todo.status, appConfig)).length;
  const totalCount = category.todos.length;

  return (
    <div 
      className="hn-category-header dark:border-neutral-700 dark:text-neutral-200 sticky top-0 bg-white dark:bg-neutral-900 z-10 border-b border-border-color px-1 py-1 flex items-center"
      style={{ height: `${CATEGORY_HEADER_HEIGHT}px` }} 
    >
      <NerdFontIcon 
        icon={category.icon} 
        category={category.name} 
        className="text-sm mr-1"
      />
      {category.name}
      <span className="ml-1 text-subtle-color dark:text-neutral-500 text-xs">
        ({completedCount}/{totalCount})
      </span>
      {/* Expansion indicator removed as this is a non-interactive header for virtual lists */}
    </div>
  );
});

export default TodoCategoryHeader; 