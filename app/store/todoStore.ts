import { create } from 'zustand';
import { TodoCategory, TodoItem, Config as AppConfig } from '../types';
import { fetchTodoData } from '../services/todoService';
import { parseTodoContent } from '../utils';
import useConfigStore from './configStore'; // Import to get appConfig
import { useMemo } from 'react'; // Import useMemo

// Helper function to determine if a status is considered "done-like"
export const isStatusDoneLike = (status: string, appConfig: AppConfig | null): boolean => {
  if (!appConfig || !appConfig.todo_states || appConfig.todo_states.length === 0) return false;
  for (const stateSet of appConfig.todo_states) {
    if (stateSet.length >= 3 && status === stateSet[2]) return true; // 3rd state is DONE
    if (stateSet.length >= 4 && status === stateSet[3]) return true; // 4th state is CANCELLED (also done-like for filtering)
  }
  return false;
};

export interface TodoState {
  categories: TodoCategory[];
  loading: boolean;
  error: string | null;
  lastFetched: Date | null;
  focusedItem: { categoryIndex: number; itemIndex: number };
  tableEditingCell: { categoryIndex: number; itemIndex: number; initialFocus?: 'end' | 'afterPriority' } | null; 
  setTableEditingCell: (cell: { categoryIndex: number; itemIndex: number; initialFocus?: 'end' | 'afterPriority' } | null) => void;
  loadData: () => Promise<void>; 
  updateTodo: (updatedTodo: TodoItem) => void;
  setFocusedItem: (focus: { categoryIndex: number; itemIndex: number }) => void;
  navigateTodos: (direction: 'up' | 'down', step?: number) => void;
  displayMode: 'section' | 'tab' | 'table';
  activeTabIndex: number; 
  toggleDisplayMode: () => void;
  setActiveTabIndex: (index: number) => void;
  navigateTabs: (direction: 'left' | 'right') => void;
  filter: 'all' | 'active' | 'completed';
  setFilter: (filterValue: 'all' | 'active' | 'completed') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  showKeyboardHelp: boolean;
  toggleKeyboardHelp: () => void;
  showAddTodoModal: boolean;
  addTodoModalData: { categoryType: 'git' | 'project'; categoryName: string; exampleItemLocation?: string } | null;
  openAddTodoModal: (categoryType: 'git' | 'project', categoryName: string, exampleItemLocation?: string) => void;
  closeAddTodoModal: () => void;
  submitAddTodo: (formData: { content: string; categoryName: string; categoryType: 'git' | 'project'; filePath?: string; projectKey?: string }) => Promise<void>;
}

// Define selectors outside the create call so they can be used by other selectors or within actions if needed
const getFilteredCategoriesInternal = (categories: TodoCategory[], showCompleted: boolean, appConfig: AppConfig | null): TodoCategory[] => {
  if (showCompleted) return categories; 
  return categories.map(category => ({
    ...category,
    todos: category.todos.filter(todo => !isStatusDoneLike(todo.status, appConfig)),
  })).filter(category => category.todos.length > 0);
};

const getFilteredCategoryInfoInternal = (categories: TodoCategory[], appConfig: AppConfig | null) => {
    return categories.map(category => ({
      name: category.name,
      icon: category.icon,
      count: category.todos.filter(todo => !isStatusDoneLike(todo.status, appConfig)).length,
      totalCount: category.todos.length,
    }));
};

// This version of getGloballySortedAndFilteredTodos returns TodoItems *with* their original category/item indices
// This is a common pattern if you need to map back from a globally sorted list to original positions.
interface GlobalTodoItem extends TodoItem {
  originalCategoryIndex: number;
  originalItemIndex: number;
}
const getGloballySortedAndFilteredTodosInternal = (categories: TodoCategory[], showCompleted: boolean, appConfig: AppConfig | null): GlobalTodoItem[] => {
  let allTodos: GlobalTodoItem[] = [];
  categories.forEach((category, catIdx) => {
    category.todos.forEach((todo, itemIdx) => {
      allTodos.push({
        ...todo,
        originalCategoryIndex: catIdx,
        originalItemIndex: itemIdx,
      });
    });
  });

  const filteredTodos = showCompleted 
    ? allTodos 
    : allTodos.filter(todo => !isStatusDoneLike(todo.status, appConfig));

  return filteredTodos.sort((a, b) => {
    const aParsed = parseTodoContent(a.content);
    const bParsed = parseTodoContent(b.content);
    // Corrected to use .priority instead of .priorityPart
    return (aParsed.priority ?? '').localeCompare(bParsed.priority ?? ''); 
  });
};

