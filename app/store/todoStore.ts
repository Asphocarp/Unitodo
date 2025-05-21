import { makeObservable, observable, action, computed, flow } from 'mobx';
import { TodoCategory, TodoItem, Config as AppConfig } from '../types';
import { fetchTodoData } from '../services/todoService';
import { parseTodoContent } from '../utils';
import configStore from './configStore'; // Import MobX configStore instance

// Define GlobalTodoItem interface (if not already defined globally)
interface GlobalTodoItem extends TodoItem {
  originalCategoryIndex: number;
  originalItemIndex: number;
}

class TodoStore {
  categories: TodoCategory[] = [];
  loading: boolean = false;
  error: string | null = null;
  lastFetched: Date | null = null;
  focusedItem: { categoryIndex: number; itemIndex: number } = { categoryIndex: 0, itemIndex: 0 };
  tableEditingCell: { categoryIndex: number; itemIndex: number; initialFocus?: 'end' | 'afterPriority' } | null = null;
  displayMode: 'section' | 'tab' | 'table' = 'table';
  activeTabIndex: number = 0;
  filter: 'all' | 'active' | 'closed' = 'active';
  searchQuery: string = '';
  showKeyboardHelp: boolean = false;
  showAddTodoModal: boolean = false;
  addTodoModalData: { categoryType: 'git' | 'project'; categoryName: string; exampleItemLocation?: string } | null = null;

  constructor() {
    makeObservable(this, {
      categories: observable,
      loading: observable,
      error: observable,
      lastFetched: observable,
      focusedItem: observable,
      tableEditingCell: observable,
      displayMode: observable,
      activeTabIndex: observable,
      filter: observable,
      searchQuery: observable,
      showKeyboardHelp: observable,
      showAddTodoModal: observable,
      addTodoModalData: observable,
      setTableEditingCell: action,
      loadData: flow,
      updateTodo: action,
      setFocusedItem: action,
      toggleDisplayMode: action,
      setActiveTabIndex: action,
      navigateTodos: action,
      navigateTabs: action,
      setFilter: action,
      setSearchQuery: action,
      toggleKeyboardHelp: action,
      openAddTodoModal: action,
      closeAddTodoModal: action,
      submitAddTodo: flow,
      filteredCategories: computed,
      filteredCategoryInfo: computed,
      globallySortedAndFilteredTodos: computed,
      totalCounts: computed,
    });
  }

  private isStatusDoneLike(status: string): boolean {
    const appConfig = configStore.config;
    if (!appConfig || !appConfig.todo_states || appConfig.todo_states.length === 0) return false;
    for (const stateSet of appConfig.todo_states) {
      if (stateSet.length >= 3 && status === stateSet[2]) return true;
      if (stateSet.length >= 4 && status === stateSet[3]) return true;
    }
    return false;
  }

  setTableEditingCell(cell: { categoryIndex: number; itemIndex: number; initialFocus?: 'end' | 'afterPriority' } | null) {
    this.tableEditingCell = cell;
  }

  *loadData(this: TodoStore) {
    if (this.loading) return;
    this.loading = true;
    this.error = null;
    try {
      const data: TodoCategory[] = yield fetchTodoData();
      this.categories = data;
      this.lastFetched = new Date();
    } catch (err: any) {
      this.error = err.message || 'Failed to load todos';
    } finally {
      this.loading = false;
    }
  }

  updateTodo(updatedTodo: TodoItem) {
    this.categories = this.categories.map(category => ({
      ...category,
      todos: category.todos.map(todo =>
        todo.location === updatedTodo.location ? updatedTodo : todo
      ),
    }));
  }

  setFocusedItem(focus: { categoryIndex: number; itemIndex: number }) {
    if (this.categories && this.categories[focus.categoryIndex] && this.categories[focus.categoryIndex].todos && this.categories[focus.categoryIndex].todos[focus.itemIndex]) {
      this.focusedItem = focus;
    } else if (this.categories && this.categories[focus.categoryIndex] && focus.itemIndex === -1) {
      this.focusedItem = focus;
    }
  }
  
  setFilter(filterValue: 'all' | 'active' | 'closed') {
    this.filter = filterValue;
  }

  setSearchQuery(query: string) {
    this.searchQuery = query;
  }

  toggleKeyboardHelp() {
    this.showKeyboardHelp = !this.showKeyboardHelp;
  }

