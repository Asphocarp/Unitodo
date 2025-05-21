'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { FixedSizeList, VariableSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import todoStore from '../store/todoStore'; // MobX store
import configStore from '../store/configStore'; // MobX store
import { observer } from 'mobx-react-lite'; // MobX observer
// Removed: useTodoStore, useTodoSelectors, isStatusDoneLike, useConfigStore
import TodoCategory from './TodoCategory';
import TodoCategoryHeader from './TodoCategoryHeader';
import TodoItem from './TodoItem';
import NerdFontIcon from './NerdFontIcon';
import TodoTable, { TodoTableRow } from './TodoTable';
import { TodoItem as TodoItemType, TodoCategory as TodoCategoryType } from '../types';
import { useDarkMode } from '../utils/darkMode';
import { parseTodoContent, decodeTimestampId } from '../utils';
import Link from 'next/link';
import AddTodoModal from './AddTodoModal';

const ITEM_HEIGHT = 24;
const CATEGORY_HEADER_HEIGHT = 30;

interface FlatHeaderItem {
  type: 'header';
  category: TodoCategoryType;
  categoryIndex: number;
  flatIndex: number;
}

interface FlatTodoItem {
  type: 'item';
  todo: TodoItemType;
  categoryIndex: number;
  itemIndex: number;
  flatIndex: number;
}

type FlatListItem = FlatHeaderItem | FlatTodoItem;

