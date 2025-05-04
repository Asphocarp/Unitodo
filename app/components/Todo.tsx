'use client';

import React, { useEffect, useRef, KeyboardEvent } from 'react';
import { useTodoStore, getFilteredCategories, useTodoSelectors } from '../store/todoStore';
import TodoCategory from './TodoCategory';
import TodoItem from './TodoItem';
import NerdFontIcon from './NerdFontIcon';
import { TodoItem as TodoItemType } from '../types'; // Import TodoItem type

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
  const updateTodo = useTodoStore(state => state.updateTodo);
  const navigateTodos = useTodoStore(state => state.navigateTodos);
  
  // Get counts using selector
  const { totalTodos, completedTodos, activeTodos } = useTodoSelectors.getTotalCounts(useTodoStore.getState());
  
  // Get filtered categories
  const filteredCategories = getFilteredCategories(useTodoStore.getState());

  const searchInputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Define the global keydown handler
  const handleGlobalKeyDown = (event: globalThis.KeyboardEvent) => {
    return;
    const { key, ctrlKey, metaKey, shiftKey, altKey } = event;
    console.log(`[handleGlobalKeyDown] Key pressed: ${key}, Ctrl: ${ctrlKey}, Meta: ${metaKey}, Shift: ${shiftKey}, Alt: ${altKey}`);

    const state = useTodoStore.getState(); // Get current state
    const { focusedItem, displayMode, activeTabIndex, categories } = state;
    const localFilteredCategories = getFilteredCategories(state); // Get filtered categories for context

    // Ignore key events if modifier keys (except Ctrl) are pressed,
    // or if the event originates from an input/textarea/select element
    if (metaKey || shiftKey || altKey) {
        console.log('[handleGlobalKeyDown] Ignoring due to Meta/Shift/Alt key.');
        return;
    }
    if ((event.target instanceof HTMLInputElement) ||
        (event.target instanceof HTMLTextAreaElement) ||
        (event.target instanceof HTMLSelectElement)) {
        console.log('[handleGlobalKeyDown] Ignoring due to input/textarea/select focus.');
        return;
    }

    let preventDefault = true; // Default to preventing default browser behavior

    // --- Global Shortcuts ---
    if (ctrlKey) {
        switch (key) {
            case '/':
                console.log('[handleGlobalKeyDown] Focusing search (Ctrl+/)');
                searchInputRef.current?.focus();
                break;
            case 'r':
                console.log('[handleGlobalKeyDown] Refreshing data (Ctrl+R)');
                loadData();
                break;
            case 'm':
                console.log('[handleGlobalKeyDown] Toggling display mode (Ctrl+M)');
                toggleDisplayMode();
                break;
            default:
                preventDefault = false; // Don't prevent default for unhandled Ctrl combinations
        }
    } else {
        // --- Navigation & Filtering ---
        switch (key) {
            // Navigation
            case 'k': // Up
            case 'ArrowUp':
                console.log('[handleGlobalKeyDown] Navigating up.');
                navigateTodos('up');
                break;
            case 'j': // Down
            case 'ArrowDown':
                console.log('[handleGlobalKeyDown] Navigating down.');
                // navigateTodos('down');
                break;
            case 'h': // Previous tab (Tab mode only)
            case 'ArrowLeft':
                if (displayMode === 'tab' && localFilteredCategories.length > 0) {
                    const prevIndex = (activeTabIndex - 1 + localFilteredCategories.length) % localFilteredCategories.length;
                    console.log(`[handleGlobalKeyDown] Navigating to previous tab: ${prevIndex}`);
                    setActiveTabIndex(prevIndex);
                } else {
                    preventDefault = false;
                }
                break;
            case 'l': // Next tab (Tab mode only)
            case 'ArrowRight':
                 if (displayMode === 'tab' && localFilteredCategories.length > 0) {
                    const nextIndex = (activeTabIndex + 1) % localFilteredCategories.length;
                    console.log(`[handleGlobalKeyDown] Navigating to next tab: ${nextIndex}`);
                    setActiveTabIndex(nextIndex);
                } else {
                    preventDefault = false;
                }
                break;
            case 'Escape':
                console.log('[handleGlobalKeyDown] Clearing focus (Escape).');
                setFocusedItem({ categoryIndex: -1, itemIndex: -1 });
                 // Also blur any active element to remove visual focus ring
                if (document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur();
                }
                break;

            // Filtering
            case '1':
                console.log('[handleGlobalKeyDown] Setting filter to All.');
                setFilter('all');
                break;
            case '2':
                console.log('[handleGlobalKeyDown] Setting filter to Active.');
                setFilter('active');
                break;
            case '3':
                console.log('[handleGlobalKeyDown] Setting filter to Completed.');
                setFilter('completed');
                break;

             // Help
             case '?':
                 console.log('[handleGlobalKeyDown] Toggling keyboard help.');
                toggleKeyboardHelp();
                break;

            // --- Focused Item Actions ---
            case ' ': // Toggle completion
                if (focusedItem.categoryIndex !== -1 && focusedItem.itemIndex !== -1) {
                    console.log('[handleGlobalKeyDown] Toggle completion action triggered for focused item:', focusedItem);
                    // Find the actual category and item based on the *current* view (filtered categories)
                    let targetTodo: TodoItemType | undefined;
                    let targetCategoryIndexInOriginal: number = -1; // Track the original category index

                    if (displayMode === 'tab') {
                        if (activeTabIndex < localFilteredCategories.length) {
                            const currentTabCategory = localFilteredCategories[activeTabIndex];
                            if (focusedItem.itemIndex < currentTabCategory.todos.length) {
                                targetTodo = currentTabCategory.todos[focusedItem.itemIndex];
                                // Find this category in the original unfiltered list
                                targetCategoryIndexInOriginal = categories.findIndex(cat => cat.name === currentTabCategory.name);
                            }
                        }
                    } else { // Section mode
                        if (focusedItem.categoryIndex < localFilteredCategories.length) {
                            const currentSectionCategory = localFilteredCategories[focusedItem.categoryIndex];
                            if (focusedItem.itemIndex < currentSectionCategory.todos.length) {
                                targetTodo = currentSectionCategory.todos[focusedItem.itemIndex];
                                // Find this category in the original unfiltered list
                                targetCategoryIndexInOriginal = categories.findIndex(cat => cat.name === currentSectionCategory.name);
                            }
                        }
                    }

                    if (targetTodo && targetCategoryIndexInOriginal !== -1) {
                        // Find the corresponding item in the original, unfiltered category list to ensure we update the correct one
                        const originalCategory = categories[targetCategoryIndexInOriginal];
                        const originalTodo = originalCategory.todos.find(t => t.location === targetTodo!.location);

                        if (originalTodo) {
                             // Call updateTodo with the original todo object, toggling its completed status
                             updateTodo({ ...originalTodo, completed: !originalTodo.completed });
                        } else {
                             console.warn("[handleGlobalKeyDown] Could not find the corresponding original todo for focused item:", targetTodo.location);
                             preventDefault = false;
                        }
                    } else {
                         console.warn("[handleGlobalKeyDown] Could not find targetTodo or targetCategoryIndexInOriginal based on focused item:", focusedItem, "Display mode:", displayMode, "Active tab:", activeTabIndex, "Filtered categories:", localFilteredCategories);
                         preventDefault = false;
                    }
                } else {
                    console.log('[handleGlobalKeyDown] Space pressed, but no item focused.');
                    preventDefault = false; // Don't prevent default if no item is focused (allow space scrolling)
                }
                break;
            // case 'Enter': // Edit todo - Placeholder for future implementation
            //     if (focusedItem.categoryIndex !== -1 && focusedItem.itemIndex !== -1) {
            //         console.log("Edit action triggered for:", focusedItem);
            //         // Add logic to initiate editing
            //     } else {
            //         preventDefault = false;
            //     }
            //     break;

            default:
                preventDefault = false; // Don't prevent default for other keys
        }
    }

    if (preventDefault) {
        console.log('[handleGlobalKeyDown] Preventing default browser behavior.');
        event.preventDefault();
    } else {
        console.log('[handleGlobalKeyDown] NOT preventing default browser behavior.');
    }
  };

  useEffect(() => {
    // Initial load
    loadData();
    
    // Set up polling interval
    intervalRef.current = setInterval(loadData, 5000);
    
    // Add global keyboard event listener
    // window.addEventListener('keydown', handleGlobalKeyDown);
    
    // Clean up interval and event listener on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    //   window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

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
              // Determine the original category index for data attributes
               const originalCategoryIndex = categories.findIndex(cat => cat.name === filteredCategories[activeTabIndex]?.name);
              return (
                <TodoItem
                  key={`${todo.location}-${localIndex}`}
                  todo={todo}
                  isFocused={focusedItem.categoryIndex === activeTabIndex && focusedItem.itemIndex === localIndex}
                  onKeyNavigation={(direction) => handleTodoNavigation(direction, activeTabIndex, localIndex)}
                  onClick={() => handleItemClick(activeTabIndex, localIndex)}
                  categoryIndex={originalCategoryIndex !== -1 ? originalCategoryIndex : activeTabIndex} // Use original index if found
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
    if (!showKeyboardHelp) return null; // Only render if showKeyboardHelp is true
    
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
          filteredCategories.map((category, catIndex) => (
            <TodoCategory 
              key={catIndex} 
              category={category}
              categoryIndex={catIndex}
              onTodoUpdate={updateTodo}
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