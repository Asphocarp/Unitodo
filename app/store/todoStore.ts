import { create } from 'zustand';
import { TodoCategory, TodoItem } from '../types';
import { fetchTodoData, editTodoItem } from '../services/todoService';

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
  
  // Actions
  loadData: () => Promise<void>;
  setFilter: (filter: 'all' | 'completed' | 'active') => void;
  setSearchQuery: (query: string) => void;
  toggleDisplayMode: () => void;
  setActiveTabIndex: (index: number) => void;
  setFocusedItem: (item: { categoryIndex: number, itemIndex: number }) => void;
  toggleKeyboardHelp: () => void;
  updateTodo: (updatedTodo: TodoItem) => void;
  navigateTodos: (direction: 'up' | 'down') => void;
}

export const useTodoStore = create<TodoState>((set, get) => ({
  // Initial state
  categories: [],
  loading: true,
  error: null,
  lastUpdated: null,
  
  filter: 'all',
  searchQuery: '',
  displayMode: 'section',
  activeTabIndex: 0,
  focusedItem: { categoryIndex: -1, itemIndex: -1 },
  showKeyboardHelp: false,
  
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
        console.log("Data unchanged, skipping state update.");
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
  
  setActiveTabIndex: (activeTabIndex) => set({ activeTabIndex }),
  
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
  
  navigateTodos: (direction) => {
    const state = get();
    const { categoryIndex, itemIndex } = state.focusedItem;
    const { displayMode, activeTabIndex } = state;
    const filteredCategories = getFilteredCategories(state);
    
    if (displayMode === 'tab') {
      // In tab mode, navigation is within the active tab
      const todos = filteredCategories[activeTabIndex]?.todos || [];
      const totalItems = todos.length;
      
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
        set({
          focusedItem: {
            categoryIndex: activeTabIndex,
            itemIndex: itemIndex - 1
          }
        });
      }
      // Moving down
      else if (direction === 'down' && itemIndex < totalItems - 1) {
        set({
          focusedItem: {
            categoryIndex: activeTabIndex,
            itemIndex: itemIndex + 1
          }
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
      
      const currentCategoryTodos = filteredCategories[categoryIndex]?.todos || [];
      
      // Moving up
      if (direction === 'up') {
        if (itemIndex > 0) {
          // Move up within the same category
          set({
            focusedItem: {
              categoryIndex,
              itemIndex: itemIndex - 1
            }
          });
        } else if (categoryIndex > 0) {
          // Move to the last item of the previous category
          const prevCatIndex = categoryIndex - 1;
          const prevCatLastItemIndex = filteredCategories[prevCatIndex].todos.length - 1;
          set({
            focusedItem: {
              categoryIndex: prevCatIndex,
              itemIndex: prevCatLastItemIndex
            }
          });
        }
      }
      // Moving down
      else if (direction === 'down') {
        if (itemIndex < currentCategoryTodos.length - 1) {
          // Move down within the same category
          set({
            focusedItem: {
              categoryIndex,
              itemIndex: itemIndex + 1
            }
          });
        } else if (categoryIndex < filteredCategories.length - 1) {
          // Move to the first item of the next category
          set({
            focusedItem: {
              categoryIndex: categoryIndex + 1,
              itemIndex: 0
            }
          });
        }
      }
    }
  }
}));

// Helper function to filter categories based on filter state and search query
export const getFilteredCategories = (state: TodoState) => {
  return state.categories.map(category => {
    const filteredTodos = category.todos.filter(todo => {
      let matchesFilter = true;
      if (state.filter === 'completed') matchesFilter = todo.completed;
      if (state.filter === 'active') matchesFilter = !todo.completed;

      // If we have a search query, match against content or location
      const matchesSearch = !state.searchQuery || 
        todo.content.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        todo.location.toLowerCase().includes(state.searchQuery.toLowerCase());

      return matchesFilter && matchesSearch;
    });

    return {
      ...category,
      todos: filteredTodos
    };
  }).filter(category => category.todos.length > 0);
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