function Todo() { // Changed to function declaration for observer
  const { 
    categories, 
    loading, 
    error, 
    filter, 
    searchQuery, 
    lastFetched: lastUpdated, 
    displayMode, 
    activeTabIndex, 
    focusedItem, 
    showKeyboardHelp,
    showAddTodoModal,
    addTodoModalData,
    loadData,
    setFilter,
    setSearchQuery,
    toggleDisplayMode,
    setActiveTabIndex,
    setFocusedItem,
    toggleKeyboardHelp,
    navigateTodos,
    navigateTabs,
    openAddTodoModal,
    closeAddTodoModal,
    submitAddTodo,
    // Computed properties from todoStore directly
    totalCounts, 
    filteredCategories,
    globallySortedAndFilteredTodos
  } = todoStore;

  const { isDarkMode, toggleDarkMode } = useDarkMode();
  
  // const showCompleted = filter === 'all' || filter === 'closed'; // This logic is now internal to computed properties in todoStore

  const searchInputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tabHeaderRef = useRef<HTMLDivElement>(null);
  const urlUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tabListRef = useRef<FixedSizeList>(null);
  const sectionListRef = useRef<VariableSizeList>(null);

  const { config: appConfig, loadActiveProfileAndConfig: loadAppConfig, initialConfigLoaded } = configStore; // Use MobX configStore

  const flattenedList = useMemo((): FlatListItem[] => {
    if (todoStore.displayMode !== 'section') return []; // Use todoStore.displayMode

    const flatList: FlatListItem[] = [];
    let currentFlatIndex = 0;
    // Use todoStore.filteredCategories directly as it's computed
    todoStore.filteredCategories.forEach((category: TodoCategoryType, catIndex: number) => {
      flatList.push({
        type: 'header',
        category: category,
        categoryIndex: catIndex,
        flatIndex: currentFlatIndex++
      });
      category.todos.forEach((todo: TodoItemType, itemIndex: number) => {
        flatList.push({
          type: 'item',
          todo: todo,
          categoryIndex: catIndex,
          itemIndex: itemIndex,
          flatIndex: currentFlatIndex++
        });
      });
    });
    return flatList;
  }, [todoStore.filteredCategories, todoStore.displayMode]);

  const tableDisplayData = useMemo((): TodoTableRow[] => {
    if (todoStore.displayMode !== 'table') return [];
    // Use todoStore.globallySortedAndFilteredTodos directly
    const sortedItems = todoStore.globallySortedAndFilteredTodos; 
    const originalStoreCategories = todoStore.categories; // Access categories from todoStore

    return sortedItems.map(item => {
      const { content, location, status, originalCategoryIndex, originalItemIndex } = item;

      
      let fullPath = location || '';
      let lineNumberStr = '';
      const lineMatch = location?.match(/\:(\d+)$/);
      if (lineMatch) {
        lineNumberStr = lineMatch[1];
        fullPath = location.replace(/\:\d+$/, '');
      }
      const basename = fullPath.split(/[\/\\]/).pop() || fullPath || 'N/A';
      
      let createdTimestamp: string | null = null;
      if (parsed.idPart && parsed.idPart.startsWith('@')) {
        const dateObj = decodeTimestampId(parsed.idPart.substring(1));
        createdTimestamp = dateObj ? dateObj.toISOString() : null;
      }
      
      let completedTimestamp: string | null = null;
      if (parsed.donePart && parsed.donePart.startsWith('@@')) {
        const dateObj = decodeTimestampId(parsed.donePart.substring(2));
        completedTimestamp = dateObj ? dateObj.toISOString() : null;
      }

      return {
        id: (location || 'loc') + (parsed.idPart || 'id') + originalCategoryIndex + '-' + originalItemIndex,
        content: content,
        parsedContent: parsed,
        zone: originalStoreCategories[originalCategoryIndex]?.name || 'Unknown',
        filePath: basename,
        lineNumber: lineNumberStr,
        created: createdTimestamp,
        finished: completedTimestamp,
        estDuration: null,
        originalTodo: item,
        categoryIndex: originalCategoryIndex,
        itemIndex: originalItemIndex,
      };
    });
  }, [todoStore.displayMode, todoStore.categories, todoStore.globallySortedAndFilteredTodos, todoStore.filter, todoStore.searchQuery]);

  const getItemSize = (index: number): number => {
    const item = flattenedList[index];
    return item?.type === 'header' ? CATEGORY_HEADER_HEIGHT : ITEM_HEIGHT;
  };

  const getFlatIndex = (targetCategoryIndex: number, targetItemIndex: number): number => {
    const foundItem = flattenedList.find(item => 
        item.type === 'item' && 
        item.categoryIndex === targetCategoryIndex && 
        item.itemIndex === targetItemIndex
    );
    return foundItem ? foundItem.flatIndex : -1;
  };

  useEffect(() => {
    if (todoStore.displayMode === 'tab' && tabHeaderRef.current) { // Use todoStore.displayMode
      const updateScrollPadding = () => {
        const tabHeaderHeight = tabHeaderRef.current?.offsetHeight || 0;
        document.documentElement.style.setProperty('--tab-header-height', `${tabHeaderHeight + 10}px`);
        document.documentElement.style.scrollPaddingTop = `${tabHeaderHeight + 10}px`;
      };
      
      updateScrollPadding();
      
      window.addEventListener('resize', updateScrollPadding);
      
      return () => {
        window.removeEventListener('resize', updateScrollPadding);
      };
    } else {
      document.documentElement.style.removeProperty('--tab-header-height');
      document.documentElement.style.scrollPaddingTop = '';
    }
  }, [todoStore.displayMode, todoStore.categories.length, todoStore.activeTabIndex, todoStore.filter]); // Depend on todoStore properties

  useEffect(() => {
    todoStore.loadData(); // Call MobX action
    if (!configStore.initialConfigLoaded) { // Use MobX configStore
        configStore.loadActiveProfileAndConfig(); // Call MobX action
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (configStore.config?.refresh_interval && configStore.config.refresh_interval > 0) { // Use MobX configStore
        console.log(`Setting refresh interval to ${configStore.config.refresh_interval}ms`);
        intervalRef.current = setInterval(todoStore.loadData, configStore.config.refresh_interval); // Call MobX action
    } else {
        console.log("Refresh interval not set or invalid, disabling auto-refresh.");
    }

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      const isEditingContext = 
        (e.target instanceof HTMLInputElement && e.target !== searchInputRef.current) ||
        e.target instanceof HTMLTextAreaElement || 
        (e.target instanceof HTMLElement && e.target.getAttribute('contenteditable') === 'true') ||
        (e.target instanceof HTMLElement && e.target.closest('.editor-container')) ||
        (e.target instanceof HTMLElement && e.target.closest('[contenteditable="true"]'));
      
      if (e.target === searchInputRef.current) {
        if (e.key === 'Enter') {
          e.preventDefault();
          searchInputRef.current?.blur();
          // Access state directly from todoStore
          const currentFocusedItem = todoStore.focusedItem;
          const currentDisplayMode = todoStore.displayMode;
          const currentActiveTabIndex = todoStore.activeTabIndex;
          const currentFilteredCategories = todoStore.filteredCategories; // Use computed property

          let newFocusCategoryIndex = -1;
          let newFocusItemIndex = -1;
          if (currentDisplayMode === 'tab') {
            if (currentFilteredCategories[currentActiveTabIndex]?.todos.length > 0) {
              newFocusCategoryIndex = currentActiveTabIndex;
              newFocusItemIndex = 0;
            }
          } else { // Section or Table mode (table mode also uses flattenedList logic for first item)
            if (flattenedList.length > 0) {
              const firstItem = flattenedList.find(item => item.type === 'item') as FlatTodoItem | undefined;
              if (firstItem) {
                newFocusCategoryIndex = firstItem.categoryIndex;
                newFocusItemIndex = firstItem.itemIndex;
              }
            }
          }

          if (newFocusCategoryIndex !== -1 && newFocusItemIndex !== -1) {
            todoStore.setFocusedItem({ categoryIndex: newFocusCategoryIndex, itemIndex: newFocusItemIndex }); // Call MobX action
            setTimeout(() => {
              const itemSelector = `[data-category-index="${newFocusCategoryIndex}"][data-item-index="${newFocusItemIndex}"] .todo-item-main-content`;
              const focusedElement = containerRef.current?.querySelector(itemSelector) as HTMLElement;
              focusedElement?.focus();
            }, 0);
          } else {
            containerRef.current?.focus();
          }
          return;
        }
        return;
      }
      
      if (isEditingContext && e.key !== '?' && !(e.ctrlKey || e.metaKey)) {
        return;
      }
      
      if (e.ctrlKey || e.metaKey || e.altKey) {
        if (!(e.ctrlKey && e.key === '/')) {
          return;
        }
      }

      switch (e.key) {
        case 'h':
          if (!isEditingContext) {
            e.preventDefault();
            todoStore.navigateTabs('left'); // Call MobX action
          }
          break;
        case 'l':
          if (!isEditingContext) {
            e.preventDefault();
            todoStore.navigateTabs('right'); // Call MobX action
          }
          break;
        case 'd':
          if (!isEditingContext) {
            e.preventDefault();
            toggleDarkMode();
            if (containerRef.current) {
              setTimeout(() => {
                containerRef.current?.focus();
                const { categoryIndex, itemIndex } = todoStore.focusedItem; // Access state from todoStore
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
            todoStore.toggleKeyboardHelp(); // Call MobX action
          }
          break;
        case '1':
          if (!isEditingContext) {
            todoStore.setFilter('all'); // Call MobX action
          }
          break;
        case '2':
          if (!isEditingContext) {
            todoStore.setFilter('active'); // Call MobX action
          }
          break;
        case '3':
          if (!isEditingContext) {
            todoStore.setFilter('closed'); // Call MobX action
          }
          break;
        case '/':
          if (e.ctrlKey) {
            e.preventDefault();
            searchInputRef.current?.focus();
          } else if (!isEditingContext) {
            e.preventDefault();
            searchInputRef.current?.focus();
          }
          break;
        case 'r':
          if (e.ctrlKey) {
            e.preventDefault();
            todoStore.loadData(); // Call MobX action
          }
          break;
        case 'm':
           if (!isEditingContext) {
             e.preventDefault();
             todoStore.toggleDisplayMode(); // Call MobX action
           }
           break;
        case 'o':
          if (!isEditingContext) {
            e.preventDefault();
            // Access state directly from todoStore
            const currentFocusedItem = todoStore.focusedItem;
            const currentCategories = todoStore.filteredCategories; // Use computed property
            const currentDisplayMode = todoStore.displayMode;
            const currentActiveTabIndex = todoStore.activeTabIndex;

            let categoryType: 'git' | 'project';
            let categoryName: string;
            let exampleItemLocation: string | undefined = undefined;
            if (currentDisplayMode === 'tab') {
                if (currentActiveTabIndex >= 0 && currentActiveTabIndex < currentCategories.length) {
                    const activeCategory = currentCategories[currentActiveTabIndex];
                    categoryName = activeCategory.name;
                    if (activeCategory.icon === "󰊢") {
                        categoryType = 'git';
                        if (activeCategory.todos.length > 0) {
                            exampleItemLocation = activeCategory.todos[0].location;
                        }
                    } else if (activeCategory.icon === "") {
                        categoryType = 'project';
                    } else {
                        alert('Cannot add TODO to "Other" category directly. Please define it as a project or add to a git repo file.'); // UNITODO_IGNORE_LINE
                        return;
                    }
                } else {
                    alert('No active tab selected to add TODO to.'); // UNITODO_IGNORE_LINE
                    return;
                }
            } else { // Section or Table mode
                if (currentFocusedItem.categoryIndex !== -1 && currentFocusedItem.categoryIndex < currentCategories.length) {
                    const focusedCategory = currentCategories[currentFocusedItem.categoryIndex];
                    categoryName = focusedCategory.name;
                    if (focusedCategory.icon === "󰊢") {
                        categoryType = 'git';
                        if (focusedCategory.todos.length > 0) {
                            const itemToUse = focusedCategory.todos[currentFocusedItem.itemIndex] || focusedCategory.todos[0];
                            exampleItemLocation = itemToUse?.location;
                        }
                    } else if (focusedCategory.icon === "") {
                        categoryType = 'project';
                    } else {
                        alert('Cannot add TODO to "Other" category directly.'); // UNITODO_IGNORE_LINE
                        return;
                    }
                } else {
                    alert('No section/item focused to determine where to add TODO.'); // UNITODO_IGNORE_LINE
                    return;
                }
            }
            todoStore.openAddTodoModal(categoryType, categoryName, exampleItemLocation); // Call MobX action
          }
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [configStore.config, configStore.initialConfigLoaded, todoStore.loadData, todoStore.navigateTabs, toggleDarkMode, todoStore.toggleKeyboardHelp, todoStore.toggleDisplayMode, todoStore.openAddTodoModal]); // Add MobX store actions/state to dependency array

  useEffect(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      // Access state directly from todoStore
      const currentFocusedItem = todoStore.focusedItem;
      const currentDisplayMode = todoStore.displayMode;
      const { categoryIndex, itemIndex } = currentFocusedItem;

      if (categoryIndex === -1 || itemIndex === -1) return;

      if (searchInputRef.current && document.activeElement === searchInputRef.current) {
        return;
      }

      if (currentDisplayMode === 'tab' && tabListRef.current) {
        tabListRef.current.scrollToItem(itemIndex, 'smart');
      } else if (currentDisplayMode === 'section' && sectionListRef.current) {
        const flatIndex = getFlatIndex(categoryIndex, itemIndex); // getFlatIndex now uses flattenedList (derived from todoStore.filteredCategories)
        if (flatIndex !== -1) {
          sectionListRef.current.scrollToItem(flatIndex, 'smart');
        }
      }
    }, 50);
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [todoStore.focusedItem, todoStore.displayMode, flattenedList]); // Depend on todoStore properties and flattenedList

  useEffect(() => {
    if (typeof window === 'undefined' || todoStore.filteredCategories.length === 0) return; // Use todoStore.filteredCategories
    
    try {
      const hash = window.location.hash.substring(1);
      if (!hash) return;
      
      const params = new URLSearchParams(hash);
      const tabName = params.get('tab');
      const itemId = params.get('item');
      
      if (!tabName || !itemId) return;
      
      const categoryIndex = todoStore.filteredCategories.findIndex((c: TodoCategoryType) => c.name === tabName); // Use todoStore.filteredCategories
      if (categoryIndex === -1) return;
      
      let itemIndex = -1;
      
      const itemIdString = itemId as string;
      
      if (itemIdString.includes('index=')) {
        const indexStr = itemIdString.replace('index=', '');
        itemIndex = parseInt(indexStr, 10);
      } else {
        itemIndex = todoStore.filteredCategories[categoryIndex].todos.findIndex((todo: TodoItemType) => { // Use todoStore.filteredCategories
          const parsed = parseTodoContent(todo.content);
          return parsed.idPart === itemIdString;
        });
      }
      
      if (itemIndex === -1 || itemIndex >= todoStore.filteredCategories[categoryIndex].todos.length) return; // Use todoStore.filteredCategories
      
      todoStore.setActiveTabIndex(categoryIndex); // Call MobX action
      todoStore.setFocusedItem({ categoryIndex, itemIndex }); // Call MobX action
      
    } catch (err) {
      console.error('Error handling URL hash:', err);
    }
  }, [todoStore.filteredCategories, todoStore.setActiveTabIndex, todoStore.setFocusedItem]); // Depend on todoStore properties/actions

  const getOriginalCategoryIndex = (categoryName: string) => {
    return todoStore.categories.findIndex(cat => cat.name === categoryName); // Use todoStore.categories
  };

  const renderTabs = () => {
    const activeCategoryData = todoStore.filteredCategories[todoStore.activeTabIndex]; // Use todoStore properties
    const itemCount = activeCategoryData?.todos.length || 0;

    const TabRow = ({ index, style }: { index: number, style: React.CSSProperties }) => {
      if (!activeCategoryData) return null;
      const todo = activeCategoryData.todos[index];
      
      const searchInputIsActive = !!(searchInputRef.current && document.activeElement === searchInputRef.current);
      const isFocused = !searchInputIsActive && todoStore.focusedItem.categoryIndex === todoStore.activeTabIndex && todoStore.focusedItem.itemIndex === index; // Use todoStore properties

      return (
        <div style={style}>
          <TodoItem
            key={`${todo.location}-${index}`}
            todo={todo}
            isFocused={isFocused}
            onClick={() => todoStore.setFocusedItem({ categoryIndex: todoStore.activeTabIndex, itemIndex: index })} // Call MobX action
            categoryIndex={todoStore.activeTabIndex} // Use todoStore property
            itemIndex={index}
          />
        </div>
      );
    };

    return (
      <div className="relative flex flex-col flex-grow min-h-0">
        <div ref={tabHeaderRef} className="sticky top-0 z-10 bg-white dark:bg-neutral-900 shadow-sm flex-shrink-0">
          <div className="flex flex-wrap border-b border-border-color dark:border-neutral-700 text-xs overflow-visible">
            {todoStore.categories.map((category, index) => { // Use todoStore.categories
              // Get counts from filteredCategoryInfo for the current original category index
              const categoryInfo = todoStore.filteredCategoryInfo.find(ci => ci.name === category.name);
              const displayCount = categoryInfo ? categoryInfo.count : 0;
              const displayTotalCount = categoryInfo ? categoryInfo.totalCount : 0;

              return (
                <button
                  key={index}
                  className={`px-2 py-1 my-1 mr-1 font-medium ${
                    todoStore.activeTabIndex === index // Use todoStore property
                    ? 'border-b-2 border-accent-color font-bold dark:text-neutral-200'
                    : 'text-subtle-color dark:text-neutral-400'
                  }`}
                  onClick={() => {
                    todoStore.setActiveTabIndex(index); // Call MobX action
                    if (tabListRef.current) {
                      tabListRef.current.scrollToItem(0);
                    }
                  }}
                >
                  <NerdFontIcon
                    icon={category.icon}
                    category={category.name}
                    className="text-sm"
                  />
                  {category.name}
                  <span className="ml-1 text-subtle-color dark:text-neutral-500">
                    ({displayCount}/{displayTotalCount})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-grow min-h-0">
          {itemCount > 0 ? (
            <AutoSizer>
              {({ height, width }) => (
                <FixedSizeList
                  ref={tabListRef}
                  height={height}
                  itemCount={itemCount}
                  itemSize={ITEM_HEIGHT}
                  width={width}
                  className="focus-within:outline-none pt-2"
                  style={{ scrollMarginTop: 'var(--tab-header-height, 0px)' }}
                >
                  {TabRow}
                </FixedSizeList>
              )}
            </AutoSizer>
          ) : (
            <div className="p-2 text-center text-subtle-color dark:text-neutral-500 text-xs">
              No todos in this category
            </div>
          )}
        </div>
      </div>
    );
  };

  const SectionRow = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = flattenedList[index]; // flattenedList is derived from todoStore.filteredCategories
    if (!item) return null;

    if (item.type === 'header') {
      return (
        <div style={style}>
          <TodoCategoryHeader category={item.category} />
        </div>
      );
    }
    
    if (item.type === 'item') {
        const searchInputIsActive = !!(searchInputRef.current && document.activeElement === searchInputRef.current);
        const isFocused = !searchInputIsActive && todoStore.focusedItem.categoryIndex === item.categoryIndex && todoStore.focusedItem.itemIndex === item.itemIndex; // Use todoStore.focusedItem
        return (
            <div style={style}>
                <TodoItem
                    key={`${item.todo.location}-${item.itemIndex}`}
                    todo={item.todo}
                    isFocused={isFocused}
                    onClick={() => todoStore.setFocusedItem({ categoryIndex: item.categoryIndex, itemIndex: item.itemIndex })} // Call MobX action
                    categoryIndex={item.categoryIndex}
                    itemIndex={item.itemIndex}
                />
            </div>
        );
    }

    return null;
  };

  if (todoStore.error) { // Use todoStore.error
    return (
      <div className="bg-red-50 dark:bg-red-900 p-2 text-xs dark:text-red-100">
        <strong>Error:</strong> {todoStore.error} {/* Use todoStore.error */}
      </div>
    );
  }

  return (
    <div
      className="p-4 group dark:bg-neutral-900 dark:text-neutral-100 focus:outline-none flex flex-col min-h-screen"
      tabIndex={-1}
      ref={containerRef}
      role="application"
      aria-label="Todo Application"
    >
      {/* {todoStore.loading && ( // Use todoStore.loading
        <div className="fixed bottom-4 right-4 z-50 p-2 bg-neutral-100 dark:bg-neutral-700 rounded-full shadow-lg">
          <div className="animate-spin h-5 w-5 border-2 border-t-transparent border-accent-color rounded-full"></div>
        </div>
      )} */}

      <div className="hn-header dark:border-neutral-700 flex-shrink-0 flex justify-between" data-tauri-drag-region="">
        <div className="flex items-center">
          <h1 className="hn-title text-black dark:text-white"><img src="images/icon.png" alt="Unitodo icon" className="h-6 w-auto inline-block" />Unitodo</h1>
          {todoStore.lastFetched && ( // Use todoStore.lastFetched
            <span className="ml-3 text-xs text-neutral-500 dark:text-neutral-400">
              Updated {todoStore.lastFetched.toLocaleTimeString()} {/* Use todoStore.lastFetched */}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            className="hn-filter-button dark:hover:bg-neutral-700 dark:text-neutral-300"
            onClick={todoStore.loadData} // Call MobX action
            title="Refresh data (Ctrl+R)"
          >
            <span className="inline-block">↻</span>
          </button>
          
          <button
            className={`hn-filter-button ${todoStore.displayMode === 'tab' ? 'active' : ''} dark:hover:bg-neutral-700 dark:text-neutral-300`} // Use todoStore.displayMode
            onClick={todoStore.toggleDisplayMode} // Call MobX action
            title={`Switch to ${todoStore.displayMode === 'section' ? 'tab' : todoStore.displayMode === 'tab' ? 'table' : 'section'} mode (m)`} // Use todoStore.displayMode
          >
            {todoStore.displayMode === 'section' ? '≡' : todoStore.displayMode === 'tab' ? '▦' : '⊞'} {/* Use todoStore.displayMode */}
          </button>
          
          <button
            className="hn-filter-button text-xs dark:hover:bg-neutral-700 dark:text-neutral-300"
            title="Toggle dark mode"
            aria-label="Toggle dark mode"
            onClick={toggleDarkMode}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          
          <button
            className="hn-filter-button text-xs dark:hover:bg-neutral-700 dark:text-neutral-300"
            title="Keyboard shortcuts (?)"
            aria-label="Show keyboard shortcuts"
            onClick={todoStore.toggleKeyboardHelp} // Call MobX action
          >
            ⌨️
          </button>
          
          <Link href="config" passHref legacyBehavior prefetch={false}>
            <a 
              className="hn-filter-button text-xs dark:hover:bg-neutral-700 dark:text-neutral-300"
              title="Configure Unitodo"
              aria-label="Configure Unitodo"
            >
              ⚙️
            </a>
          </Link>
        </div>
      </div>
      
      <div className="mb-3 flex items-center">
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search todos... (/)"
          value={todoStore.searchQuery} // Use todoStore.searchQuery
          onChange={(e) => todoStore.setSearchQuery(e.target.value)} // Call MobX action
          className="hn-search dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700 dark:placeholder-neutral-500 flex-grow"
        />
        
        <div className="flex ml-2">
          <button 
            className={`hn-filter-button ${todoStore.filter === 'all' ? 'active' : ''} dark:hover:bg-neutral-700 dark:text-neutral-300`} // Use todoStore.filter
            onClick={() => todoStore.setFilter('all')} // Call MobX action
            title="All todos (1)"
          >
            All
          </button>
          <button 
            className={`hn-filter-button ${todoStore.filter === 'active' ? 'active' : ''} dark:hover:bg-neutral-700 dark:text-neutral-300 ml-1`} // Use todoStore.filter
            onClick={() => todoStore.setFilter('active')} // Call MobX action
            title="Active todos (2)"
          >
            Active
          </button>
          <button 
            className={`hn-filter-button ${todoStore.filter === 'closed' ? 'active' : ''} dark:hover:bg-neutral-700 dark:text-neutral-300 ml-1`} // Use todoStore.filter
            onClick={() => todoStore.setFilter('closed')} // Call MobX action
            title="Closed todos (3)"
          >
            Closed
          </button>
        </div>
      </div>
      
      <div className="flex-grow min-h-0 flex flex-col">
        {todoStore.error ? ( // Use todoStore.error
          <div className="bg-red-50 dark:bg-red-900/20 rounded-md p-3 text-xs dark:text-red-100 flex-grow">
            <strong>Error:</strong> {todoStore.error} {/* Use todoStore.error */}
          </div>
        ) : todoStore.displayMode === 'table' ? ( // Use todoStore.displayMode
           <AutoSizer>
            {({ height, width }) => (
              <TodoTable 
                  tableRows={tableDisplayData} // tableDisplayData is derived from todoStore properties
                  onRowClick={(catIndex, itmIndex) => todoStore.setFocusedItem({ categoryIndex: catIndex, itemIndex: itmIndex })} // Call MobX action
                  focusedItem={todoStore.focusedItem} // Use todoStore.focusedItem
                  height={height}
                  width={width}
              />
            )}
          </AutoSizer>
        ) : todoStore.filteredCategories.length > 0 || (todoStore.displayMode === 'section' && flattenedList.length > 0) ? ( // Use todoStore properties
          todoStore.displayMode === 'section' ? ( // Use todoStore.displayMode
            <AutoSizer>
              {({ height, width }) => (
                <VariableSizeList
                  ref={sectionListRef}
                  height={height}
                  itemCount={flattenedList.length} // flattenedList is derived from todoStore.filteredCategories
                  itemSize={getItemSize} // getItemSize uses flattenedList
                  width={width}
                  className="focus-within:outline-none"
                >
                  {SectionRow}
                </VariableSizeList>
              )}
            </AutoSizer>
          ) : (
            renderTabs() // renderTabs uses todoStore properties
          )
        ) : (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="24" height="24" rx="4" fill="currentColor" fillOpacity="0.1"/>
              <path d="M5 14L8.23309 16.4248C8.66178 16.7463 9.26772 16.6728 9.60705 16.2581L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <h3>No todos found</h3>
            <p>Try changing your search or filter settings</p>
          </div>
        )}
      </div>
      
      {/* Keyboard shortcuts modal with improved styling */}
      {todoStore.showKeyboardHelp && ( // Use todoStore.showKeyboardHelp
        <div className="fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center modal-backdrop">
          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-4 max-w-md w-full mx-4 text-xs modal-content dark:text-neutral-200 border dark:border-neutral-700">
            <div className="flex justify-between items-center mb-3">
              <div className="font-medium text-base">Keyboard Shortcuts</div>
              <button 
                onClick={() => todoStore.toggleKeyboardHelp()} // Call MobX action
                className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                aria-label="Close shortcuts help"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="italic text-neutral-500 dark:text-neutral-400 mb-3 text-xs">
              Note: Shortcuts only work when not editing text
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              <div className="col-span-2 font-medium text-xs text-neutral-600 dark:text-neutral-300 mt-1.5 mb-1 border-b dark:border-neutral-700 pb-1">Navigation</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">↑</kbd> / <kbd className="dark:bg-neutral-700 dark:border-neutral-600">k</kbd> Navigate up</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">↓</kbd> / <kbd className="dark:bg-neutral-700 dark:border-neutral-600">j</kbd> Navigate down</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">Shift</kbd>+<kbd className="dark:bg-neutral-700 dark:border-neutral-600">k</kbd> Navigate up 5 items</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">Shift</kbd>+<kbd className="dark:bg-neutral-700 dark:border-neutral-600">j</kbd> Navigate down 5 items</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">←</kbd> / <kbd className="dark:bg-neutral-700 dark:border-neutral-600">h</kbd> Previous tab</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">→</kbd> / <kbd className="dark:bg-neutral-700 dark:border-neutral-600">l</kbd> Next tab</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">Esc</kbd> Exit edit mode</div>
              
              <div className="col-span-2 font-medium text-xs text-neutral-600 dark:text-neutral-300 mt-1.5 mb-1 border-b dark:border-neutral-700 pb-1">Todo actions</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">a</kbd> / <kbd className="dark:bg-neutral-700 dark:border-neutral-600">i</kbd> Edit todo (cursor at end)</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">Shift</kbd>+<kbd className="dark:bg-neutral-700 dark:border-neutral-600">I</kbd> Edit todo (cursor after priority)</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">o</kbd> Add todo to current section</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">x</kbd> Append ignore comment</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">Space</kbd> Toggle completion</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">Enter</kbd> Open in editor</div>
              
              <div className="col-span-2 font-medium text-xs text-neutral-600 dark:text-neutral-300 mt-1.5 mb-1 border-b dark:border-neutral-700 pb-1">Global</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">?</kbd> Toggle this shortcut help</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">d</kbd> Toggle dark mode</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">/</kbd> Focus search</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">m</kbd> Switch view mode</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">Ctrl</kbd>+<kbd className="dark:bg-neutral-700 dark:border-neutral-600">R</kbd> Refresh data</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">1</kbd> Show all todos</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">2</kbd> Show active todos</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">3</kbd> Show completed todos</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Todo Modal */}
      {todoStore.showAddTodoModal && todoStore.addTodoModalData && ( // Use todoStore properties
        <AddTodoModal
          isOpen={todoStore.showAddTodoModal} // Use todoStore property
          onClose={todoStore.closeAddTodoModal} // Call MobX action
          onSubmit={(todoText: string, categoryType: "git" | "project", categoryName: string) => {
            todoStore.submitAddTodo({ // Call MobX action
              content: todoText, 
              categoryName, 
              categoryType, 
            });
          }}
          categoryName={todoStore.addTodoModalData.categoryName} // Use todoStore property
          categoryType={todoStore.addTodoModalData.categoryType} // Use todoStore property
        />
      )}
    </div>
  );
}
export default observer(Todo); // Wrap component with observer