export const useTodoStore = create<TodoState>((set, get) => ({
  categories: [],
  loading: false,
  error: null,
  lastFetched: null,
  focusedItem: { categoryIndex: 0, itemIndex: 0 },
  tableEditingCell: null,
  displayMode: 'table', // Default display mode
  activeTabIndex: 0,    // Default active tab
  filter: 'all', // Default filter state
  setTableEditingCell: (cell) => set({ tableEditingCell: cell }),
  searchQuery: '',
  showKeyboardHelp: false,
  showAddTodoModal: false,
  addTodoModalData: null,

  loadData: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const data = await fetchTodoData(); 
      set({ categories: data, loading: false, lastFetched: new Date() });
    } catch (err: any) {
      set({ error: err.message || 'Failed to load todos', loading: false });
    }
  },

  updateTodo: (updatedTodo) =>
    set((state) => ({
      categories: state.categories.map(category => ({
        ...category,
        todos: category.todos.map(todo =>
          todo.location === updatedTodo.location ? updatedTodo : todo
        ),
      })),
    })),
  
  setFilter: (filterValue) => set({ filter: filterValue }),

  setFocusedItem: (focus) => {
    const { categories } = get();
    if (categories && categories[focus.categoryIndex] && categories[focus.categoryIndex].todos && categories[focus.categoryIndex].todos[focus.itemIndex]) {
      set({ focusedItem: focus });
    } else if (categories && categories[focus.categoryIndex] && focus.itemIndex === -1) { // Allow focusing category with no items
        set({ focusedItem: focus });
    }
  },
  
  toggleDisplayMode: () => set(state => {
    const appConfig = useConfigStore.getState().config; // Get appConfig for selectors
    const newDisplayMode = state.displayMode === 'section'
      ? 'tab'
      : state.displayMode === 'tab'
        ? 'table'
        : 'section';
  
    let newFocusedItem = { ...state.focusedItem };
    let newActiveTabIndex = state.activeTabIndex;
  
    if (newDisplayMode === 'table') {
      newActiveTabIndex = -1; // No specific tab is active in table mode from this perspective
      const globallySortedTodos = getGloballySortedAndFilteredTodosInternal(state.categories, state.filter !== 'active', appConfig);
      if (globallySortedTodos.length > 0) {
        const currentItemInSortedList = globallySortedTodos.find(
          item => item.originalCategoryIndex === state.focusedItem.categoryIndex && item.originalItemIndex === state.focusedItem.itemIndex
        );
        if (currentItemInSortedList) {
          newFocusedItem = { categoryIndex: currentItemInSortedList.originalCategoryIndex, itemIndex: currentItemInSortedList.originalItemIndex };
        } else {
          newFocusedItem = { categoryIndex: globallySortedTodos[0].originalCategoryIndex, itemIndex: globallySortedTodos[0].originalItemIndex };
        }
      } else {
        newFocusedItem = { categoryIndex: -1, itemIndex: -1 };
      }
    } else if (state.displayMode === 'table') { // Switching FROM table mode
      const filteredCategoryInfo = getFilteredCategoryInfoInternal(state.categories, appConfig);
      const currentOriginalFocusedItem = state.focusedItem; 
  
      if (newDisplayMode === 'tab') {
        if (currentOriginalFocusedItem.categoryIndex !== -1 && currentOriginalFocusedItem.categoryIndex < state.categories.length) {
          const originalFocusedCategoryName = state.categories[currentOriginalFocusedItem.categoryIndex].name;
          const targetTabIndexInFiltered = filteredCategoryInfo.findIndex(info => info.name === originalFocusedCategoryName);
          if (targetTabIndexInFiltered !== -1) {
            newActiveTabIndex = targetTabIndexInFiltered;
            const hasItems = filteredCategoryInfo[newActiveTabIndex]?.count > 0;
            newFocusedItem = { categoryIndex: newActiveTabIndex, itemIndex: hasItems ? 0 : -1 }; 
          } else {
            newActiveTabIndex = 0;
            const hasItems = filteredCategoryInfo[newActiveTabIndex]?.count > 0;
            newFocusedItem = { categoryIndex: newActiveTabIndex, itemIndex: hasItems ? 0 : -1 };
          }
        } else {
          newActiveTabIndex = 0;
          const hasItems = filteredCategoryInfo[newActiveTabIndex]?.count > 0;
          newFocusedItem = { categoryIndex: newActiveTabIndex, itemIndex: hasItems ? 0 : -1 };
        }
      } else { // Switching from table to section mode
        const itemToKeepFocus = state.categories[currentOriginalFocusedItem.categoryIndex]?.todos[currentOriginalFocusedItem.itemIndex];
        let isVisibleInFiltered = false;
        if (itemToKeepFocus) {
            const filteredCats = getFilteredCategoriesInternal(state.categories, state.filter !== 'active', appConfig);
            for (const fCat of filteredCats) {
                if (fCat.name === state.categories[currentOriginalFocusedItem.categoryIndex].name) {
                    if (fCat.todos.some(t => t.location === itemToKeepFocus.location && t.content === itemToKeepFocus.content)) {
                        isVisibleInFiltered = true;
                        newFocusedItem = { ...currentOriginalFocusedItem }; // Keep original indices
                        break;
                    }
                }
            }
        }
        if (!isVisibleInFiltered) {
            const firstFilteredCat = getFilteredCategoriesInternal(state.categories, state.filter !== 'active', appConfig)[0];
            if (firstFilteredCat && firstFilteredCat.todos.length > 0) {
                const originalCatIdx = state.categories.findIndex(c => c.name === firstFilteredCat.name);
                const originalItemIdx = originalCatIdx !== -1 ? state.categories[originalCatIdx].todos.findIndex(t => t.location === firstFilteredCat.todos[0].location && t.content === firstFilteredCat.todos[0].content) : -1;
                newFocusedItem = { categoryIndex: originalCatIdx, itemIndex: originalItemIdx !== -1 ? originalItemIdx : -1 };
            } else {
                newFocusedItem = { categoryIndex: -1, itemIndex: -1 };
            }
        }
        if (newFocusedItem.categoryIndex !== -1 && state.categories[newFocusedItem.categoryIndex]) {
            const focusedCatName = state.categories[newFocusedItem.categoryIndex].name;
            newActiveTabIndex = filteredCategoryInfo.findIndex(info => info.name === focusedCatName);
            if (newActiveTabIndex === -1) newActiveTabIndex = 0; 
        } else {
            newActiveTabIndex = 0;
        }
      }
    } // Add other transition logic if needed (e.g., tab to section)
  
    return {
      displayMode: newDisplayMode,
      focusedItem: newFocusedItem, 
      activeTabIndex: newActiveTabIndex,
    };
  }),

  setActiveTabIndex: (index) => set(state => {
    const appConfig = useConfigStore.getState().config;
    const filteredCategoryInfo = getFilteredCategoryInfoInternal(state.categories, appConfig);
    const hasItems = filteredCategoryInfo[index]?.count > 0;
    return { 
      activeTabIndex: index,
      focusedItem: { categoryIndex: index, itemIndex: hasItems ? 0 : -1 }
    };
  }),

  navigateTodos: (direction, step = 1) => {
    set(state => {
      const appConfig = useConfigStore.getState().config;
      const { categories, focusedItem, displayMode, activeTabIndex, filter } = state;
      const showCompleted = filter !== 'active';

      if (categories.length === 0) return { focusedItem: { categoryIndex: -1, itemIndex: -1 } };

      if (displayMode === 'table') {
        const globallySortedTodos = getGloballySortedAndFilteredTodosInternal(categories, showCompleted, appConfig);
        if (globallySortedTodos.length === 0) return { focusedItem: { categoryIndex: -1, itemIndex: -1 } };

        let currentIndexInSortedList = -1;
        if (focusedItem.categoryIndex !== -1 && focusedItem.itemIndex !== -1) {
          currentIndexInSortedList = globallySortedTodos.findIndex(
            item => item.originalCategoryIndex === focusedItem.categoryIndex && item.originalItemIndex === focusedItem.itemIndex
          );
        }
        
        if (currentIndexInSortedList === -1) { 
            const newIndex = direction === 'up' ? globallySortedTodos.length - 1 : 0;
            const newItem = globallySortedTodos[newIndex];
            return { focusedItem: { categoryIndex: newItem.originalCategoryIndex, itemIndex: newItem.originalItemIndex } };
        }

        let newSortedIndex = direction === 'up'
          ? Math.max(0, currentIndexInSortedList - step)
          : Math.min(globallySortedTodos.length - 1, currentIndexInSortedList + step);

        if (newSortedIndex !== currentIndexInSortedList) {
          const newItem = globallySortedTodos[newSortedIndex];
          return { focusedItem: { categoryIndex: newItem.originalCategoryIndex, itemIndex: newItem.originalItemIndex } };
        }
      } else if (displayMode === 'tab') {
        const filteredCategories = getFilteredCategoriesInternal(categories, showCompleted, appConfig);
        const currentFilteredCategory = filteredCategories[activeTabIndex];
        if (!currentFilteredCategory || currentFilteredCategory.todos.length === 0) return state;

        let currentLocalItemIndex = focusedItem.itemIndex; 
        if (focusedItem.categoryIndex !== activeTabIndex || currentLocalItemIndex === -1) { // Not focused in this tab or nothing focused
            currentLocalItemIndex = direction === 'up' ? currentFilteredCategory.todos.length -1 : 0;
        } else {
            currentLocalItemIndex = direction === 'up'
            ? Math.max(0, currentLocalItemIndex - step)
            : Math.min(currentFilteredCategory.todos.length - 1, currentLocalItemIndex + step);
        }
        return { focusedItem: { categoryIndex: activeTabIndex, itemIndex: currentLocalItemIndex } };

      } else { // section mode
        const flatFilteredItems: { todo: TodoItem, originalCatIdx: number, originalItemIdx: number, filteredCatIdx:number, filteredItemIdx: number }[] = [];
        let currentGlobalFlatIndex = -1;
        let flatIdxCounter = 0;
        const filteredCategories = getFilteredCategoriesInternal(categories, showCompleted, appConfig);

        filteredCategories.forEach((cat, fCatIdx) => {
          cat.todos.forEach((td, fItemIdx) => {
            const originalCatIdx = categories.findIndex(origCat => origCat.name === cat.name); // Map back to original category index
            const originalItemIdx = originalCatIdx !== -1 ? categories[originalCatIdx].todos.findIndex(origTd => origTd.location === td.location && origTd.content === td.content) : -1;

            flatFilteredItems.push({ todo: td, originalCatIdx, originalItemIdx, filteredCatIdx: fCatIdx, filteredItemIdx: fItemIdx });
            if (originalCatIdx === focusedItem.categoryIndex && originalItemIdx === focusedItem.itemIndex) {
              currentGlobalFlatIndex = flatIdxCounter;
            }
            flatIdxCounter++;
          });
        });

        if (flatFilteredItems.length === 0) return { focusedItem: { categoryIndex: -1, itemIndex: -1 } };

        if (currentGlobalFlatIndex === -1) { 
            const newFlatIdx = direction === 'up' ? flatFilteredItems.length - 1 : 0;
            const newItemInfo = flatFilteredItems[newFlatIdx];
            return { focusedItem: { categoryIndex: newItemInfo.originalCatIdx, itemIndex: newItemInfo.originalItemIdx } };
        }

        let newFlatIndex = direction === 'up'
          ? Math.max(0, currentGlobalFlatIndex - step)
          : Math.min(flatFilteredItems.length - 1, currentGlobalFlatIndex + step);

        if (newFlatIndex !== currentGlobalFlatIndex) {
          const newItemInfo = flatFilteredItems[newFlatIndex];
          return { focusedItem: { categoryIndex: newItemInfo.originalCatIdx, itemIndex: newItemInfo.originalItemIdx } };
        }
      }
      return state; 
    });
  },
  navigateTabs: (direction) => {
    set(state => {
      const appConfig = useConfigStore.getState().config;
      const filteredCategoryInfo = getFilteredCategoryInfoInternal(state.categories, appConfig);
      const { activeTabIndex } = state;
      let newTabIndex = activeTabIndex;

      if (direction === 'left') {
        newTabIndex = Math.max(0, activeTabIndex - 1);
      } else if (direction === 'right') {
        newTabIndex = Math.min(filteredCategoryInfo.length - 1, activeTabIndex + 1);
      }

      if (newTabIndex !== activeTabIndex) {
        const hasItems = filteredCategoryInfo[newTabIndex]?.count > 0;
        return { 
          activeTabIndex: newTabIndex,
          focusedItem: { categoryIndex: newTabIndex, itemIndex: hasItems ? 0 : -1 }
        };
      }
      return state;
    });
  },
  setSearchQuery: (query) => set({ searchQuery: query }),
  toggleKeyboardHelp: () => set(state => ({ showKeyboardHelp: !state.showKeyboardHelp })),
  openAddTodoModal: (categoryType, categoryName, exampleItemLocation) => set({
    showAddTodoModal: true,
    addTodoModalData: { categoryType, categoryName, exampleItemLocation }
  }),
  closeAddTodoModal: () => set({ showAddTodoModal: false, addTodoModalData: null }),
  submitAddTodo: async (formData) => {
    console.log('Submitting add todo:', formData);
    get().loadData();
    set({ showAddTodoModal: false, addTodoModalData: null });
  },
}));

