'use client';

import React, { useRef, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { TodoCategory as TodoCategoryType, TodoItem as TodoItemType } from '../types';
import TodoItem from './TodoItem';
import NerdFontIcon from './NerdFontIcon';
import todoStore, { isStatusDoneLike } from '../store/todoStore';
import configStore from '../store/configStore';

interface TodoCategoryProps {
  category: TodoCategoryType;
  categoryIndex: number; // Index within the *original* categories list (passed from Todo.tsx)
  // This index should consistently refer to the main store's categories array for reliable data access.
}

const TodoCategory: React.FC<TodoCategoryProps> = observer(({
  category, 
  categoryIndex,
}) => {
  const [expanded, setExpanded] = useState(true);
  const categoryRef = useRef<HTMLDivElement>(null);
  
  const { focusedItem, setFocusedItem } = todoStore;
  const { config: appConfig } = configStore;
  
  const completedCount = category.todos.filter(todo => appConfig && isStatusDoneLike(todo.status, appConfig)).length;
  const totalCount = category.todos.length;
  
  const isAnyChildFocused = focusedItem.categoryIndex === categoryIndex;
  
  useEffect(() => {
    if (isAnyChildFocused && focusedItem.itemIndex !== -1 && !expanded) {
      setExpanded(true);
    }
  }, [isAnyChildFocused, focusedItem.itemIndex, expanded]);
  
  const handleItemClick = (itemIndexInOriginalCategory: number) => {
    setFocusedItem({ categoryIndex: categoryIndex, itemIndex: itemIndexInOriginalCategory });
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      setExpanded(!expanded);
    }
  };
  
  return (
    <div 
      className={`hn-category ${isAnyChildFocused && focusedItem.itemIndex !== -1 ? 'has-focus' : ''}`}
      ref={categoryRef}
    >
      <div 
        className="hn-category-header dark:border-neutral-700 dark:text-neutral-200 sticky top-0 bg-white dark:bg-neutral-900 z-10 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
        onKeyDown={handleKeyDown}
        role="button"
        aria-expanded={expanded}
        tabIndex={-1}
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
        <span className="ml-1 text-subtle-color dark:text-neutral-500 text-xs">
          {expanded ? '▼' : '►'}
        </span>
      </div>
      
      {expanded && (
        <div role="list" className="focus-within:outline-none">
          {category.todos.length > 0 ? (
            category.todos.map((todo, itemIndex) => {
              const isFocused = isAnyChildFocused && focusedItem.itemIndex === itemIndex;
              return (
                <TodoItem 
                  key={`${todo.location}-${itemIndex}-${category.name}`}
                  todo={todo} 
                  isFocused={isFocused}
                  onClick={() => handleItemClick(itemIndex)}
                  categoryIndex={categoryIndex}
                  itemIndex={itemIndex}
                  role="listitem"
                />
              );
            })
          ) : (
            <div className="text-center p-1 text-subtle-color dark:text-neutral-500 text-xs">
              No todos in this category
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default TodoCategory; 