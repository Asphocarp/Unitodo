import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { TodoCategory, TodoItem, Config as AppConfig } from '../types';
import { fetchTodoData } from '../services/todoService';
import { editTodoItem, addTodoItem } from '../services/todoService';
import { parseTodoContent } from '../utils';
import useConfigStore from './configStore';

interface FilteredCategoryInfo {
  name: string;
  filteredTodoCount: number;
}

interface TodoState {
  // Data
  categories: TodoCategory[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // UI state
  filter: 'all' | 'completed' | 'active';
  searchQuery: string;
  displayMode: 'section' | 'tab' | 'table';
  activeTabIndex: number;
  focusedItem: { categoryIndex: number, itemIndex: number };
  showKeyboardHelp: boolean;
  
  // Modal state
  showAddTodoModal: boolean;
  addTodoModalData: {
    categoryType: 'git' | 'project';
    categoryName: string;
    exampleItemLocation?: string;
  } | null;
  
  // Actions
  loadData: () => Promise<void>;
  setFilter: (filter: 'all' | 'completed' | 'active') => void;
  setSearchQuery: (query: string) => void;
  toggleDisplayMode: () => void;
  setActiveTabIndex: (index: number) => void;
  setFocusedItem: (item: { categoryIndex: number, itemIndex: number }) => void;
  toggleKeyboardHelp: () => void;
  updateTodo: (updatedTodo: TodoItem) => void;
  navigateTodos: (direction: 'up' | 'down', jumpSize?: number) => void;
  navigateTabs: (direction: 'left' | 'right') => void;
  openAddTodoModal: (categoryType: 'git' | 'project', categoryName: string, exampleItemLocation?: string) => void;
  closeAddTodoModal: () => void;
  submitAddTodo: (content: string) => Promise<void>;
}

export const useTodoStore = create<TodoState>((set, get) => ({
  // Initial state
  categories: [],
  loading: true,
  error: null,
  lastUpdated: null,
  
  filter: 'all',
  searchQuery: '',
  displayMode: 'table',
  activeTabIndex: 0,
  focusedItem: { categoryIndex: -1, itemIndex: -1 },
  showKeyboardHelp: false,
  
  // Modal state
  showAddTodoModal: false,
  addTodoModalData: null,
  
  // Actions
  loadData: async () => {
    const isInitialMount = get().loading;
    
    try {
      if (isInitialMount) {
        set({ loading: true });
      }
      
      const newData = await fetchTodoData();
      const currentCategories = get().categories;
      
      // Only update if data has changed
      if (JSON.stringify(currentCategories) !== JSON.stringify(newData)) {
        console.log("Data changed, updating state...");
        set({ 
          categories: newData,
          lastUpdated: new Date()
        });
        
        // Reset active tab index if categories change and the current one no longer exists
        if (get().activeTabIndex >= newData.length) {
          set({ activeTabIndex: 0 });
        }
      } else {
        // console.log("Data unchanged, skipping state update.");
      }
      
      set({ error: null });
    } catch (err) {
      set({ 
        error: 'Failed to load todo data. Please try again later.' 
      });
      console.error('Error loading todo data:', err);
    } finally {
      if (isInitialMount) {
        set({ loading: false });
      }
    }
  },
  
  setFilter: (filter) => set({ filter }),
  
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  
  toggleDisplayMode: () => set((state) => {
    const newDisplayMode = state.displayMode === 'section'
      ? 'tab'
      : state.displayMode === 'tab'
        ? 'table'
        : 'section';

    let newFocusedItem = { ...state.focusedItem }; // Start with current focus
    let newActiveTabIndex = state.activeTabIndex;

    if (newDisplayMode === 'table') {
      newActiveTabIndex = -1; 
      const globallySortedTodos = getGloballySortedAndFilteredTodos(state);
      if (globallySortedTodos.length > 0) {
        const currentItemInSortedList = globallySortedTodos.find(
          item => item.categoryIndex === state.focusedItem.categoryIndex && item.itemIndex === state.focusedItem.itemIndex
        );
        if (currentItemInSortedList) {
          newFocusedItem = { categoryIndex: currentItemInSortedList.categoryIndex, itemIndex: currentItemInSortedList.itemIndex };
        } else {
          newFocusedItem = { categoryIndex: globallySortedTodos[0].categoryIndex, itemIndex: globallySortedTodos[0].itemIndex };
        }
      } else {
        newFocusedItem = { categoryIndex: -1, itemIndex: -1 };
      }
    } else if (state.displayMode === 'table') { // Switching FROM table mode
      const filteredCategoryInfo = getFilteredCategoryInfo(state);
      const currentOriginalFocusedItem = state.focusedItem; // This holds original indices

      if (newDisplayMode === 'tab') {
        if (currentOriginalFocusedItem.categoryIndex !== -1 && currentOriginalFocusedItem.categoryIndex < state.categories.length) {
          const originalFocusedCategoryName = state.categories[currentOriginalFocusedItem.categoryIndex].name;
          const targetTabIndexInFiltered = filteredCategoryInfo.findIndex(info => info.name === originalFocusedCategoryName);
          if (targetTabIndexInFiltered !== -1) {
            newActiveTabIndex = targetTabIndexInFiltered;
            const hasItems = filteredCategoryInfo[newActiveTabIndex]?.filteredTodoCount > 0;
            newFocusedItem = { categoryIndex: newActiveTabIndex, itemIndex: hasItems ? 0 : -1 }; 
          } else {
            newActiveTabIndex = 0;
            const hasItems = filteredCategoryInfo[newActiveTabIndex]?.filteredTodoCount > 0;
            newFocusedItem = { categoryIndex: newActiveTabIndex, itemIndex: hasItems ? 0 : -1 };
          }
        } else {
          newActiveTabIndex = 0;
          const hasItems = filteredCategoryInfo[newActiveTabIndex]?.filteredTodoCount > 0;
          newFocusedItem = { categoryIndex: newActiveTabIndex, itemIndex: hasItems ? 0 : -1 };
        }
      } else { // Switching from table to section mode
        // focusedItem already holds original indices, check if it's visible in the filtered section view
        const itemToKeepFocus = state.categories[currentOriginalFocusedItem.categoryIndex]?.todos[currentOriginalFocusedItem.itemIndex];
        let isVisibleInFiltered = false;
        if (itemToKeepFocus) {
            const filteredCats = getFilteredCategories(state);
            for (const fCat of filteredCats) {
                if (fCat.name === state.categories[currentOriginalFocusedItem.categoryIndex].name) {
                    if (fCat.todos.some(t => t.location === itemToKeepFocus.location && t.content === itemToKeepFocus.content)) {
                        isVisibleInFiltered = true;
                        // newFocusedItem remains state.focusedItem (original indices)
                        break;
                    }
                }
            }
        }
        if (!isVisibleInFiltered) {
            // Reset focus to first item of first filtered category in section view (using original indices)
            const firstFilteredCat = getFilteredCategories(state)[0];
            if (firstFilteredCat && firstFilteredCat.todos.length > 0) {
                const originalCatIdx = state.categories.findIndex(c => c.name === firstFilteredCat.name);
                const originalItemIdx = originalCatIdx !== -1 ? state.categories[originalCatIdx].todos.findIndex(t => t.location === firstFilteredCat.todos[0].location && t.content === firstFilteredCat.todos[0].content) : -1;
                newFocusedItem = { categoryIndex: originalCatIdx, itemIndex: originalItemIdx !== -1 ? originalItemIdx : -1 };
            } else {
                newFocusedItem = { categoryIndex: -1, itemIndex: -1 };
            }
        }
        // For section mode, activeTabIndex is not directly used for focus like in tab mode.
        // We can set it to the category of the focused item if one exists.
        if (newFocusedItem.categoryIndex !== -1) {
            const focusedCatName = state.categories[newFocusedItem.categoryIndex].name;
            newActiveTabIndex = getFilteredCategoryInfo(state).findIndex(info => info.name === focusedCatName);
            if (newActiveTabIndex === -1) newActiveTabIndex = 0; // Fallback
        } else {
            newActiveTabIndex = 0;
        }
      }
    } else if (newDisplayMode === 'tab' || newDisplayMode === 'section') {
        // If switching between tab and section, or section to tab, ensure focus is logical.
        // setActiveTabIndex handles focusing for tab mode. For section mode, if an item is focused, keep it.
        // If not, focus first item of first category.
        // This part primarily ensures focusedItem indices are correct for the target mode if not coming from 'table'
        if (newDisplayMode === 'section') {
            // If currently in tab mode and switching to section
            if (state.displayMode === 'tab' && state.activeTabIndex !== -1 && state.focusedItem.itemIndex !== -1) {
                const activeFilteredCategory = getFilteredCategories(state)[state.activeTabIndex];
                if (activeFilteredCategory && activeFilteredCategory.todos.length > state.focusedItem.itemIndex) {
                    const focusedTodo = activeFilteredCategory.todos[state.focusedItem.itemIndex];
                    const originalCatIdx = state.categories.findIndex(c => c.name === activeFilteredCategory.name);
                    const originalItemIdx = originalCatIdx !== -1 ? state.categories[originalCatIdx].todos.findIndex(t => t.location === focusedTodo.location && t.content === focusedTodo.content) : -1;
                    if (originalCatIdx !== -1 && originalItemIdx !== -1) {
                        newFocusedItem = { categoryIndex: originalCatIdx, itemIndex: originalItemIdx };
                    } else { // Fallback
                        const firstFilteredCat = getFilteredCategories(state)[0];
                        if (firstFilteredCat && firstFilteredCat.todos.length > 0) {
                            const ogCatIdx = state.categories.findIndex(c => c.name === firstFilteredCat.name);
                            const ogItmIdx = ogCatIdx !== -1 ? state.categories[ogCatIdx].todos.findIndex(t => t.location === firstFilteredCat.todos[0].location && t.content === firstFilteredCat.todos[0].content) : -1;
                            newFocusedItem = { categoryIndex: ogCatIdx, itemIndex: ogItmIdx !== -1 ? ogItmIdx : -1 };
                        } else {
                            newFocusedItem = { categoryIndex: -1, itemIndex: -1 };
                        }
                    }
                }
            } else if (state.focusedItem.categoryIndex === -1 || state.focusedItem.itemIndex === -1) {
                 const firstFilteredCat = getFilteredCategories(state)[0];
                 if (firstFilteredCat && firstFilteredCat.todos.length > 0) {
                    const originalCatIdx = state.categories.findIndex(c => c.name === firstFilteredCat.name);
                    const originalItemIdx = originalCatIdx !== -1 ? state.categories[originalCatIdx].todos.findIndex(t => t.location === firstFilteredCat.todos[0].location && t.content === firstFilteredCat.todos[0].content) : -1;
                    newFocusedItem = { categoryIndex: originalCatIdx, itemIndex: originalItemIdx !== -1 ? originalItemIdx : -1 };
                 } else {
                    newFocusedItem = { categoryIndex: -1, itemIndex: -1 };
                 }
            }
            // newActiveTabIndex for section mode would be the index of the focused category in filteredCategoryInfo
            if (newFocusedItem.categoryIndex !== -1) {
                const focusedCatName = state.categories[newFocusedItem.categoryIndex].name;
                newActiveTabIndex = getFilteredCategoryInfo(state).findIndex(info => info.name === focusedCatName);
                if (newActiveTabIndex === -1) newActiveTabIndex = 0; 
            } else {
                newActiveTabIndex = 0;
            }
        } else if (newDisplayMode === 'tab') {
            // If switching from section to tab, setActiveTabIndex will handle it
            // The current newActiveTabIndex (derived from section or default) will be used by setActiveTabIndex
            // And setActiveTabIndex will reset focus appropriately for that tab.
            const hasItems = getFilteredCategoryInfo(state)[newActiveTabIndex]?.filteredTodoCount > 0;
            newFocusedItem = {categoryIndex: newActiveTabIndex, itemIndex: hasItems ? 0 : -1 };
        }
    }

    return {
      displayMode: newDisplayMode,
      focusedItem: newFocusedItem, // This is now complex, ensure it holds original indices for table/section, filtered for tab
      activeTabIndex: newActiveTabIndex,
    };
  }),
  
  setActiveTabIndex: (activeTabIndex) => set((state) => {
    const filteredCategoryInfo = getFilteredCategoryInfo(state);
    const hasItems = filteredCategoryInfo[activeTabIndex]?.filteredTodoCount > 0;
    
    return { 
      activeTabIndex,
      focusedItem: { 
        categoryIndex: activeTabIndex, 
        itemIndex: hasItems ? 0 : -1 
      }
    };
  }),
  
  setFocusedItem: (focusedItem) => set({ focusedItem }),
  
  toggleKeyboardHelp: () => set((state) => ({ 
    showKeyboardHelp: !state.showKeyboardHelp 
  })),
  
  updateTodo: (updatedTodo) => {
    set((state) => {
      // Create a deep copy of categories
      const updatedCategories = state.categories.map(category => {
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
      
      return {
        categories: updatedCategories,
        lastUpdated: new Date()
      };
    });
  },
  
  navigateTodos: (direction, jumpSize = 1) => {
    const state = get();
    const { categoryIndex, itemIndex } = state.focusedItem;
    const { displayMode, activeTabIndex, categories: originalCategories } = state;
    
    if (displayMode === 'table') {
      const globallySortedTodos = getGloballySortedAndFilteredTodos(state);
      if (globallySortedTodos.length === 0) {
        set({ focusedItem: { categoryIndex: -1, itemIndex: -1 } });
        return;
      }

      let currentIndexInSortedList = -1;
      // focusedItem contains original categoryIndex and itemIndex
      if (categoryIndex !== -1 && itemIndex !== -1) { 
        currentIndexInSortedList = globallySortedTodos.findIndex(
          item => item.categoryIndex === categoryIndex && item.itemIndex === itemIndex
        );
      }

      if (currentIndexInSortedList === -1) { 
        const newIndex = direction === 'up' ? globallySortedTodos.length - 1 : 0;
        const newItem = globallySortedTodos[newIndex];
        // Set focusedItem with original indices from the sorted list item
        set({ focusedItem: { categoryIndex: newItem.categoryIndex, itemIndex: newItem.itemIndex } });
        return;
      }

      let newSortedIndex: number;
      if (direction === 'up') {
        newSortedIndex = Math.max(0, currentIndexInSortedList - jumpSize);
      } else { // down
        newSortedIndex = Math.min(globallySortedTodos.length - 1, currentIndexInSortedList + jumpSize);
      }

      if (newSortedIndex !== currentIndexInSortedList) {
        const newItem = globallySortedTodos[newSortedIndex];
        set({ focusedItem: { categoryIndex: newItem.categoryIndex, itemIndex: newItem.itemIndex } });
      }
      return;
    }
    
    const filteredCategoryInfo = getFilteredCategoryInfo(state);
    const filteredCategories = getFilteredCategories(state);

    if (displayMode === 'tab') {
      // In tab mode, focusedItem.categoryIndex is activeTabIndex (index in filteredCategoryInfo)
      // focusedItem.itemIndex is index within filteredCategoryInfo[activeTabIndex].filteredTodos
      const currentFilteredCategory = filteredCategories[activeTabIndex];
      if (!currentFilteredCategory || currentFilteredCategory.todos.length === 0) return;

      const totalItems = currentFilteredCategory.todos.length;
      let currentLocalItemIndex = itemIndex; // This is already the local index for the tab

      if (itemIndex === -1) { // Nothing focused yet in this tab
        if (totalItems > 0) {
          currentLocalItemIndex = direction === 'up' ? totalItems - 1 : 0;
          const focusedTodoInFiltered = currentFilteredCategory.todos[currentLocalItemIndex];
          const originalCatIdx = originalCategories.findIndex(c => c.name === currentFilteredCategory.name);
          const originalItmIdx = originalCatIdx !== -1 ? originalCategories[originalCatIdx].todos.findIndex(t => t.location === focusedTodoInFiltered.location && t.content === focusedTodoInFiltered.content) : -1;
          set({ focusedItem: { categoryIndex: activeTabIndex, itemIndex: currentLocalItemIndex }}); // Store filtered indices for tab
        }
        return;
      }

      let newLocalItemIndex = currentLocalItemIndex;
      if (direction === 'up') {
        newLocalItemIndex = Math.max(0, currentLocalItemIndex - jumpSize);
      } else if (direction === 'down') {
        newLocalItemIndex = Math.min(totalItems - 1, currentLocalItemIndex + jumpSize);
      }
      
      if (newLocalItemIndex !== currentLocalItemIndex) {
        const focusedTodoInFiltered = currentFilteredCategory.todos[newLocalItemIndex];
        const originalCatIdx = originalCategories.findIndex(c => c.name === currentFilteredCategory.name);
        const originalItmIdx = originalCatIdx !== -1 ? originalCategories[originalCatIdx].todos.findIndex(t => t.location === focusedTodoInFiltered.location && t.content === focusedTodoInFiltered.content) : -1;
        set({ focusedItem: { categoryIndex: activeTabIndex, itemIndex: newLocalItemIndex }}); // Store filtered indices for tab
      }

    } else if (displayMode === 'section') {
      // In section mode, focusedItem.categoryIndex is index in filteredCategories
      // focusedItem.itemIndex is index within filteredCategories[categoryIndex].todos
      if (filteredCategories.length === 0) return;

      let currentGlobalFlatIndex = -1;
      let flatFilteredItems: { todo: TodoItem, catIdxFiltered: number, itemIdxFiltered: number }[] = [];
      let flatIdxCounter = 0;
      filteredCategories.forEach((cat, cIdx) => {
        cat.todos.forEach((td, iIdx) => {
          flatFilteredItems.push({ todo: td, catIdxFiltered: cIdx, itemIdxFiltered: iIdx });
          if (cIdx === categoryIndex && iIdx === itemIndex) {
            currentGlobalFlatIndex = flatIdxCounter;
          }
          flatIdxCounter++;
        });
      });

      if (flatFilteredItems.length === 0) return;

      if (currentGlobalFlatIndex === -1) { // Nothing focused or focused item not in list
        const newFlatIdx = direction === 'up' ? flatFilteredItems.length - 1 : 0;
        const newItemInfo = flatFilteredItems[newFlatIdx];
        set({ focusedItem: { categoryIndex: newItemInfo.catIdxFiltered, itemIndex: newItemInfo.itemIdxFiltered } }); // Store filtered indices
        return;
      }

      let newFlatIndex: number;
      if (direction === 'up') {
        newFlatIndex = Math.max(0, currentGlobalFlatIndex - jumpSize);
      } else { // down
        newFlatIndex = Math.min(flatFilteredItems.length - 1, currentGlobalFlatIndex + jumpSize);
      }

      if (newFlatIndex !== currentGlobalFlatIndex) {
        const newItemInfo = flatFilteredItems[newFlatIndex];
        set({ focusedItem: { categoryIndex: newItemInfo.catIdxFiltered, itemIndex: newItemInfo.itemIdxFiltered } }); // Store filtered indices
      }
    }
  },

  navigateTabs: (direction) => {
    const state = get();
    const filteredCategoryInfo = getFilteredCategoryInfo(state);
    const { activeTabIndex } = state;
    
    if (direction === 'left' && activeTabIndex > 0) {
      const newTabIndex = activeTabIndex - 1;
      const hasItems = filteredCategoryInfo[newTabIndex]?.filteredTodoCount > 0;
      set({ 
        activeTabIndex: newTabIndex,
        focusedItem: { 
          categoryIndex: newTabIndex, 
          itemIndex: hasItems ? 0 : -1 
        }
      });
    } else if (direction === 'right' && activeTabIndex < filteredCategoryInfo.length - 1) {
      const newTabIndex = activeTabIndex + 1;
      const hasItems = filteredCategoryInfo[newTabIndex]?.filteredTodoCount > 0;
      set({ 
        activeTabIndex: newTabIndex,
        focusedItem: { 
          categoryIndex: newTabIndex, 
          itemIndex: hasItems ? 0 : -1 
        }
      });
    }
  },

  // Open the add todo modal with the given data
  openAddTodoModal: (categoryType, categoryName, exampleItemLocation) => {
    set({ 
      showAddTodoModal: true, 
      addTodoModalData: { 
        categoryType, 
        categoryName, 
        exampleItemLocation 
      } 
    });
  },

  // Close the add todo modal
  closeAddTodoModal: () => {
    set({ 
      showAddTodoModal: false, 
      addTodoModalData: null 
    });
  },

  // Submit the new todo content from the modal
  submitAddTodo: async (content) => {
    const { addTodoModalData, loadData, closeAddTodoModal } = get();
    
    if (!addTodoModalData || !content || content.trim() === '') {
      console.log('Invalid todo data or empty content');
      return;
    }

    const { categoryType, categoryName, exampleItemLocation } = addTodoModalData;
    const appConfig = useConfigStore.getState().config;

    let payload: Parameters<typeof addTodoItem>[0] = {
      category_type: categoryType,
      category_name: categoryName,
      content: content.trim(),
    };

    if (categoryType === 'git') {
      if (!exampleItemLocation) {
        alert('Cannot add TODO to git section without an example item location to find the repository.'); // UNITODO_IGNORE_LINE
        console.error('Missing exampleItemLocation for git type');
        closeAddTodoModal();
        return;
      }
      payload.example_item_location = exampleItemLocation;
    } else if (categoryType === 'project') {
      // Check if append_file_path is configured for this project
      if (!appConfig || !appConfig.projects[categoryName]?.append_file_path) {
        alert(`Cannot add TODO: 'append_file_path' is not configured for project "${categoryName}". Please configure it on the Config page.`); // UNITODO_IGNORE_LINE
        closeAddTodoModal();
        return;
      }
    }

    try {
      set({ error: null });
      await addTodoItem(payload);
      await loadData(); // Reload data to show the new todo
      closeAddTodoModal();
    } catch (err: any) {
      console.error('Error adding new todo:', err);
      set({ error: err.message || 'Failed to add new TODO.' }); // UNITODO_IGNORE_LINE
      alert(`Error adding TODO: ${err.message || 'Unknown error'}`); // UNITODO_IGNORE_LINE
      closeAddTodoModal();
    }
  },

  // Legacy function to handle the old approach, now uses the modal
  addNewTodo: (categoryType: 'git' | 'project', categoryName: string, exampleItemLocation?: string) => {
    const { openAddTodoModal } = get();
    openAddTodoModal(categoryType, categoryName, exampleItemLocation);
  }
}));

// Helper function to filter categories based on filter state and search query
export const getFilteredCategories = (state: TodoState) => {
  const startTime = performance.now();
  
  const result: TodoCategory[] = [];
  const lowerCaseSearchQuery = state.searchQuery.toLowerCase();
  const noFilterNeeded = state.searchQuery === '' && state.filter === 'all';

  for (const category of state.categories) {
    if (noFilterNeeded) {
      // No filtering needed, add the entire category
      result.push({ ...category });
      continue;
    }

    const filteredTodos = category.todos.filter(todo => {
      let matchesFilter = true;
      if (state.filter === 'completed') matchesFilter = todo.completed;
      if (state.filter === 'active') matchesFilter = !todo.completed;

      const matchesSearch = !state.searchQuery || 
        todo.content.toLowerCase().includes(lowerCaseSearchQuery) ||
        todo.location.toLowerCase().includes(lowerCaseSearchQuery);

      return matchesFilter && matchesSearch;
    });

    if (filteredTodos.length > 0) {
      result.push({ ...category, todos: filteredTodos });
    }
  }
  
  const endTime = performance.now();
//   console.log(`getFilteredCategories took ${endTime - startTime}ms`);
  return result;
};

// Helper function to get counts of filtered todos per category
// Optimized for navigation logic where only counts are needed.
const getFilteredCategoryInfo = (state: TodoState): FilteredCategoryInfo[] => {
  const startTime = performance.now();
  
  const result: FilteredCategoryInfo[] = [];
  const lowerCaseSearchQuery = state.searchQuery.toLowerCase();
  const noFilterNeeded = state.searchQuery === '' && state.filter === 'all';

  for (const category of state.categories) {
    if (noFilterNeeded) {
      // No filtering needed, use the total count directly
      result.push({
        name: category.name,
        filteredTodoCount: category.todos.length,
      });
      continue;
    }

    const filteredCount = category.todos.filter(todo => {
      let matchesFilter = true;
      if (state.filter === 'completed') matchesFilter = todo.completed;
      if (state.filter === 'active') matchesFilter = !todo.completed;

      const matchesSearch = !state.searchQuery ||
        todo.content.toLowerCase().includes(lowerCaseSearchQuery) ||
        todo.location.toLowerCase().includes(lowerCaseSearchQuery);

      return matchesFilter && matchesSearch;
    }).length; // Calculate length directly

    if (filteredCount > 0) {
      result.push({
        name: category.name,
        filteredTodoCount: filteredCount,
      });
    }
  }
  
  const endTime = performance.now();
//   console.log(`getFilteredCategoryInfo took ${endTime - startTime}ms`);
  return result;
};

// Selector for globally sorted and filtered todos for table view
// Returns items with their *original* categoryIndex and itemIndex
export const getGloballySortedAndFilteredTodos = (state: TodoState): { originalTodo: TodoItem, categoryIndex: number, itemIndex: number, displayContent: string }[] => {
  const allItems: { originalTodo: TodoItem, categoryIndex: number, itemIndex: number, displayContent: string }[] = [];
  const lowerCaseSearchQuery = state.searchQuery.toLowerCase();

  state.categories.forEach((category, catIdx) => {
    category.todos.forEach((todo, itemIdx) => {
      // Apply filter
      let matchesFilter = true;
      if (state.filter === 'completed') matchesFilter = todo.completed;
      if (state.filter === 'active') matchesFilter = !todo.completed;

      // Apply search
      const parsed = parseTodoContent(todo.content);
      const displayContent = parsed.mainContent || todo.content;
      const matchesSearch = !state.searchQuery ||
        displayContent.toLowerCase().includes(lowerCaseSearchQuery) ||
        (todo.location && todo.location.toLowerCase().includes(lowerCaseSearchQuery));

      if (matchesFilter && matchesSearch) {
        allItems.push({
          originalTodo: todo,
          categoryIndex: catIdx, // Index in original state.categories
          itemIndex: itemIdx,    // Index in original category.todos
          displayContent: displayContent,
        });
      }
    });
  });

  // Sort
  allItems.sort((a, b) => {
    const contentA = a.displayContent.toLowerCase();
    const contentB = b.displayContent.toLowerCase();
    if (contentA < contentB) return -1;
    if (contentA > contentB) return 1;
    // As a secondary sort criterion, use original category name then original item index for stability
    const catNameA = state.categories[a.categoryIndex]?.name.toLowerCase() || '';
    const catNameB = state.categories[b.categoryIndex]?.name.toLowerCase() || '';
    if (catNameA < catNameB) return -1;
    if (catNameA > catNameB) return 1;
    return a.itemIndex - b.itemIndex;
  });
  return allItems;
};

// Utility selectors
export const useTodoSelectors = {
  getTotalCounts: (state: TodoState) => {
    const totalTodos = state.categories.reduce((acc, category) => acc + category.todos.length, 0);
    const completedTodos = state.categories.reduce(
      (acc, category) => acc + category.todos.filter(todo => todo.completed).length,
      0
    );
    const activeTodos = totalTodos - completedTodos;
    
    return { totalTodos, completedTodos, activeTodos };
  }
}; 