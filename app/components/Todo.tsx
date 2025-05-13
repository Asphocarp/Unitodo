'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { FixedSizeList, VariableSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { useTodoStore, getFilteredCategories, useTodoSelectors, getGloballySortedAndFilteredTodos } from '../store/todoStore';
import useConfigStore from '../store/configStore';
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
  const showAddTodoModal = useTodoStore(state => state.showAddTodoModal);
  const addTodoModalData = useTodoStore(state => state.addTodoModalData);
  
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
  const openAddTodoModal = useTodoStore(state => state.openAddTodoModal);
  const closeAddTodoModal = useTodoStore(state => state.closeAddTodoModal);
  const submitAddTodo = useTodoStore(state => state.submitAddTodo);
  
  const todoStoreState = useTodoStore.getState();
  const { totalTodos, completedTodos, activeTodos } = useTodoSelectors.getTotalCounts(todoStoreState);
  
  const filteredCategories = getFilteredCategories(todoStoreState);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tabHeaderRef = useRef<HTMLDivElement>(null);
  const urlUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tabListRef = useRef<FixedSizeList>(null);
  const sectionListRef = useRef<VariableSizeList>(null);

  const { config: appConfig, loadActiveProfileAndConfig: loadAppConfig, initialConfigLoaded } = useConfigStore();

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

  const tableDisplayData = useMemo((): TodoTableRow[] => {
    if (displayMode !== 'table') return [];
    const sortedItems = getGloballySortedAndFilteredTodos(todoStoreState);
    const originalStoreCategories = todoStoreState.categories;

    return sortedItems.map(item => {
      const { originalTodo, categoryIndex, itemIndex } = item; 
      const parsed = parseTodoContent(originalTodo.content);
      
      let fullPath = originalTodo.location || '';
      let lineNumberStr = '';
      const lineMatch = originalTodo.location?.match(/\:(\d+)$/);
      if (lineMatch) {
        lineNumberStr = lineMatch[1];
        fullPath = originalTodo.location.replace(/\:\d+$/, '');
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
        id: (originalTodo.location || 'loc') + (parsed.idPart || 'id') + categoryIndex + '-' + itemIndex,
        content: originalTodo.content, 
        parsedContent: parsed,
        zone: originalStoreCategories[categoryIndex]?.name || 'Unknown',
        filePath: basename,
        lineNumber: lineNumberStr,
        created: createdTimestamp,
        finished: completedTimestamp,
        estDuration: null,
        originalTodo: originalTodo,
        categoryIndex: categoryIndex, 
        itemIndex: itemIndex,       
      };
    });
  }, [displayMode, todoStoreState.categories, todoStoreState.filter, todoStoreState.searchQuery]);

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
            openAddTodoModal(categoryType, categoryName, exampleItemLocation);
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
  }, [loadData, navigateTabs, toggleDarkMode, toggleKeyboardHelp, toggleDisplayMode, appConfig, loadAppConfig, initialConfigLoaded, openAddTodoModal]);

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
        <div ref={tabHeaderRef} className="sticky top-0 z-10 bg-white dark:bg-neutral-900 shadow-sm flex-shrink-0">
          <div className="flex flex-wrap border-b border-border-color dark:border-neutral-700 text-xs overflow-visible">
            {categories.map((category, index) => (
              <button
                key={index}
                className={`px-2 py-1 my-1 mr-1 font-medium ${
                  activeTabIndex === index
                  ? 'border-b-2 border-accent-color font-bold dark:text-neutral-200'
                  : 'text-subtle-color dark:text-neutral-400'
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
                <span className="ml-1 text-subtle-color dark:text-neutral-500">
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
            <div className="p-2 text-center text-subtle-color dark:text-neutral-500 text-xs">
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
      className="p-4 group dark:bg-neutral-900 dark:text-neutral-100 focus:outline-none flex flex-col min-h-screen"
      tabIndex={-1}
      ref={containerRef}
      role="application"
      aria-label="Todo Application"
    >
      <div className="hn-header dark:border-neutral-700 flex-shrink-0 flex justify-between" data-tauri-drag-region="">
        <div className="flex items-center">
          <h1 className="hn-title text-black dark:text-white"><img src="images/icon.png" alt="Unitodo icon" className="h-6 w-auto inline-block" />Unitodo</h1>
          {lastUpdated && (
            <span className="ml-3 text-xs text-neutral-500 dark:text-neutral-400">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            className="hn-filter-button dark:hover:bg-neutral-700 dark:text-neutral-300"
            onClick={loadData}
            title="Refresh data (Ctrl+R)"
          >
            <span className="inline-block">↻</span>
          </button>
          
          <button
            className={`hn-filter-button ${displayMode === 'tab' ? 'active' : ''} dark:hover:bg-neutral-700 dark:text-neutral-300`}
            onClick={toggleDisplayMode}
            title={`Switch to ${displayMode === 'section' ? 'tab' : displayMode === 'tab' ? 'table' : 'section'} mode (m)`}
          >
            {displayMode === 'section' ? '≡' : displayMode === 'tab' ? '▦' : '⊞'}
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
            onClick={toggleKeyboardHelp}
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
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="hn-search dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700 dark:placeholder-neutral-500 flex-grow"
        />
        
        <div className="flex ml-2">
          <button 
            className={`hn-filter-button ${filter === 'all' ? 'active' : ''} dark:hover:bg-neutral-700 dark:text-neutral-300`}
            onClick={() => setFilter('all')}
            title="All todos (1)"
          >
            All
          </button>
          <button 
            className={`hn-filter-button ${filter === 'active' ? 'active' : ''} dark:hover:bg-neutral-700 dark:text-neutral-300 ml-1`}
            onClick={() => setFilter('active')}
            title="Active todos (2)"
          >
            Active
          </button>
          <button 
            className={`hn-filter-button ${filter === 'completed' ? 'active' : ''} dark:hover:bg-neutral-700 dark:text-neutral-300 ml-1`}
            onClick={() => setFilter('completed')}
            title="Completed todos (3)"
          >
            Completed
          </button>
        </div>
      </div>
      
      <div className="flex-grow min-h-0 flex flex-col">
        {loading ? (
          <div className="flex justify-center items-center flex-grow">
            <div className="animate-spin h-5 w-5 border-2 border-t-transparent border-accent-color rounded-full"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-md p-3 text-xs dark:text-red-100 flex-grow">
            <strong>Error:</strong> {error}
          </div>
        ) : displayMode === 'table' ? (
           <AutoSizer>
            {({ height, width }) => (
              <TodoTable 
                  tableRows={tableDisplayData}
                  onRowClick={(catIndex, itmIndex) => setFocusedItem({ categoryIndex: catIndex, itemIndex: itmIndex })}
                  focusedItem={focusedItem}
                  height={height}
                  width={width}
              />
            )}
          </AutoSizer>
        ) : filteredCategories.length > 0 || (displayMode === 'section' && flattenedList.length > 0) ? (
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
      {showKeyboardHelp && (
        <div className="fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center modal-backdrop">
          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-4 max-w-md w-full mx-4 text-xs modal-content dark:text-neutral-200 border dark:border-neutral-700">
            <div className="flex justify-between items-center mb-3">
              <div className="font-medium text-base">Keyboard Shortcuts</div>
              <button 
                onClick={() => toggleKeyboardHelp()}
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
      {showAddTodoModal && addTodoModalData && (
        <AddTodoModal
          isOpen={showAddTodoModal}
          onClose={closeAddTodoModal}
          onSubmit={submitAddTodo}
          categoryName={addTodoModalData.categoryName}
          categoryType={addTodoModalData.categoryType}
        />
      )}
    </div>
  );
} 