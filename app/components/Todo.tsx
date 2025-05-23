'use client';

import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { FixedSizeList, VariableSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { observer } from 'mobx-react-lite';

import todoStore, { isStatusDoneLike } from '../store/todoStore';
import configStore from '../store/configStore';
import { darkModeStore } from '../utils/darkMode';

import TodoCategoryHeader from './TodoCategoryHeader';
import TodoItem from './TodoItem';
import NerdFontIcon from './NerdFontIcon';
import TodoTable from './TodoTable';
import { TodoItem as TodoItemType, TodoCategory as TodoCategoryType, FlatListItem, FlatHeaderItem, FlatTodoItem, TodoTableRow } from '../types';
import { parseTodoContent, decodeTimestampId } from '../utils';
import Link from 'next/link';
import AddTodoModal from './AddTodoModal';

const ITEM_HEIGHT = 24;
const CATEGORY_HEADER_HEIGHT = 30;

const Todo: React.FC = observer(() => {
  const {
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
    computedFlattenedList,
    computedTableDisplayData,
  } = todoStore;

  const { 
    config: appConfig, 
    loadActiveProfileAndConfig: loadAppConfig, 
    initialConfigLoaded,
    activeProfileName,
    availableProfiles,
    profilesLoading,
    switchActiveProfile,
    switchToPreviousProfile, 
    switchToNextProfile,
  } = configStore;
  
  const { isDarkMode, toggleDarkMode } = darkModeStore;

  const { active: activeTodos, done: completedTodos, total: totalTodos } = todoStore.totalCounts;

  const searchInputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tabHeaderRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tabListRef = useRef<FixedSizeList>(null);
  const sectionListRef = useRef<VariableSizeList>(null);

  const flattenedList = computedFlattenedList;
  const tableDisplayData = computedTableDisplayData;

  const getItemSize = (index: number): number => {
    const item = flattenedList[index];
    return item?.type === 'header' ? CATEGORY_HEADER_HEIGHT : ITEM_HEIGHT;
  };

  useEffect(() => {
    if (displayMode === 'tab' && tabHeaderRef.current) {
      const updateScrollPadding = () => {
        const tabHeaderHeight = tabHeaderRef.current?.offsetHeight || 0;
        document.documentElement.style.setProperty('--tab-header-height', `${tabHeaderHeight + 10}px`);
      };
      updateScrollPadding();
      window.addEventListener('resize', updateScrollPadding);
      return () => window.removeEventListener('resize', updateScrollPadding);
    } else {
      document.documentElement.style.removeProperty('--tab-header-height');
    }
  }, [displayMode, todoStore.categories.length, activeTabIndex, filter]);

  useEffect(() => {
    loadData();
    if (!initialConfigLoaded) {
        loadAppConfig();
    }

    if (intervalRef.current) clearInterval(intervalRef.current);

    if (appConfig?.refresh_interval && appConfig.refresh_interval > 0) {
        intervalRef.current = setInterval(loadData, appConfig.refresh_interval);
    } else {
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
          todoStore._adjustFocusAfterModeOrFilterChange();
          setTimeout(() => {
            const { categoryIndex: ci, itemIndex: ii } = todoStore.focusedItem;
            if (ci !== -1 && ii !== -1) {
              const itemSelector = displayMode === 'table' ? `tr[data-category-index="${ci}"][data-item-index="${ii}"]` : `[data-category-index="${ci}"][data-item-index="${ii}"] .todo-item-main-content`;
              const focusedElement = containerRef.current?.querySelector(itemSelector) as HTMLElement;
              focusedElement?.focus();
            } else {
              containerRef.current?.focus();
            }
          }, 0);
          return;
        }
        return;
      }
      
      if (isEditingContext && e.key !== '?' && !(e.ctrlKey || e.metaKey)) return;
      if ((e.ctrlKey || e.metaKey || e.altKey) && !(e.ctrlKey && e.key === '/')) return;

      switch (e.key) {
        case 'H': 
          if (!isEditingContext && e.shiftKey) { e.preventDefault(); switchToPreviousProfile(); }
          else if (!isEditingContext) { e.preventDefault(); navigateTabs('left'); }
          break;
        case 'L': 
          if (!isEditingContext && e.shiftKey) { e.preventDefault(); switchToNextProfile(); }
          else if (!isEditingContext) { e.preventDefault(); navigateTabs('right'); } 
          break;
        case 'd': 
          if (!isEditingContext) {
            e.preventDefault(); 
            toggleDarkMode();
             setTimeout(() => {
              const { categoryIndex: ci, itemIndex: ii } = todoStore.focusedItem;
              const activeEl = document.activeElement;
              if (containerRef.current && (!activeEl || activeEl === document.body || activeEl === containerRef.current)) {
                if (ci !== -1 && ii !== -1) {
                    const itemSelector = displayMode === 'table' ? `tr[data-category-index="${ci}"][data-item-index="${ii}"]` : `[data-category-index="${ci}"][data-item-index="${ii}"]`;
                    const focusedElement = containerRef.current?.querySelector(itemSelector) as HTMLElement;
                    focusedElement?.focus();
                } else {
                   containerRef.current?.focus();
                }
              }
            }, 0);
          } 
          break;
        case '?': if (!isEditingContext) { e.preventDefault(); toggleKeyboardHelp(); } break;
        case '1': if (!isEditingContext) setFilter('all'); break;
        case '2': if (!isEditingContext) setFilter('active'); break;
        case '3': if (!isEditingContext) setFilter('closed'); break;
        case '/': 
          if (e.ctrlKey || !isEditingContext) { 
            e.preventDefault(); 
            searchInputRef.current?.focus(); 
          } 
          break;
        case 'r': if (e.ctrlKey) { e.preventDefault(); loadData(); } break;
        case 'm': if (!isEditingContext) { e.preventDefault(); toggleDisplayMode(); } break;
        case 'o':
          if (!isEditingContext) {
            e.preventDefault();
            let categoryType: 'git' | 'project';
            let categoryName: string;
            let exampleItemLocation: string | undefined = undefined;
            const currentCategories = todoStore.filteredCategories;
            const currentFocusedOriginalCatIndex = todoStore.focusedItem.categoryIndex;
            const currentFocusedOriginalItemIndex = todoStore.focusedItem.itemIndex;

            if (displayMode === 'tab') {
                const activeOriginalCatIndex = todoStore.activeTabIndex;
                const activeCategory = todoStore.categories[activeOriginalCatIndex];
                if (activeCategory) {
                    categoryName = activeCategory.name;
                    if (activeCategory.icon === "󰊢") categoryType = 'git';
                    else if (activeCategory.icon === "") categoryType = 'project';
                    else { alert('Cannot add TODO here.'); return; }
                    if (activeCategory.todos.length > 0) exampleItemLocation = activeCategory.todos[0].location;
                } else { alert('No active tab.'); return; }
            } else {
                const focusedCat = todoStore.categories[currentFocusedOriginalCatIndex];
                if (focusedCat) {
                    categoryName = focusedCat.name;
                    if (focusedCat.icon === "󰊢") categoryType = 'git';
                    else if (focusedCat.icon === "") categoryType = 'project';
                    else { alert('Cannot add TODO here.'); return; }
                    const itemToUse = focusedCat.todos[currentFocusedOriginalItemIndex] || focusedCat.todos[0];
                    exampleItemLocation = itemToUse?.location;
                } else { alert('No item/section focused.'); return; }
            }
            openAddTodoModal(categoryType, categoryName, exampleItemLocation);
          }
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [loadData, navigateTabs, toggleDarkMode, toggleKeyboardHelp, toggleDisplayMode, appConfig, loadAppConfig, initialConfigLoaded, openAddTodoModal, displayMode, navigateTodos, setFilter, setSearchQuery, switchToPreviousProfile, switchToNextProfile]);

  useEffect(() => {
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      const { categoryIndex, itemIndex } = todoStore.focusedItem;
      if (categoryIndex === -1 && itemIndex === -1) return;
      if (searchInputRef.current && document.activeElement === searchInputRef.current) return;
      if (todoStore.tableEditingCell) return;

      const currentFlattenedList = todoStore.computedFlattenedList; 
      const currentFilteredCategories = todoStore.filteredCategories;
      const currentCategories = todoStore.categories;

      if (displayMode === 'tab' && tabListRef.current) {
        const activeOriginalCatIndex = todoStore.activeTabIndex;
        if (categoryIndex === activeOriginalCatIndex && itemIndex !== -1) {
          const activeCatInFiltered = currentFilteredCategories.find(cat => currentCategories[activeOriginalCatIndex]?.name === cat.name);
          if(activeCatInFiltered) {
            const focusedTodo = currentCategories[activeOriginalCatIndex]?.todos[itemIndex];
            if (focusedTodo) {
                const itemIndexInFiltered = activeCatInFiltered.todos.findIndex(t => t.location === focusedTodo.location && t.content === focusedTodo.content);
                if(itemIndexInFiltered !== -1) tabListRef.current.scrollToItem(itemIndexInFiltered, 'smart');
            }
          }
        }
      } else if (displayMode === 'section' && sectionListRef.current) {
        const getFlatIndexLocal = (catIdx: number, itmIdx: number): number => {
            const foundItem = currentFlattenedList.find(item => 
                item.type === 'item' && 
                item.categoryIndex === catIdx && 
                item.itemIndex === itmIdx
            );
            return foundItem ? foundItem.flatIndex : -1;
        };
        const flatIndex = getFlatIndexLocal(categoryIndex, itemIndex);
        if (flatIndex !== -1) sectionListRef.current.scrollToItem(flatIndex, 'smart');
      }
    }, 50);
    return () => { if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current); };
  }, [todoStore.focusedItem.categoryIndex, todoStore.focusedItem.itemIndex, displayMode, todoStore.activeTabIndex, todoStore.tableEditingCell]);

  useEffect(() => {
    if (typeof window === 'undefined' || todoStore.filteredCategories.length === 0) return;
    try {
      const hash = window.location.hash.substring(1);
      if (!hash) return;
      const params = new URLSearchParams(hash);
      const tabName = params.get('tab');
      const itemIdQuery = params.get('item');
      if (!tabName || !itemIdQuery) return;

      const targetOriginalCatIndex = todoStore.categories.findIndex((c: TodoCategoryType) => c.name === tabName);
      if (targetOriginalCatIndex === -1) return;
      
      let targetOriginalItemIndex = -1;
      if (itemIdQuery.includes('index=')) {
        targetOriginalItemIndex = parseInt(itemIdQuery.replace('index=', ''), 10);
      } else {
        targetOriginalItemIndex = todoStore.categories[targetOriginalCatIndex].todos.findIndex((todo: TodoItemType) => parseTodoContent(todo.content).idPart === itemIdQuery);
      }
      
      if (targetOriginalItemIndex === -1 || targetOriginalItemIndex >= todoStore.categories[targetOriginalCatIndex].todos.length) return;
      
      const isTabVisible = todoStore.filteredCategoryInfo.find(fci => fci.name === tabName)?.isVisible;
      if (isTabVisible) {
        setActiveTabIndex(targetOriginalCatIndex);
        setFocusedItem({ categoryIndex: targetOriginalCatIndex, itemIndex: targetOriginalItemIndex });
      }
      
    } catch (err) {
      console.error('Error handling URL hash:', err);
    }
  }, [todoStore.filteredCategories, todoStore.categories, setActiveTabIndex, setFocusedItem, todoStore.filteredCategoryInfo]);

  const renderTabs = () => {
    const activeOriginalCategory = todoStore.categories[activeTabIndex];
    const activeCategoryDataInFiltered = todoStore.filteredCategories.find(cat => cat.name === activeOriginalCategory?.name);
    const itemCount = activeCategoryDataInFiltered?.todos.length || 0;

    const TabRow = ({ index, style }: { index: number, style: React.CSSProperties }) => {
      if (!activeCategoryDataInFiltered) return null;
      const todo = activeCategoryDataInFiltered.todos[index];
      
      const originalCatIdx = activeTabIndex;
      const originalItemIdx = todoStore.categories[originalCatIdx]?.todos.findIndex(t => t.location === todo.location && t.content === todo.content) ?? -1;

      const searchInputIsActive = !!(searchInputRef.current && document.activeElement === searchInputRef.current);
      const isFocused = !searchInputIsActive && focusedItem.categoryIndex === originalCatIdx && focusedItem.itemIndex === originalItemIdx;

      return (
        <div style={style}>
          <TodoItem
            key={`${todo.location}-${index}`}
            todo={todo}
            isFocused={isFocused}
            onClick={() => setFocusedItem({ categoryIndex: originalCatIdx, itemIndex: originalItemIdx })}
            categoryIndex={originalCatIdx}
            itemIndex={originalItemIdx}
          />
        </div>
      );
    };

    return (
      <div className="relative flex flex-col flex-grow min-h-0">
        <div ref={tabHeaderRef} className="sticky top-0 z-10 bg-white dark:bg-neutral-900 shadow-sm flex-shrink-0">
          <div className="flex flex-wrap border-b border-border-color dark:border-neutral-700 text-xs overflow-visible">
            {todoStore.filteredCategoryInfo.filter(info => info.isVisible).map((categoryInfo, visibleTabIndex) => {
              const originalCatIdx = todoStore.categories.findIndex(c => c.name === categoryInfo.name);
              return (
              <button
                key={categoryInfo.name}
                className={`px-2 py-1 my-1 mr-1 font-medium ${ 
                  activeTabIndex === originalCatIdx
                  ? 'border-b-2 border-accent-color font-bold dark:text-neutral-200'
                  : 'text-subtle-color dark:text-neutral-400'
                }`}
                onClick={() => {
                  setActiveTabIndex(originalCatIdx);
                  if (tabListRef.current) tabListRef.current.scrollToItem(0);
                }}
              >
                <NerdFontIcon icon={categoryInfo.icon} category={categoryInfo.name} className="text-sm" />
                {categoryInfo.name}
                <span className="ml-1 text-subtle-color dark:text-neutral-500">
                  ({todoStore.categories[originalCatIdx]?.todos.filter(t => isStatusDoneLike(t.status, appConfig)).length || 0}/
                  {categoryInfo.totalCount})
                </span>
              </button>
            )})}
          </div>
        </div>

        <div className="flex-grow min-h-0">
          {itemCount > 0 && activeCategoryDataInFiltered ? (
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
              No todos in this category or category not found
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
                    key={`${item.todo.location}-${item.flatIndex}`}
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

  const handleCloseAddTodoModal = useCallback(() => {
    todoStore.closeAddTodoModal();
  }, []);

  const handleSubmitAddTodoModal = useCallback((todoText: string, categoryType: "git" | "project", categoryName: string) => {
    if (todoStore.addTodoModalData) {
      todoStore.submitAddTodo({
        content: todoText,
        categoryName,
        categoryType,
        exampleItemLocation: todoStore.addTodoModalData.exampleItemLocation
      });
    }
  }, []);

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
          {availableProfiles.length > 1 && (
            <select
              value={activeProfileName || ''}
              onChange={(e) => switchActiveProfile(e.target.value)}
              disabled={profilesLoading || todoStore.loading}
              className="hn-filter-button text-xs dark:hover:bg-neutral-700 dark:text-neutral-300 appearance-none bg-white dark:bg-neutral-800/50 pr-5"
              title="Switch Profile (Shift+H/L)"
              style={{ 
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: 'right 0.2rem center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '1.2em 1.2em',
                paddingRight: '1.5rem' 
              }}
            >
              {availableProfiles.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          )}
          <button
            className="hn-filter-button dark:hover:bg-neutral-700 dark:text-neutral-300"
            onClick={() => loadData()}
            title="Refresh data (Ctrl+R)"
          >
            <span className="inline-block">↻</span>
          </button>
          
          <button
            className={`hn-filter-button ${displayMode === 'tab' ? 'active' : ''} dark:hover:bg-neutral-700 dark:text-neutral-300`}
            onClick={() => toggleDisplayMode()}
            title={`Switch to ${displayMode === 'section' ? 'tab' : displayMode === 'tab' ? 'table' : 'section'} mode (m)`}
          >
            {displayMode === 'section' ? '≡' : displayMode === 'tab' ? '▦' : '⊞'}
          </button>
          
          <button
            className="hn-filter-button text-xs dark:hover:bg-neutral-700 dark:text-neutral-300"
            title="Toggle dark mode"
            aria-label="Toggle dark mode"
            onClick={() => toggleDarkMode()}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          
          <button
            className="hn-filter-button text-xs dark:hover:bg-neutral-700 dark:text-neutral-300"
            title="Keyboard shortcuts (?)"
            aria-label="Show keyboard shortcuts"
            onClick={() => toggleKeyboardHelp()}
          >
            ⌨️
          </button>
          
          <Link
            href="config"
            prefetch={false}
            className="hn-filter-button text-xs dark:hover:bg-neutral-700 dark:text-neutral-300"
            title="Configure Unitodo"
            aria-label="Configure Unitodo"
          >
            ⚙️
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
            All ({totalTodos})
          </button>
          <button 
            className={`hn-filter-button ${filter === 'active' ? 'active' : ''} dark:hover:bg-neutral-700 dark:text-neutral-300 ml-1`}
            onClick={() => setFilter('active')}
            title="Active todos (2)"
          >
            Active ({activeTodos})
          </button>
          <button 
            className={`hn-filter-button ${filter === 'closed' ? 'active' : ''} dark:hover:bg-neutral-700 dark:text-neutral-300 ml-1`}
            onClick={() => setFilter('closed')}
            title="Closed todos (3)"
          >
            Closed ({completedTodos})
          </button>
        </div>
      </div>
      
      <div className="flex-grow min-h-0 flex flex-col">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-md p-3 text-xs dark:text-red-100 flex-grow">
            <strong>Error:</strong> {error}
          </div>
        )}
        {!error && displayMode === 'table' && (
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
        )}
        {!error && (displayMode === 'section' || displayMode === 'tab') && 
          ( (displayMode === 'section' && flattenedList.length > 0) || (displayMode === 'tab' && todoStore.filteredCategoryInfo.filter(info => info.isVisible).length > 0) ) ? (
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
          !error && (displayMode === 'section' || displayMode === 'tab') && (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="24" height="24" rx="4" fill="currentColor" fillOpacity="0.1"/>
              <path d="M5 14L8.23309 16.4248C8.66178 16.7463 9.26772 16.6728 9.60705 16.2581L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <h3>No todos found</h3>
            <p>Try changing your search or filter settings, or check your configuration.</p>
          </div>
          )
        )}
      </div>
      
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
              Note: Shortcuts only work when not editing text (or in search bar for some keys)
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              <div className="col-span-2 font-medium text-xs text-neutral-600 dark:text-neutral-300 mt-1.5 mb-1 border-b dark:border-neutral-700 pb-1">Navigation</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">↑</kbd> / <kbd className="dark:bg-neutral-700 dark:border-neutral-600">k</kbd> Navigate up</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">↓</kbd> / <kbd className="dark:bg-neutral-700 dark:border-neutral-600">j</kbd> Navigate down</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">Shift</kbd>+<kbd className="dark:bg-neutral-700 dark:border-neutral-600">↑/k</kbd> Navigate up 5</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">Shift</kbd>+<kbd className="dark:bg-neutral-700 dark:border-neutral-600">↓/j</kbd> Navigate down 5</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">←</kbd> / <kbd className="dark:bg-neutral-700 dark:border-neutral-600">h</kbd> Previous tab (Tab mode)</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">→</kbd> / <kbd className="dark:bg-neutral-700 dark:border-neutral-600">l</kbd> Next tab (Tab mode)</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">Shift</kbd>+<kbd className="dark:bg-neutral-700 dark:border-neutral-600">H</kbd> Previous Profile</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">Shift</kbd>+<kbd className="dark:bg-neutral-700 dark:border-neutral-600">L</kbd> Next Profile</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">Esc</kbd> Exit edit mode / Close modal</div>
              
              <div className="col-span-2 font-medium text-xs text-neutral-600 dark:text-neutral-300 mt-1.5 mb-1 border-b dark:border-neutral-700 pb-1">Todo actions (on focused item)</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">a</kbd> / <kbd className="dark:bg-neutral-700 dark:border-neutral-600">i</kbd> Edit (cursor at end)</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">Shift</kbd>+<kbd className="dark:bg-neutral-700 dark:border-neutral-600">I</kbd> Edit (cursor after priority)</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">o</kbd> Add todo to current context</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">x</kbd> Append ignore comment</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">Space</kbd> Toggle completion</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">Enter</kbd> Open in editor / Submit edit</div>
              
              <div className="col-span-2 font-medium text-xs text-neutral-600 dark:text-neutral-300 mt-1.5 mb-1 border-b dark:border-neutral-700 pb-1">Global</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">?</kbd> Toggle this shortcut help</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">d</kbd> Toggle dark mode</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">/</kbd> or <kbd className="dark:bg-neutral-700 dark:border-neutral-600">Ctrl</kbd>+<kbd className="dark:bg-neutral-700 dark:border-neutral-600">/</kbd> Focus search</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">m</kbd> Switch view mode</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">Ctrl</kbd>+<kbd className="dark:bg-neutral-700 dark:border-neutral-600">R</kbd> Refresh data</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">1</kbd> Filter: All</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">2</kbd> Filter: Active</div>
              <div><kbd className="dark:bg-neutral-700 dark:border-neutral-600">3</kbd> Filter: Closed</div>
            </div>
          </div>
        </div>
      )}
      
      {showAddTodoModal && addTodoModalData && (
        <AddTodoModal
          isOpen={showAddTodoModal}
          onClose={handleCloseAddTodoModal}
          onSubmit={handleSubmitAddTodoModal}
          categoryName={addTodoModalData.categoryName}
          categoryType={addTodoModalData.categoryType}
        />
      )}
    </div>
  );
});

export default Todo; 