  openAddTodoModal(categoryType: 'git' | 'project', categoryName: string, exampleItemLocation?: string) {
    this.showAddTodoModal = true;
    this.addTodoModalData = { categoryType, categoryName, exampleItemLocation };
  }

  closeAddTodoModal() {
    this.showAddTodoModal = false;
    this.addTodoModalData = null;
  }

  *submitAddTodo(this: TodoStore, formData: { content: string; categoryName: string; categoryType: 'git' | 'project'; filePath?: string; projectKey?: string }) {
    console.log('Submitting add todo (MobX):', formData);
    // Actual submission logic would go here, e.g., calling a service
    // For now, just reload data as in the original store
    yield this.loadData(); // Assuming loadData is a flow
    this.closeAddTodoModal();
  }

  get filteredCategories(): TodoCategory[] {
    const showCompleted = this.filter !== 'active';
    if (showCompleted) return this.categories;
    return this.categories.map(category => ({
      ...category,
      todos: category.todos.filter(todo => !this.isStatusDoneLike(todo.status)),
    })).filter(category => category.todos.length > 0);
  }

  get filteredCategoryInfo() {
    return this.categories.map(category => ({
      name: category.name,
      icon: category.icon,
      count: category.todos.filter(todo => !this.isStatusDoneLike(todo.status)).length,
      totalCount: category.todos.length,
    }));
  }
  
