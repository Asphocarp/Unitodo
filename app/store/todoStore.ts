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
  displayMode: 'section' | 'tab';
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
  displayMode: 'tab',
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
  
  toggleDisplayMode: () => set((state) => ({ 
    displayMode: state.displayMode === 'section' ? 'tab' : 'section' 
  })),
  
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
    const { displayMode, activeTabIndex } = state;
    const filteredCategoryInfo = getFilteredCategoryInfo(state);
    
    if (displayMode === 'tab') {
      // In tab mode, navigation is within the active tab
      const totalItems = filteredCategoryInfo[activeTabIndex]?.filteredTodoCount || 0;
      
      // Nothing focused yet
      if (itemIndex === -1) {
        if (totalItems > 0) {
          set({
            focusedItem: {
              categoryIndex: activeTabIndex,
              itemIndex: direction === 'up' ? totalItems - 1 : 0
            }
          });
        }
        return;
      }
      
      // Moving up
      if (direction === 'up' && itemIndex > 0) {
        // Calculate new index with boundary check
        const newIndex = Math.max(0, itemIndex - jumpSize);
        set({
          focusedItem: {
            categoryIndex: activeTabIndex,
            itemIndex: newIndex
          }
        });
      }
      // Moving down
      else if (direction === 'down' && itemIndex < totalItems - 1) {
        // Calculate new index with boundary check
        const newIndex = Math.min(totalItems - 1, itemIndex + jumpSize);
        set({
          focusedItem: {
            categoryIndex: activeTabIndex,
            itemIndex: newIndex
          }
        });
      }
    } else {
      // In section mode, navigation is across all categories
      
      // Nothing focused yet
      if (categoryIndex === -1 || itemIndex === -1) {
        if (filteredCategoryInfo.length > 0) {
          if (direction === 'up') {
            // Focus last item of last category
            const lastCatIndex = filteredCategoryInfo.length - 1;
            const lastItemIndex = filteredCategoryInfo[lastCatIndex].filteredTodoCount - 1;
            set({
              focusedItem: {
                categoryIndex: lastCatIndex,
                itemIndex: lastItemIndex
              }
            });
          } else {
            // Focus first item of first category
            set({
              focusedItem: {
                categoryIndex: 0,
                itemIndex: 0
              }
            });
          }
        }
        return;
      }
      
      // Handle multi-line jumps across categories
      // This is more complex as we need to potentially move across category boundaries
      if (direction === 'up') {
        // Moving up
        let newCatIndex = categoryIndex;
        let newItemIndex = itemIndex - jumpSize;
        
        // If we need to move to previous categories
        while (newItemIndex < 0 && newCatIndex > 0) {
          newCatIndex--;
          newItemIndex += filteredCategoryInfo[newCatIndex].filteredTodoCount;
        }
        
        // Ensure we don't go beyond the first item
        if (newItemIndex < 0) {
          newItemIndex = 0;
        }
        
        set({
          focusedItem: {
            categoryIndex: newCatIndex,
            itemIndex: newItemIndex
          }
        });
      } else {
        // Moving down
        let newCatIndex = categoryIndex;
        let newItemIndex = itemIndex + jumpSize;
        const currentCategorySize = filteredCategoryInfo[newCatIndex].filteredTodoCount;
        
        // If we need to move to next categories
        while (newItemIndex >= currentCategorySize && newCatIndex < filteredCategoryInfo.length - 1) {
          newItemIndex -= currentCategorySize;
          newCatIndex++;
          const nextCategorySize = filteredCategoryInfo[newCatIndex].filteredTodoCount;
          
          // If we're at the last category, make sure we don't exceed its bounds
          if (newCatIndex === filteredCategoryInfo.length - 1) {
            newItemIndex = Math.min(newItemIndex, nextCategorySize - 1);
          }
        }
        
        // Ensure we don't go beyond the last item
        if (newItemIndex >= filteredCategoryInfo[newCatIndex].filteredTodoCount) {
          newItemIndex = filteredCategoryInfo[newCatIndex].filteredTodoCount - 1;
        }
        
        set({
          focusedItem: {
            categoryIndex: newCatIndex,
            itemIndex: newItemIndex
          }
        });
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