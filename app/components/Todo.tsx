'use client';

import React, { useEffect, useRef, KeyboardEvent } from 'react';
import { useTodoStore, getFilteredCategories, useTodoSelectors } from '../store/todoStore';
import TodoCategory from './TodoCategory';
import TodoItem from './TodoItem';
import NerdFontIcon from './NerdFontIcon';
import { TodoItem as TodoItemType } from '../types';

export default function Todo() {
  // Use Zustand store 
  const categories = useTodoStore(state => state.categories);
  const loading = useTodoStore(state => state.loading);
  const error = useTodoStore(state => state.error);
  const filter = useTodoStore(state => state.filter);
  const searchQuery = useTodoStore(state => state.searchQuery);
  const lastUpdated = useTodoStore(state => state.lastUpdated);
  const displayMode = useTodoStore(state => state.displayMode);
  const activeTabIndex = useTodoStore(state => state.activeTabIndex);
  const focusedItem = useTodoStore(state => state.focusedItem);
  const showKeyboardHelp = useTodoStore(state => state.showKeyboardHelp);
  
  // Actions
  const loadData = useTodoStore(state => state.loadData);
  const setFilter = useTodoStore(state => state.setFilter);
  const setSearchQuery = useTodoStore(state => state.setSearchQuery);
  const toggleDisplayMode = useTodoStore(state => state.toggleDisplayMode);
  const setActiveTabIndex = useTodoStore(state => state.setActiveTabIndex);
  const setFocusedItem = useTodoStore(state => state.setFocusedItem);
  const toggleKeyboardHelp = useTodoStore(state => state.toggleKeyboardHelp);
  const navigateTodos = useTodoStore(state => state.navigateTodos);
  
  // Get counts using selector
  const { totalTodos, completedTodos, activeTodos } = useTodoSelectors.getTotalCounts(useTodoStore.getState());
  
  // Get filtered categories
  const filteredCategories = getFilteredCategories(useTodoStore.getState());

  const searchInputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initial load
    loadData();
    
    // Set up polling interval
    intervalRef.current = setInterval(loadData, 5000);
    
    // Clean up interval and event listener on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Helper function to get original category index
  const getOriginalCategoryIndex = (categoryName: string) => {
    return categories.findIndex(cat => cat.name === categoryName);
  };

  // Render tabs for tab mode
  const renderTabs = () => {
    return (
      <div>
        <div className="flex flex-wrap border-b border-border-color text-xs overflow-visible">
          {categories.map((category, index) => (
            <button
              key={index}
              className={`px-2 py-1 my-1 mr-1 font-medium ${
                activeTabIndex === index
                ? 'border-b-2 border-accent-color font-bold'
                : 'text-subtle-color'
              }`}
              onClick={() => setActiveTabIndex(index)}
            >
              <NerdFontIcon 
                icon={category.icon} 
                category={category.name} 
                className="text-sm"
              />
              {category.name}
              <span className="ml-1 text-subtle-color">
                ({category.todos.filter(todo => todo.completed).length}/{category.todos.length})
              </span>
            </button>
          ))}
        </div>
        
        {/* Display active tab content */}
        {filteredCategories.length > 0 && activeTabIndex < filteredCategories.length && (
          <div>
            {filteredCategories[activeTabIndex]?.todos.map((todo, localIndex) => {
              // Determine the original category index
              const originalCategoryIndex = getOriginalCategoryIndex(filteredCategories[activeTabIndex].name);
              const isFocused = focusedItem.categoryIndex === activeTabIndex && focusedItem.itemIndex === localIndex;
              
              return (
                <TodoItem
                  key={`${todo.location}-${localIndex}`}
                  todo={todo}
                  isFocused={isFocused}
                  onClick={() => setFocusedItem({ categoryIndex: activeTabIndex, itemIndex: localIndex })}
                  categoryIndex={activeTabIndex}
                  originalCategoryIndex={originalCategoryIndex}
                  itemIndex={localIndex}
                />
              );
            }) || (
              <div className="p-2 text-center text-subtle-color text-xs">
                No todos in this category
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Helper function to display keyboard shortcuts
  const renderKeyboardShortcutsHelp = () => {
    if (!showKeyboardHelp) return null;
    
    return (
      <div className="fixed bottom-2 right-2 p-4 bg-white rounded shadow-lg text-xs z-50 border border-gray-300">
        <div className="flex justify-between items-center mb-2">
          <div className="font-bold">Keyboard Shortcuts</div>
          <button 
            onClick={() => toggleKeyboardHelp()}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close shortcuts help"
          >
            ✕
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <div className="col-span-2 font-semibold mt-1">Navigation</div>
          <div><kbd>↑</kbd> / <kbd>k</kbd> Navigate up</div>
          <div><kbd>↓</kbd> / <kbd>j</kbd> Navigate down</div>
          <div><kbd>←</kbd> / <kbd>h</kbd> Previous tab</div>
          <div><kbd>→</kbd> / <kbd>l</kbd> Next tab</div>
          <div><kbd>Esc</kbd> Clear focus</div>
          
          <div className="col-span-2 font-semibold mt-1">Todo actions</div>
          <div><kbd>Space</kbd> Toggle completion</div>
          <div><kbd>Enter</kbd> Edit todo</div>
          
          <div className="col-span-2 font-semibold mt-1">Global</div>
          <div><kbd>Ctrl</kbd>+<kbd>/</kbd> Focus search</div>
          <div><kbd>Ctrl</kbd>+<kbd>R</kbd> Refresh data</div>
          <div><kbd>Ctrl</kbd>+<kbd>M</kbd> Toggle view mode</div>
          <div><kbd>1</kbd> Show all todos</div>
          <div><kbd>2</kbd> Show active todos</div>
          <div><kbd>3</kbd> Show completed todos</div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-24">
        <div className="animate-spin h-4 w-4 border-t-2 border-b-2 border-accent-color"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-2 text-xs">
        <strong>Error:</strong> {error}
      </div>
    );
  }

  return (
    <div className="hn-style group" tabIndex={-1} role="application" aria-label="Todo Application">
      <div className="hn-header">
        <h1 className="hn-title">Unitodo</h1>
        <span className="hn-meta">
          {totalTodos} tasks · {completedTodos} completed · {activeTodos} active
          {lastUpdated && (
            <span className="ml-2">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </span>
      </div>
      
      <div className="hn-compact-controls">
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search todos... (Ctrl+/)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="hn-search"
        />
        
        <button 
          className={`hn-filter-button ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
          title="All todos (1)"
        >
          All
        </button>
        <button 
          className={`hn-filter-button ${filter === 'active' ? 'active' : ''}`}
          onClick={() => setFilter('active')}
          title="Active todos (2)"
        >
          Active
        </button>
        <button 
          className={`hn-filter-button ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
          title="Completed todos (3)"
        >
          Completed
        </button>
        <button
          className="hn-filter-button"
          onClick={loadData}
          title="Refresh data (Ctrl+R)"
        >
          ↻
        </button>
        
        <button
          className={`hn-filter-button ${displayMode === 'tab' ? 'active' : ''}`}
          onClick={toggleDisplayMode}
          title={`Switch to ${displayMode === 'section' ? 'tab' : 'section'} mode (Ctrl+M)`}
        >
          {displayMode === 'section' ? '⊞' : '≡'}
        </button>
        
        <button
          className="hn-filter-button text-xs"
          title="Keyboard shortcuts"
          aria-label="Show keyboard shortcuts"
          onClick={toggleKeyboardHelp}
        >
          ⌨️
        </button>
      </div>
      
      {filteredCategories.length > 0 ? (
        displayMode === 'section' ? (
          filteredCategories.map((category, catIndex) => {
            // Get the original unfiltered index for this category
            const originalCategoryIndex = getOriginalCategoryIndex(category.name);
            return (
              <TodoCategory 
                key={catIndex} 
                category={category}
                categoryIndex={catIndex}
                originalCategoryIndex={originalCategoryIndex}
              />
            );
          })
        ) : (
          renderTabs()
        )
      ) : (
        <div className="text-center p-2 text-subtle-color text-xs">
          No todos found. Try changing your search or filter.
        </div>
      )}
      
      {/* Render keyboard help overlay at the end of the component */}
      {renderKeyboardShortcutsHelp()}
    </div>
  );
} 