// This is the hook that components will use.
// It gets appConfig from useConfigStore and passes it to the internal selectors.
export const useTodoSelectors = (showCompleted: boolean) => {
  const appConfig = useConfigStore(state => state.config);
  const categories = useTodoStore(state => state.categories);

  const filteredCategories = getFilteredCategoriesInternal(categories, showCompleted, appConfig);
  const filteredCategoryInfo = getFilteredCategoryInfoInternal(categories, appConfig);
  const globallySortedAndFilteredTodos = getGloballySortedAndFilteredTodosInternal(categories, showCompleted, appConfig);

  const totalCountsObject = useMemo(() => {
    let active = 0;
    let done = 0;
    categories.forEach(cat => {
      cat.todos.forEach(todo => {
        if (isStatusDoneLike(todo.status, appConfig)) {
          done++;
        } else {
          active++;
        }
      });
    });
    return { active, done, total: active + done };
  }, [categories, appConfig]);
  
  return {
    filteredCategories,
    filteredCategoryInfo,
    globallySortedAndFilteredTodos,
    getTotalCounts: totalCountsObject,
    loading: useTodoStore(state => state.loading),
    error: useTodoStore(state => state.error),
    lastFetched: useTodoStore(state => state.lastFetched),
    focusedItem: useTodoStore(state => state.focusedItem),
    setFocusedItem: useTodoStore(state => state.setFocusedItem),
    tableEditingCell: useTodoStore(state => state.tableEditingCell),
    setTableEditingCell: useTodoStore(state => state.setTableEditingCell),
    displayMode: useTodoStore(state => state.displayMode),
    activeTabIndex: useTodoStore(state => state.activeTabIndex),
    toggleDisplayMode: useTodoStore(state => state.toggleDisplayMode),
    setActiveTabIndex: useTodoStore(state => state.setActiveTabIndex),
    navigateTodos: useTodoStore(state => state.navigateTodos),
    navigateTabs: useTodoStore(state => state.navigateTabs),
    filter: useTodoStore(state => state.filter),
    setFilter: useTodoStore(state => state.setFilter),
    searchQuery: useTodoStore(state => state.searchQuery),
    setSearchQuery: useTodoStore(state => state.setSearchQuery),
    showKeyboardHelp: useTodoStore(state => state.showKeyboardHelp),
    toggleKeyboardHelp: useTodoStore(state => state.toggleKeyboardHelp),
    showAddTodoModal: useTodoStore(state => state.showAddTodoModal),
    addTodoModalData: useTodoStore(state => state.addTodoModalData),
    openAddTodoModal: useTodoStore(state => state.openAddTodoModal),
    closeAddTodoModal: useTodoStore(state => state.closeAddTodoModal),
    submitAddTodo: useTodoStore(state => state.submitAddTodo),
  };
};