  get globallySortedAndFilteredTodos(): GlobalTodoItem[] {
    const showCompleted = this.filter !== 'active';
    let allTodos: GlobalTodoItem[] = [];
    this.categories.forEach((category, catIdx) => {
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
      : allTodos.filter(todo => !this.isStatusDoneLike(todo.status));

    return filteredTodos.sort((a, b) => {
      const aParsed = parseTodoContent(a.content);
      const bParsed = parseTodoContent(b.content);
      return (aParsed.priority ?? '').localeCompare(bParsed.priority ?? '');
    });
  }

  get totalCounts() {
    let active = 0;
    let done = 0;
    this.categories.forEach(cat => {
      cat.todos.forEach(todo => {
        if (this.isStatusDoneLike(todo.status)) {
          done++;
        } else {
          active++;
        }
      });
    });
    return { active, done, total: active + done };
  }

  toggleDisplayMode() {
    const newDisplayMode = this.displayMode === 'section'
      ? 'tab'
      : this.displayMode === 'tab'
        ? 'table'
        : 'section';
  
    let newFocusedItem = { ...this.focusedItem };
    let newActiveTabIndex = this.activeTabIndex;
  
    if (newDisplayMode === 'table') {
      newActiveTabIndex = -1; 
      const globallySorted = this.globallySortedAndFilteredTodos; // Use computed property
      if (globallySorted.length > 0) {
        const currentItemInSortedList = globallySorted.find(
          item => item.originalCategoryIndex === this.focusedItem.categoryIndex && item.originalItemIndex === this.focusedItem.itemIndex
        );
        if (currentItemInSortedList) {
          newFocusedItem = { categoryIndex: currentItemInSortedList.originalCategoryIndex, itemIndex: currentItemInSortedList.originalItemIndex };
        } else {
          newFocusedItem = { categoryIndex: globallySorted[0].originalCategoryIndex, itemIndex: globallySorted[0].originalItemIndex };
        }
      } else {
        newFocusedItem = { categoryIndex: -1, itemIndex: -1 };
      }
    } else if (this.displayMode === 'table') { // Switching FROM table mode
      const catInfo = this.filteredCategoryInfo; // Use computed property
      const currentOriginalFocusedItem = this.focusedItem;
  
      if (newDisplayMode === 'tab') {
        if (currentOriginalFocusedItem.categoryIndex !== -1 && currentOriginalFocusedItem.categoryIndex < this.categories.length) {
          const originalFocusedCategoryName = this.categories[currentOriginalFocusedItem.categoryIndex].name;
          const targetTabIndexInFiltered = catInfo.findIndex(info => info.name === originalFocusedCategoryName);
          if (targetTabIndexInFiltered !== -1) {
            newActiveTabIndex = targetTabIndexInFiltered;
            const hasItems = catInfo[newActiveTabIndex]?.count > 0;
            newFocusedItem = { categoryIndex: newActiveTabIndex, itemIndex: hasItems ? 0 : -1 };
          } else {
            newActiveTabIndex = 0; // Default to first tab
            const hasItems = catInfo[newActiveTabIndex]?.count > 0;
            newFocusedItem = { categoryIndex: newActiveTabIndex, itemIndex: hasItems ? 0 : -1 };
          }
        } else {
          newActiveTabIndex = 0; // Default to first tab
          const hasItems = catInfo[newActiveTabIndex]?.count > 0;
          newFocusedItem = { categoryIndex: newActiveTabIndex, itemIndex: hasItems ? 0 : -1 };
        }
      } else { // Switching from table to section mode
        const itemToKeepFocus = this.categories[currentOriginalFocusedItem.categoryIndex]?.todos[currentOriginalFocusedItem.itemIndex];
        let isVisibleInFiltered = false;
        if (itemToKeepFocus) {
            const filteredCats = this.filteredCategories; // Use computed
            for (const fCat of filteredCats) { // Iterate over filtered categories
                // Find the original category index for fCat to compare with currentOriginalFocusedItem.categoryIndex
                const originalCatIndexOfFCat = this.categories.findIndex(c => c.name === fCat.name);
                if (originalCatIndexOfFCat === currentOriginalFocusedItem.categoryIndex) { // Check if it's the same category
                    if (fCat.todos.some(t => t.location === itemToKeepFocus.location && t.content === itemToKeepFocus.content)) {
                        isVisibleInFiltered = true;
                        newFocusedItem = { ...currentOriginalFocusedItem };
                        break;
                    }
                }
            }
        }

        if (!isVisibleInFiltered) { // If item not visible, focus on first item of first filtered category
            const firstFilteredCat = this.filteredCategories[0];
            if (firstFilteredCat && firstFilteredCat.todos.length > 0) {
                const originalCatIdx = this.categories.findIndex(c => c.name === firstFilteredCat.name);
                const originalItemIdx = originalCatIdx !== -1 ? this.categories[originalCatIdx].todos.findIndex(t => t.location === firstFilteredCat.todos[0].location && t.content === firstFilteredCat.todos[0].content) : -1;
                newFocusedItem = { categoryIndex: originalCatIdx, itemIndex: originalItemIdx !== -1 ? originalItemIdx : -1 };
            } else { // No items in any filtered category
                newFocusedItem = { categoryIndex: -1, itemIndex: -1 };
            }
        }
        // Update activeTabIndex based on the new focused item for section mode
        if (newFocusedItem.categoryIndex !== -1 && this.categories[newFocusedItem.categoryIndex]) {
            const focusedCatName = this.categories[newFocusedItem.categoryIndex].name;
            newActiveTabIndex = catInfo.findIndex(info => info.name === focusedCatName);
            if (newActiveTabIndex === -1) newActiveTabIndex = 0;
        } else {
            newActiveTabIndex = 0;
        }
      }
    }
  
    this.displayMode = newDisplayMode;
    this.focusedItem = newFocusedItem;
    this.activeTabIndex = newActiveTabIndex;
  }

  setActiveTabIndex(index: number) {
    const catInfo = this.filteredCategoryInfo; // Use computed
    const hasItems = catInfo[index]?.count > 0;
    this.activeTabIndex = index;
    this.focusedItem = { categoryIndex: index, itemIndex: hasItems ? 0 : -1 };
  }

  navigateTodos(direction: 'up' | 'down', step: number = 1) {
    if (this.categories.length === 0) {
      this.focusedItem = { categoryIndex: -1, itemIndex: -1 };
      return;
    }

    if (this.displayMode === 'table') {
      const globallySorted = this.globallySortedAndFilteredTodos; // Use computed
      if (globallySorted.length === 0) {
        this.focusedItem = { categoryIndex: -1, itemIndex: -1 };
        return;
      }
      let currentIndexInSortedList = -1;
      if (this.focusedItem.categoryIndex !== -1 && this.focusedItem.itemIndex !== -1) {
           currentIndexInSortedList = globallySorted.findIndex(
             item => item.originalCategoryIndex === this.focusedItem.categoryIndex && item.originalItemIndex === this.focusedItem.itemIndex
           );
      }
      if (currentIndexInSortedList === -1) { // Not found or nothing focused, focus first/last
          const newIndex = direction === 'up' ? globallySorted.length - 1 : 0;
          const newItem = globallySorted[newIndex];
          this.focusedItem = { categoryIndex: newItem.originalCategoryIndex, itemIndex: newItem.originalItemIndex };
          return;
      }
      let newSortedIndex = direction === 'up'
        ? Math.max(0, currentIndexInSortedList - step)
        : Math.min(globallySorted.length - 1, currentIndexInSortedList + step);
      if (newSortedIndex !== currentIndexInSortedList) {
        const newItem = globallySorted[newSortedIndex];
        this.focusedItem = { categoryIndex: newItem.originalCategoryIndex, itemIndex: newItem.originalItemIndex };
      }
    } else if (this.displayMode === 'tab') {
      const currentFilteredCategory = this.filteredCategories[this.activeTabIndex];
      if (!currentFilteredCategory || currentFilteredCategory.todos.length === 0) return;
      let currentLocalItemIndex = this.focusedItem.itemIndex;
      if (this.focusedItem.categoryIndex !== this.activeTabIndex || currentLocalItemIndex === -1) {
          currentLocalItemIndex = direction === 'up' ? currentFilteredCategory.todos.length - 1 : 0;
      } else {
          currentLocalItemIndex = direction === 'up'
          ? Math.max(0, currentLocalItemIndex - step)
          : Math.min(currentFilteredCategory.todos.length - 1, currentLocalItemIndex + step);
      }
      this.focusedItem = { categoryIndex: this.activeTabIndex, itemIndex: currentLocalItemIndex };
    } else { // section mode
      const flatFilteredItems: { todo: TodoItem, originalCatIdx: number, originalItemIdx: number }[] = [];
      let currentGlobalFlatIndex = -1;
      let flatIdxCounter = 0;
      
      this.filteredCategories.forEach((cat) => { // Use computed
        const originalCatIdx = this.categories.findIndex(origCat => origCat.name === cat.name);
        cat.todos.forEach((td) => {
          const originalItemIdx = originalCatIdx !== -1 ? this.categories[originalCatIdx].todos.findIndex(origTd => origTd.location === td.location && origTd.content === td.content) : -1;
          flatFilteredItems.push({ todo: td, originalCatIdx, originalItemIdx });
          if (originalCatIdx === this.focusedItem.categoryIndex && originalItemIdx === this.focusedItem.itemIndex) {
            currentGlobalFlatIndex = flatIdxCounter;
          }
          flatIdxCounter++;
        });
      });

      if (flatFilteredItems.length === 0) {
        this.focusedItem = { categoryIndex: -1, itemIndex: -1 };
        return;
      }
      if (currentGlobalFlatIndex === -1) {
          const newFlatIdx = direction === 'up' ? flatFilteredItems.length - 1 : 0;
          const newItemInfo = flatFilteredItems[newFlatIdx];
          this.focusedItem = { categoryIndex: newItemInfo.originalCatIdx, itemIndex: newItemInfo.originalItemIdx };
          return;
      }
      let newFlatIndex = direction === 'up'
        ? Math.max(0, currentGlobalFlatIndex - step)
        : Math.min(flatFilteredItems.length - 1, currentGlobalFlatIndex + step);
      if (newFlatIndex !== currentGlobalFlatIndex) {
        const newItemInfo = flatFilteredItems[newFlatIndex];
        this.focusedItem = { categoryIndex: newItemInfo.originalCatIdx, itemIndex: newItemInfo.originalItemIdx };
      }
    }
  }

  navigateTabs(direction: 'left' | 'right') {
    const catInfo = this.filteredCategoryInfo; // Use computed
    let newTabIndex = this.activeTabIndex;
    if (direction === 'left') {
      newTabIndex = Math.max(0, this.activeTabIndex - 1);
    } else if (direction === 'right') {
      newTabIndex = Math.min(catInfo.length - 1, this.activeTabIndex + 1);
    }
    if (newTabIndex !== this.activeTabIndex) {
      this.setActiveTabIndex(newTabIndex); // This will also update focusedItem
    }
  }
}

const todoStore = new TodoStore();
export default todoStore;
// No more useTodoSelectors hook needed. Components will import todoStore directly.
// The isStatusDoneLike, getFilteredCategoriesInternal, etc. are now part of the store
// or replaced by computed properties.