'use client';

import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { TodoCategory as TodoCategoryType } from '../types';
import { fetchTodoData } from '../services/todoService';
import TodoCategory from './TodoCategory';
import TodoItem from './TodoItem';
import isEqual from 'lodash/isEqual'; // Import lodash for deep comparison
import NerdFontIcon from './NerdFontIcon';

export default function Todo() {
  const [categories, setCategories] = useState<TodoCategoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all'); // 'all', 'completed', 'active'
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [displayMode, setDisplayMode] = useState<'section' | 'tab'>('section'); // Add display mode state
  const [activeTabIndex, setActiveTabIndex] = useState(0); // Track the active tab
  const [focusedItem, setFocusedItem] = useState<{categoryIndex: number, itemIndex: number}>({
    categoryIndex: -1,
    itemIndex: -1
  });
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false); // New state for keyboard help visibility
  const searchInputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  async function loadData() {
    try {
      // Only show loading indicator on initial mount
      if (isInitialMount.current) {
        setLoading(true);
      }
      
      const newData = await fetchTodoData();
      
      // Compare new data with current data before setting state
      if (!isEqual(categories, newData)) {
          console.log("Data changed, updating state..."); // Debug log
          setCategories(newData);
          setLastUpdated(new Date());
          
          // Reset active tab index if categories change and the current one no longer exists
          if (activeTabIndex >= newData.length) {
            setActiveTabIndex(0);
          }
      } else {
           console.log("Data unchanged, skipping state update."); // Debug log
      }
      setError(null);
    } catch (err) {
      setError('Failed to load todo data. Please try again later.');
      console.error('Error loading todo data:', err);
    } finally {
      if (isInitialMount.current) {
        setLoading(false);
        isInitialMount.current = false; // Mark initial mount as complete
      }
    }
  }

  useEffect(() => {
    // Initial load
    loadData();
    
    // Set up polling interval
    intervalRef.current = setInterval(loadData, 5000);
    
    // Add global keyboard event listener
    window.addEventListener('keydown', handleGlobalKeyDown);
    
    // Clean up interval and event listener on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  // Helper function to get all todo items as a flat list
  const getAllTodoItems = () => {
    if (displayMode === 'tab') {
      // In tab mode, only items from active tab
      return filteredCategories[activeTabIndex]?.todos || [];
    } else {
      // In section mode, all items flattened
      return filteredCategories.flatMap(category => category.todos);
    }
  };

  // Handle global keyboard shortcuts
  const handleGlobalKeyDown = (e: KeyboardEvent<HTMLElement> | globalThis.KeyboardEvent) => {
    // Skip if in an input field (except for specific global shortcuts)
    const target = e.target as HTMLElement;
    const isInInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
    
    // Global shortcuts that work everywhere
    if (e.ctrlKey && e.key === '/') {
      // Ctrl+/ - Focus search input
      e.preventDefault();
      searchInputRef.current?.focus();
      return;
    }
    
    if (e.ctrlKey && e.key === 'r') {
      // Ctrl+R - Refresh data
      e.preventDefault();
      handleRefresh();
      return;
    }

    if (e.ctrlKey && e.key === 'm') {
      // Ctrl+M - Toggle display mode
      e.preventDefault();
      toggleDisplayMode();
      return;
    }
    
    // Skip other shortcuts if in input field
    if (isInInput) return;
    
    // Filter shortcuts (1, 2, 3) - These should also reset focus
    if (e.key === '1') {
      setFilter('all');
      setFocusedItem({ categoryIndex: -1, itemIndex: -1 });
    } else if (e.key === '2') {
      setFilter('active');
      setFocusedItem({ categoryIndex: -1, itemIndex: -1 });
    } else if (e.key === '3') {
      setFilter('completed');
      setFocusedItem({ categoryIndex: -1, itemIndex: -1 });
    }
    
    // Navigation shortcuts
    if (e.key === 'ArrowUp' || e.key === 'k') {
      e.preventDefault();
      navigateTodos('up');
    } else if (e.key === 'ArrowDown' || e.key === 'j') {
      e.preventDefault();
      navigateTodos('down');
    }
    
    // Tab navigation (in tab mode)
    if (displayMode === 'tab') {
      if (e.key === 'ArrowLeft' || e.key === 'h') {
        e.preventDefault();
        setActiveTabIndex(prev => Math.max(0, prev - 1));
        setFocusedItem({ categoryIndex: -1, itemIndex: -1 }); 
      } else if (e.key === 'ArrowRight' || e.key === 'l') {
        e.preventDefault();
        setActiveTabIndex(prev => Math.min(filteredCategories.length - 1, prev + 1));
        setFocusedItem({ categoryIndex: -1, itemIndex: -1 });
      }
    }
    
    // Escape key to blur focus
    if (e.key === 'Escape') {
      e.preventDefault();
      setFocusedItem({ categoryIndex: -1, itemIndex: -1 });
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  };

  // Helper function to navigate between todo items
  const navigateTodos = (direction: 'up' | 'down') => {
    const { categoryIndex, itemIndex } = focusedItem;
    
    if (displayMode === 'tab') {
      // In tab mode, navigation is within the active tab
      const todos = filteredCategories[activeTabIndex]?.todos || [];
      const totalItems = todos.length;
      
      // Nothing focused yet
      if (itemIndex === -1) {
        if (totalItems > 0) {
          setFocusedItem({
            categoryIndex: activeTabIndex,
            itemIndex: direction === 'up' ? totalItems - 1 : 0
          });
        }
        return;
      }
      
      // Moving up
      if (direction === 'up' && itemIndex > 0) {
        setFocusedItem({
          categoryIndex: activeTabIndex,
          itemIndex: itemIndex - 1
        });
      }
      // Moving down
      else if (direction === 'down' && itemIndex < totalItems - 1) {
        setFocusedItem({
          categoryIndex: activeTabIndex,
          itemIndex: itemIndex + 1
        });
      }
    } else {
      // In section mode, navigation is across all categories
      
      // Nothing focused yet
      if (categoryIndex === -1 || itemIndex === -1) {
        if (filteredCategories.length > 0) {
          if (direction === 'up') {
            // Focus last item of last category
            const lastCatIndex = filteredCategories.length - 1;
            const lastItemIndex = filteredCategories[lastCatIndex].todos.length - 1;
            setFocusedItem({
              categoryIndex: lastCatIndex,
              itemIndex: lastItemIndex
            });
          } else {
            // Focus first item of first category
            setFocusedItem({
              categoryIndex: 0,
              itemIndex: 0
            });
          }
        }
        return;
      }
      
      const currentCategoryTodos = filteredCategories[categoryIndex]?.todos || [];
      
      // Moving up
      if (direction === 'up') {
        if (itemIndex > 0) {
          // Move up within the same category
          setFocusedItem({
            categoryIndex,
            itemIndex: itemIndex - 1
          });
        } else if (categoryIndex > 0) {
          // Move to the last item of the previous category
          const prevCatIndex = categoryIndex - 1;
          const prevCatLastItemIndex = filteredCategories[prevCatIndex].todos.length - 1;
          setFocusedItem({
            categoryIndex: prevCatIndex,
            itemIndex: prevCatLastItemIndex
          });
        }
      }
      // Moving down
      else if (direction === 'down') {
        if (itemIndex < currentCategoryTodos.length - 1) {
          // Move down within the same category
          setFocusedItem({
            categoryIndex,
            itemIndex: itemIndex + 1
          });
        } else if (categoryIndex < filteredCategories.length - 1) {
          // Move to the first item of the next category
          setFocusedItem({
            categoryIndex: categoryIndex + 1,
            itemIndex: 0
          });
        }
      }
    }
  };

  const handleRefresh = () => {
    loadData(); // Trigger a manual data load
  };

  // Filter todos based on filter state and search query
  const filteredCategories = categories.map(category => {
    const filteredTodos = category.todos.filter(todo => {
      let matchesFilter = true;
      if (filter === 'completed') matchesFilter = todo.completed;
      if (filter === 'active') matchesFilter = !todo.completed;

      // If we have a search query, match against content or location
      const matchesSearch = !searchQuery || 
        todo.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        todo.location.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesFilter && matchesSearch;
    });

    return {
      ...category,
      todos: filteredTodos
    };
  }).filter(category => category.todos.length > 0);

  // Calculate total counts
  const totalTodos = categories.reduce((acc, category) => acc + category.todos.length, 0);
  const completedTodos = categories.reduce(
    (acc, category) => acc + category.todos.filter(todo => todo.completed).length,
    0
  );
  const activeTodos = totalTodos - completedTodos;

  // Handle todo updates from children components
  const handleTodoUpdate = (updatedTodo: TodoCategoryType['todos'][0]) => {
    // Create a deep copy of categories
    const updatedCategories = categories.map(category => {
      // Check if the updated todo belongs to this category
      const updatedTodos = category.todos.map(todo => {
        if (todo.location === updatedTodo.location) {
          return updatedTodo; // Replace with the updated todo
        }
        return todo;
      });
      
      return {
        ...category,
        todos: updatedTodos
      };
    });
    
    // Update the state with the new categories
    setCategories(updatedCategories);
    setLastUpdated(new Date());
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

  // Toggle between section and tab mode
  const toggleDisplayMode = () => {
    setDisplayMode(prev => prev === 'section' ? 'tab' : 'section');
  };

  // Handler for when a TodoItem is clicked
  const handleItemClick = (categoryIndex: number, localItemIndex: number) => {
    console.log(`Item clicked: cat=${categoryIndex}, local=${localItemIndex}`);
    
    // Set focus state to the exact clicked position
    setFocusedItem({
      categoryIndex,
      itemIndex: localItemIndex
    });

    // Focus the DOM element programmatically if needed
    // This ensures both visual focus and keyboard focus align
    const todoElement = document.querySelector(
      `[data-category-index="${categoryIndex}"][data-item-index="${localItemIndex}"]`
    );
    
    if (todoElement instanceof HTMLElement) {
      todoElement.focus();
    }
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
              return (
                <TodoItem 
                  key={`${todo.location}-${localIndex}`}
                  todo={todo} 
                  onEditSuccess={handleTodoUpdate}
                  isFocused={focusedItem.categoryIndex === activeTabIndex && focusedItem.itemIndex === localIndex}
                  onKeyNavigation={(direction) => handleTodoNavigation(direction, activeTabIndex, localIndex)}
                  onClick={() => handleItemClick(activeTabIndex, localIndex)}
                  categoryIndex={activeTabIndex}
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

  // Handle keyboard navigation requests from child components
  const handleTodoNavigation = (direction: 'up' | 'down', categoryIndex: number, localIndex: number) => {
    // First record the current position
    setFocusedItem({
      categoryIndex,
      itemIndex: localIndex
    });
    
    // Then navigate from there
    navigateTodos(direction);
  };

  // Helper function to display keyboard shortcuts
  const renderKeyboardShortcutsHelp = () => {
    if (!showKeyboardHelp) return null; // Only render if showKeyboardHelp is true
    
    return (
      <div className="fixed bottom-2 right-2 p-4 bg-white rounded shadow-lg text-xs z-50 border border-gray-300">
        <div className="flex justify-between items-center mb-2">
          <div className="font-bold">Keyboard Shortcuts</div>
          <button 
            onClick={() => setShowKeyboardHelp(false)}
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
          onClick={handleRefresh}
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
          onClick={() => setShowKeyboardHelp(prev => !prev)}
        >
          ⌨️
        </button>
      </div>
      
      {filteredCategories.length > 0 ? (
        displayMode === 'section' ? (
          filteredCategories.map((category, catIndex) => (
            <TodoCategory 
              key={catIndex} 
              category={category}
              categoryIndex={catIndex}
              onTodoUpdate={handleTodoUpdate}
              focusedItemIndex={focusedItem.categoryIndex === catIndex ? focusedItem.itemIndex : -1}
              onItemClick={(localItemIndex) => handleItemClick(catIndex, localItemIndex)}
              onKeyNavigation={(direction, localIndex) => handleTodoNavigation(direction, catIndex, localIndex)}
            />
          ))
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