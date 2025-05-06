'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { FixedSizeList, VariableSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { useTodoStore, getFilteredCategories, useTodoSelectors } from '../store/todoStore';
import useConfigStore from '../store/configStore';
import TodoCategory from './TodoCategory';
import TodoCategoryHeader from './TodoCategoryHeader';
import TodoItem from './TodoItem';
import NerdFontIcon from './NerdFontIcon';
import { TodoItem as TodoItemType, TodoCategory as TodoCategoryType } from '../types';
import { useDarkMode } from '../utils/darkMode';
import { parseTodoContent } from '../utils';
import Link from 'next/link';

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

export default function Todo() {
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
  
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  
  const loadData = useTodoStore(state => state.loadData);
  const setFilter = useTodoStore(state => state.setFilter);
  const setSearchQuery = useTodoStore(state => state.setSearchQuery);
  const toggleDisplayMode = useTodoStore(state => state.toggleDisplayMode);
  const setActiveTabIndex = useTodoStore(state => state.setActiveTabIndex);
  const setFocusedItem = useTodoStore(state => state.setFocusedItem);
  const toggleKeyboardHelp = useTodoStore(state => state.toggleKeyboardHelp);
  const navigateTodos = useTodoStore(state => state.navigateTodos);
  const navigateTabs = useTodoStore(state => state.navigateTabs);
  const addNewTodo = useTodoStore(state => state.addNewTodo);
  
  const { totalTodos, completedTodos, activeTodos } = useTodoSelectors.getTotalCounts(useTodoStore.getState());
  
  const filteredCategories = getFilteredCategories(useTodoStore.getState());

  const searchInputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tabHeaderRef = useRef<HTMLDivElement>(null);
  const urlUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tabListRef = useRef<FixedSizeList>(null);
  const sectionListRef = useRef<VariableSizeList>(null);

  const { config: appConfig, loadConfig: loadAppConfig, initialConfigLoaded } = useConfigStore();

  const flattenedList = useMemo((): FlatListItem[] => {
    if (displayMode !== 'section') return [];

    const flatList: FlatListItem[] = [];
    let currentFlatIndex = 0;
    filteredCategories.forEach((category, catIndex) => {
      flatList.push({
        type: 'header',
        category: category,
        categoryIndex: catIndex,
        flatIndex: currentFlatIndex++
      });
      category.todos.forEach((todo, itemIndex) => {
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
  }, [filteredCategories, displayMode]);

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
    if (displayMode === 'tab' && tabHeaderRef.current) {
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
  }, [displayMode, categories.length, activeTabIndex, filter]);

  useEffect(() => {
    loadData();
    if (!initialConfigLoaded) {
        loadAppConfig();
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (appConfig?.refresh_interval && appConfig.refresh_interval > 0) {
        console.log(`Setting refresh interval to ${appConfig.refresh_interval}ms`);
        intervalRef.current = setInterval(loadData, appConfig.refresh_interval);
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
          const { focusedItem: currentFocusedItem, displayMode: currentDisplayMode, activeTabIndex: currentActiveTabIndex } = useTodoStore.getState();
          const currentFilteredCategories = getFilteredCategories(useTodoStore.getState());

          let newFocusCategoryIndex = -1;
          let newFocusItemIndex = -1;

          if (currentDisplayMode === 'tab') {
            if (currentFilteredCategories[currentActiveTabIndex]?.todos.length > 0) {
              newFocusCategoryIndex = currentActiveTabIndex;
              newFocusItemIndex = 0;
            }
          } else {
            if (flattenedList.length > 0) {
              const firstItem = flattenedList.find(item => item.type === 'item') as FlatTodoItem | undefined;
              if (firstItem) {
                newFocusCategoryIndex = firstItem.categoryIndex;
                newFocusItemIndex = firstItem.itemIndex;
              }
            }
          }

          if (newFocusCategoryIndex !== -1 && newFocusItemIndex !== -1) {
            setFocusedItem({ categoryIndex: newFocusCategoryIndex, itemIndex: newFocusItemIndex });
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
            if (containerRef.current) {
              setTimeout(() => {
                containerRef.current?.focus();
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
            loadData();
          }
          break;
        case 'm':
           if (!isEditingContext) {
             e.preventDefault();
             toggleDisplayMode();
           }
           break;
        case 'o':
          if (!isEditingContext) {
            e.preventDefault();
            const currentFocusedItem = useTodoStore.getState().focusedItem;
            const currentCategories = getFilteredCategories(useTodoStore.getState());
            const currentDisplayMode = useTodoStore.getState().displayMode;
            const currentActiveTabIndex = useTodoStore.getState().activeTabIndex;

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
            } else {
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
            addNewTodo(categoryType, categoryName, exampleItemLocation);
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
  }, [loadData, navigateTabs, toggleDarkMode, toggleKeyboardHelp, toggleDisplayMode, appConfig, loadAppConfig, initialConfigLoaded, addNewTodo]);

  useEffect(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      const currentFocusedItem = useTodoStore.getState().focusedItem;
      const currentDisplayMode = useTodoStore.getState().displayMode;
      const { categoryIndex, itemIndex } = currentFocusedItem;

      if (categoryIndex === -1 || itemIndex === -1) return;

      if (searchInputRef.current && document.activeElement === searchInputRef.current) {
        return;
      }

      if (currentDisplayMode === 'tab' && tabListRef.current) {
        tabListRef.current.scrollToItem(itemIndex, 'smart');
      } else if (currentDisplayMode === 'section' && sectionListRef.current) {
        const flatIndex = getFlatIndex(categoryIndex, itemIndex);
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
  }, [focusedItem, displayMode, flattenedList]);

  useEffect(() => {
    if (typeof window === 'undefined' || filteredCategories.length === 0) return;
    
    try {
      const hash = window.location.hash.substring(1);
      if (!hash) return;
      
      const params = new URLSearchParams(hash);
      const tabName = params.get('tab');
      const itemId = params.get('item');
      
      if (!tabName || !itemId) return;
      
      const categoryIndex = filteredCategories.findIndex(c => c.name === tabName);
      if (categoryIndex === -1) return;
      
      let itemIndex = -1;
      
      const itemIdString = itemId as string;
      
      if (itemIdString.includes('index=')) {
        const indexStr = itemIdString.replace('index=', '');
        itemIndex = parseInt(indexStr, 10);
      } else {
        itemIndex = filteredCategories[categoryIndex].todos.findIndex(todo => {
          const parsed = parseTodoContent(todo.content);
          return parsed.idPart === itemIdString;
        });
      }
      
      if (itemIndex === -1 || itemIndex >= filteredCategories[categoryIndex].todos.length) return;
      
      setActiveTabIndex(categoryIndex);
      setFocusedItem({ categoryIndex, itemIndex });
      
    } catch (err) {
      console.error('Error handling URL hash:', err);
    }
  }, [filteredCategories, setActiveTabIndex, setFocusedItem]);

  const getOriginalCategoryIndex = (categoryName: string) => {
    return categories.findIndex(cat => cat.name === categoryName);
  };

  const renderTabs = () => {
    const activeCategoryData = filteredCategories[activeTabIndex];
    const itemCount = activeCategoryData?.todos.length || 0;

    const TabRow = ({ index, style }: { index: number, style: React.CSSProperties }) => {
      if (!activeCategoryData) return null;
      const todo = activeCategoryData.todos[index];
      
      const searchInputIsActive = !!(searchInputRef.current && document.activeElement === searchInputRef.current);
      const isFocused = !searchInputIsActive && focusedItem.categoryIndex === activeTabIndex && focusedItem.itemIndex === index;

      return (
        <div style={style}>
          <TodoItem
            key={`${todo.location}-${index}`}
            todo={todo}
            isFocused={isFocused}
            onClick={() => setFocusedItem({ categoryIndex: activeTabIndex, itemIndex: index })}
            categoryIndex={activeTabIndex}
            itemIndex={index}
          />
        </div>
      );
    };

    return (
      <div className="relative flex flex-col flex-grow min-h-0">
        <div ref={tabHeaderRef} className="sticky top-0 z-10 bg-white dark:bg-gray-900 shadow-sm flex-shrink-0">
          <div className="flex flex-wrap border-b border-border-color dark:border-gray-700 text-xs overflow-visible">
            {categories.map((category, index) => (
              <button
                key={index}
                className={`px-2 py-1 my-1 mr-1 font-medium ${
                  activeTabIndex === index
                  ? 'border-b-2 border-accent-color font-bold dark:text-gray-200'
                  : 'text-subtle-color dark:text-gray-400'
                }`}
                onClick={() => {
                  setActiveTabIndex(index);
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
                <span className="ml-1 text-subtle-color dark:text-gray-500">
                  ({category.todos.filter(todo => todo.completed).length}/{category.todos.length})
                </span>
              </button>
            ))}
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
            <div className="p-2 text-center text-subtle-color dark:text-gray-500 text-xs">
              No todos in this category
            </div>
          )}
        </div>
      </div>
    );
  };

  const SectionRow = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = flattenedList[index];
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
        const isFocused = !searchInputIsActive && focusedItem.categoryIndex === item.categoryIndex && focusedItem.itemIndex === item.itemIndex;
        return (
            <div style={style}>
                <TodoItem
                    key={`${item.todo.location}-${item.itemIndex}`}
                    todo={item.todo}
                    isFocused={isFocused}
                    onClick={() => setFocusedItem({ categoryIndex: item.categoryIndex, itemIndex: item.itemIndex })}
                    categoryIndex={item.categoryIndex}
                    itemIndex={item.itemIndex}
                />
            </div>
        );
    }

    return null;
  };

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
          <div><kbd className="dark:bg-gray-700 dark:border-gray-600">Esc</kbd> Exit edit mode</div>
          
          <div className="col-span-2 font-semibold mt-1">Todo actions</div>
          <div><kbd className="dark:bg-gray-700 dark:border-gray-600">a</kbd> / <kbd className="dark:bg-gray-700 dark:border-gray-600">i</kbd> Edit todo</div>
          <div><kbd className="dark:bg-gray-700 dark:border-gray-600">o</kbd> Add todo to current section</div>
          <div><kbd className="dark:bg-gray-700 dark:border-gray-600">x</kbd> Append ignore comment</div>
          <div><kbd className="dark:bg-gray-700 dark:border-gray-600">Space</kbd> Toggle completion</div>
          <div><kbd className="dark:bg-gray-700 dark:border-gray-600">Enter</kbd> Open in VSCode</div>
          
          <div className="col-span-2 font-semibold mt-1">Global</div>
          <div><kbd className="dark:bg-gray-700 dark:border-gray-600">?</kbd> Toggle this shortcut help</div>
          <div><kbd className="dark:bg-gray-700 dark:border-gray-600">d</kbd> Toggle dark mode</div>
          <div><kbd className="dark:bg-gray-700 dark:border-gray-600">/</kbd> Focus search</div>
          <div><kbd className="dark:bg-gray-700 dark:border-gray-600">m</kbd> Switch view mode</div>
          <div><kbd className="dark:bg-gray-700 dark:border-gray-600">Ctrl</kbd>+<kbd className="dark:bg-gray-700 dark:border-gray-600">R</kbd> Refresh data</div>
          <div><kbd className="dark:bg-gray-700 dark:border-gray-600">1</kbd> Show all todos</div>
          <div><kbd className="dark:bg-gray-700 dark:border-gray-600">2</kbd> Show active todos</div>
          <div><kbd className="dark:bg-gray-700 dark:border-gray-600">3</kbd> Show completed todos</div>
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
      className="hn-style group dark:bg-gray-900 dark:text-gray-100 focus:outline-none flex flex-col min-h-screen"
      tabIndex={-1}
      ref={containerRef}
      role="application"
      aria-label="Todo Application"
    >
      <div className="hn-header dark:border-gray-700 flex-shrink-0">
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
      
      <div className="hn-compact-controls dark:border-gray-700 flex-shrink-0">
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search todos... (/)"
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
          title={`Switch to ${displayMode === 'section' ? 'tab' : 'section'} mode (m)`}
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
          title="Keyboard shortcuts (?)"
          aria-label="Show keyboard shortcuts"
          onClick={toggleKeyboardHelp}
        >
          ⌨️
        </button>
        
        <Link href="/config" passHref legacyBehavior>
            <a 
                className="hn-filter-button text-xs dark:hover:bg-gray-700 dark:text-gray-300"
                title="Configure Unitodo"
                aria-label="Configure Unitodo"
            >
                ⚙️
            </a>
        </Link>

      </div>
      
      <div className="flex-grow min-h-0 flex flex-col">
        {loading ? (
          <div className="flex justify-center items-center flex-grow">
            <div className="animate-spin h-4 w-4 border-t-2 border-b-2 border-accent-color"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900 p-2 text-xs dark:text-red-100 flex-grow">
            <strong>Error:</strong> {error}
          </div>
        ) : filteredCategories.length > 0 || flattenedList.length > 0 ? (
          displayMode === 'section' ? (
            <AutoSizer>
              {({ height, width }) => (
                <VariableSizeList
                  ref={sectionListRef}
                  height={height}
                  itemCount={flattenedList.length}
                  itemSize={getItemSize}
                  width={width}
                  className="focus-within:outline-none"
                >
                  {SectionRow}
                </VariableSizeList>
              )}
            </AutoSizer>
          ) : (
            renderTabs()
          )
        ) : (
          <div className="text-center p-2 text-subtle-color dark:text-gray-500 text-xs flex-grow flex items-center justify-center">
            No todos found. Try changing your search or filter.
          </div>
        )}
      </div>
      
      {renderKeyboardShortcutsHelp()}
    </div>
  );
} 