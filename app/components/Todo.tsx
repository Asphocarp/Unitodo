'use client';

import React, { useEffect, useRef, KeyboardEvent } from 'react';
import { useTodoStore, getFilteredCategories, useTodoSelectors } from '../store/todoStore';
import TodoCategory from './TodoCategory';
import TodoItem from './TodoItem';
import NerdFontIcon from './NerdFontIcon';
import { TodoItem as TodoItemType } from '../types';
import { useDarkMode } from '../utils/darkMode';
import { parseTodoContent } from '../utils';

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
  
  // Dark mode
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  
  // Actions
  const loadData = useTodoStore(state => state.loadData);
  const setFilter = useTodoStore(state => state.setFilter);
  const setSearchQuery = useTodoStore(state => state.setSearchQuery);
  const toggleDisplayMode = useTodoStore(state => state.toggleDisplayMode);
  const setActiveTabIndex = useTodoStore(state => state.setActiveTabIndex);
  const setFocusedItem = useTodoStore(state => state.setFocusedItem);
  const toggleKeyboardHelp = useTodoStore(state => state.toggleKeyboardHelp);
  const navigateTodos = useTodoStore(state => state.navigateTodos);
  const navigateTabs = useTodoStore(state => state.navigateTabs);
  
  // Get counts using selector
  const { totalTodos, completedTodos, activeTodos } = useTodoSelectors.getTotalCounts(useTodoStore.getState());
  
  // Get filtered categories
  const filteredCategories = getFilteredCategories(useTodoStore.getState());

  const searchInputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tabHeaderRef = useRef<HTMLDivElement>(null);
  const urlUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update scroll padding based on tab header height
  useEffect(() => {
    if (displayMode === 'tab' && tabHeaderRef.current) {
      const updateScrollPadding = () => {
        const tabHeaderHeight = tabHeaderRef.current?.offsetHeight || 0;
        // Add a small buffer (10px) to ensure content is fully visible
        document.documentElement.style.setProperty('--tab-header-height', `${tabHeaderHeight + 10}px`);
        document.documentElement.style.scrollPaddingTop = `${tabHeaderHeight + 10}px`;
      };
      
      // Initial update
      updateScrollPadding();
      
      // Update on window resize
      window.addEventListener('resize', updateScrollPadding);
      
      // Cleanup
      return () => {
        window.removeEventListener('resize', updateScrollPadding);
      };
    } else {
      // Reset when not in tab mode
      document.documentElement.style.removeProperty('--tab-header-height');
      document.documentElement.style.scrollPaddingTop = '';
    }
  }, [displayMode, categories.length, activeTabIndex, filter]);

  useEffect(() => {
    // Initial load
    loadData();
    
    // Set up polling interval
    intervalRef.current = setInterval(loadData, 500);
    
    // Add keyboard event listener for global navigation
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // Skip if we're inside an input element, contentEditable element, or textarea
      const isEditingContext = 
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement || 
        (e.target instanceof HTMLElement && e.target.getAttribute('contenteditable') === 'true') ||
        (e.target instanceof HTMLElement && e.target.closest('.editor-container')) ||
        (e.target instanceof HTMLElement && e.target.closest('[contenteditable="true"]'));
      
      // Only allow Ctrl/Cmd shortcuts when in editing contexts
      if (isEditingContext && e.key !== '?' && !(e.ctrlKey || e.metaKey)) {
        return;
      }
      
      // Skip if modifiers are pressed (except for specific combinations we want to allow)
      if (e.ctrlKey || e.metaKey || e.altKey) {
        // Exception for Ctrl+/ to focus search
        if (!(e.ctrlKey && e.key === '/')) {
          return;
        }
      }

      switch (e.key) {
        case 'h':
          if (!isEditingContext) {
            e.preventDefault();
            navigateTabs('left');
          }
          break;
        case 'l':
          if (!isEditingContext) {
            e.preventDefault();
            navigateTabs('right');
          }
          break;
        case 'd':
          if (!isEditingContext) {
            e.preventDefault();
            toggleDarkMode();
            // Refocus the main container after toggling theme
            if (containerRef.current) {
              // Use setTimeout to ensure focus happens after potential DOM updates
              setTimeout(() => {
                containerRef.current?.focus();
                // Optionally, refocus the previously focused item if applicable
                const { categoryIndex, itemIndex } = useTodoStore.getState().focusedItem;
                if (categoryIndex !== -1 && itemIndex !== -1) {
                  const itemSelector = `[data-category-index="${categoryIndex}"][data-item-index="${itemIndex}"]`;
                  const focusedElement = containerRef.current?.querySelector(itemSelector) as HTMLElement;
                  focusedElement?.focus();
                }
              }, 0);
            }
          }
          break;
        case '?':
          if (!isEditingContext) {
            e.preventDefault();
            toggleKeyboardHelp();
          }
          break;
        // Add cases for 1, 2, 3 to set filters
        case '1':
          if (!isEditingContext) {
            setFilter('all');
          }
          break;
        case '2':
          if (!isEditingContext) {
            setFilter('active');
          }
          break;
        case '3':
          if (!isEditingContext) {
            setFilter('completed');
          }
          break;
        // Add case for Ctrl+/ to focus search
        case '/':
          if (e.ctrlKey) {
            e.preventDefault();
            searchInputRef.current?.focus();
          }
          break;
        // Add case for Ctrl+R to refresh data
        case 'r':
          if (e.ctrlKey) {
            e.preventDefault();
            loadData();
          }
          break;
        // Add case for Ctrl+M to toggle display mode
        case 'm':
           if (e.ctrlKey) {
             e.preventDefault();
             toggleDisplayMode();
           }
           break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    // Clean up interval and event listener on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [loadData, navigateTabs, toggleDarkMode, toggleKeyboardHelp, toggleDisplayMode]);

  // Handle URL hash on initial load
  useEffect(() => {
    if (typeof window === 'undefined' || filteredCategories.length === 0) return;
    
    try {
      // Parse the URL hash
      const hash = window.location.hash.substring(1);
      if (!hash) return;
      
      const params = new URLSearchParams(hash);
      const tabName = params.get('tab');
      const itemId = params.get('item');
      
      // Ensure both tab and item are present
      if (!tabName || !itemId) return;
      
      // Find the category by name
      const categoryIndex = filteredCategories.findIndex(c => c.name === tabName);
      if (categoryIndex === -1) return;
      
      // Find the item by id or index
      let itemIndex = -1;
      
      // At this point we've confirmed itemId is not null, so we can assert the type
      const itemIdString = itemId as string;
      
      if (itemIdString.includes('index=')) {
        // Find by index
        const indexStr = itemIdString.replace('index=', '');
        itemIndex = parseInt(indexStr, 10);
      } else {
        // Find by unique ID
        itemIndex = filteredCategories[categoryIndex].todos.findIndex(todo => {
          const parsed = parseTodoContent(todo.content);
          return parsed.idPart === itemIdString;
        });
      }
      
      if (itemIndex === -1 || itemIndex >= filteredCategories[categoryIndex].todos.length) return;
      
      // Set the active tab and focused item
      setActiveTabIndex(categoryIndex);
      setFocusedItem({ categoryIndex, itemIndex });
      
    } catch (err) {
      console.error('Error handling URL hash:', err);
    }
  }, [filteredCategories, setActiveTabIndex, setFocusedItem]);

  // Helper function to get original category index
  const getOriginalCategoryIndex = (categoryName: string) => {
    return categories.findIndex(cat => cat.name === categoryName);
  };

  // Render tabs for tab mode
  const renderTabs = () => {
    return (
      <div className="relative">
        <div ref={tabHeaderRef} className="sticky top-0 z-10 bg-white dark:bg-gray-900 shadow-sm">
          <div className="flex flex-wrap border-b border-border-color dark:border-gray-700 text-xs overflow-visible">
            {categories.map((category, index) => (
              <button
                key={index}
                className={`px-2 py-1 my-1 mr-1 font-medium ${
                  activeTabIndex === index
                  ? 'border-b-2 border-accent-color font-bold dark:text-gray-200'
                  : 'text-subtle-color dark:text-gray-400'
                }`}
                onClick={() => setActiveTabIndex(index)}
              >
                <NerdFontIcon 
                  icon={category.icon} 
                  category={category.name} 
                  className="text-sm"
                />
                {category.name}
                <span className="ml-1 text-subtle-color dark:text-gray-500">
                  ({category.todos.filter(todo => todo.completed).length}/{category.todos.length})
                </span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Display active tab content */}
        {filteredCategories.length > 0 && activeTabIndex < filteredCategories.length && (
          <div 
            role="tabpanel" 
            className="focus-within:outline-none pt-2" 
            style={{ scrollMarginTop: 'var(--tab-header-height, 0px)' }}
          >
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
              <div className="p-2 text-center text-subtle-color dark:text-gray-500 text-xs">
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
      <div className="fixed bottom-2 right-2 p-4 bg-white dark:bg-gray-800 rounded shadow-lg text-xs z-50 border border-gray-300 dark:border-gray-600 dark:text-gray-200">
        <div className="flex justify-between items-center mb-2">
          <div className="font-bold">Keyboard Shortcuts</div>
          <button 
            onClick={() => toggleKeyboardHelp()}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close shortcuts help"
          >
            ✕
          </button>
        </div>
        <div className="italic text-gray-500 dark:text-gray-400 mb-2 text-xs">
          Note: Shortcuts only work when not editing text
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <div className="col-span-2 font-semibold mt-1">Navigation</div>
          <div><kbd className="dark:bg-gray-700 dark:border-gray-600">↑</kbd> / <kbd className="dark:bg-gray-700 dark:border-gray-600">k</kbd> Navigate up</div>
          <div><kbd className="dark:bg-gray-700 dark:border-gray-600">↓</kbd> / <kbd className="dark:bg-gray-700 dark:border-gray-600">j</kbd> Navigate down</div>
          <div><kbd className="dark:bg-gray-700 dark:border-gray-600">Shift</kbd>+<kbd className="dark:bg-gray-700 dark:border-gray-600">k</kbd> Navigate up 5 items</div>
          <div><kbd className="dark:bg-gray-700 dark:border-gray-600">Shift</kbd>+<kbd className="dark:bg-gray-700 dark:border-gray-600">j</kbd> Navigate down 5 items</div>
          <div><kbd className="dark:bg-gray-700 dark:border-gray-600">←</kbd> / <kbd className="dark:bg-gray-700 dark:border-gray-600">h</kbd> Previous tab</div>
          <div><kbd className="dark:bg-gray-700 dark:border-gray-600">→</kbd> / <kbd className="dark:bg-gray-700 dark:border-gray-600">l</kbd> Next tab</div>
          <div><kbd className="dark:bg-gray-700 dark:border-gray-600">Esc</kbd> Clear focus</div>
          
          <div className="col-span-2 font-semibold mt-1">Todo actions</div>
          <div><kbd className="dark:bg-gray-700 dark:border-gray-600">Space</kbd> Toggle completion</div>
          <div><kbd className="dark:bg-gray-700 dark:border-gray-600">i</kbd> Edit todo</div>
          <div><kbd className="dark:bg-gray-700 dark:border-gray-600">Enter</kbd> Open in VSCode</div>
          
          <div className="col-span-2 font-semibold mt-1">Global</div>
          <div><kbd className="dark:bg-gray-700 dark:border-gray-600">Ctrl</kbd>+<kbd className="dark:bg-gray-700 dark:border-gray-600">/</kbd> Focus search</div>
          <div><kbd className="dark:bg-gray-700 dark:border-gray-600">Ctrl</kbd>+<kbd className="dark:bg-gray-700 dark:border-gray-600">R</kbd> Refresh data</div>
          <div><kbd className="dark:bg-gray-700 dark:border-gray-600">Ctrl</kbd>+<kbd className="dark:bg-gray-700 dark:border-gray-600">M</kbd> Toggle view mode</div>
          <div><kbd className="dark:bg-gray-700 dark:border-gray-600">1</kbd> Show all todos</div>
          <div><kbd className="dark:bg-gray-700 dark:border-gray-600">2</kbd> Show active todos</div>
          <div><kbd className="dark:bg-gray-700 dark:border-gray-600">3</kbd> Show completed todos</div>
          <div><kbd className="dark:bg-gray-700 dark:border-gray-600">d</kbd> Toggle dark mode</div>
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
      <div className="bg-red-50 dark:bg-red-900 p-2 text-xs dark:text-red-100">
        <strong>Error:</strong> {error}
      </div>
    );
  }

  return (
    <div 
      className="hn-style group dark:bg-gray-900 dark:text-gray-100 focus:outline-none" 
      tabIndex={-1} // Make the main container focusable
      ref={containerRef} // Add ref to the main container
      role="application" 
      aria-label="Todo Application"
    >
      <div className="hn-header dark:border-gray-700">
        <h1 className="hn-title">Unitodo</h1>
        <span className="hn-meta dark:text-gray-400">
          {totalTodos} tasks · {completedTodos} completed · {activeTodos} active
          {lastUpdated && (
            <span className="ml-2">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </span>
      </div>
      
      <div className="hn-compact-controls dark:border-gray-700">
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search todos... (Ctrl+/)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="hn-search dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:placeholder-gray-500"
        />
        
        <button 
          className={`hn-filter-button ${filter === 'all' ? 'active' : ''} dark:hover:bg-gray-700 dark:text-gray-300`}
          onClick={() => setFilter('all')}
          title="All todos (1)"
        >
          All
        </button>
        <button 
          className={`hn-filter-button ${filter === 'active' ? 'active' : ''} dark:hover:bg-gray-700 dark:text-gray-300`}
          onClick={() => setFilter('active')}
          title="Active todos (2)"
        >
          Active
        </button>
        <button 
          className={`hn-filter-button ${filter === 'completed' ? 'active' : ''} dark:hover:bg-gray-700 dark:text-gray-300`}
          onClick={() => setFilter('completed')}
          title="Completed todos (3)"
        >
          Completed
        </button>
        <button
          className="hn-filter-button dark:hover:bg-gray-700 dark:text-gray-300"
          onClick={loadData}
          title="Refresh data (Ctrl+R)"
        >
          ↻
        </button>
        
        <button
          className={`hn-filter-button ${displayMode === 'tab' ? 'active' : ''} dark:hover:bg-gray-700 dark:text-gray-300`}
          onClick={toggleDisplayMode}
          title={`Switch to ${displayMode === 'section' ? 'tab' : 'section'} mode (Ctrl+M)`}
        >
          {displayMode === 'section' ? '⊞' : '≡'}
        </button>
        
        <button
          className="hn-filter-button text-xs dark:hover:bg-gray-700 dark:text-gray-300"
          title="Toggle dark mode"
          aria-label="Toggle dark mode"
          onClick={toggleDarkMode}
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
        
        <button
          className="hn-filter-button text-xs dark:hover:bg-gray-700 dark:text-gray-300"
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
        <div className="text-center p-2 text-subtle-color dark:text-gray-500 text-xs">
          No todos found. Try changing your search or filter.
        </div>
      )}
      
      {/* Render keyboard help overlay at the end of the component */}
      {renderKeyboardShortcutsHelp()}
    </div>
  );
} 