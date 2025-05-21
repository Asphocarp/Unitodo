import { makeObservable, observable, action, computed, runInAction, reaction } from 'mobx';
import { TodoCategory, TodoItem, Config as AppConfig, FlatListItem, TodoTableRow } from '../types';
import { fetchTodoData, addTodoItem as apiAddTodoItem } from '../services/todoService'; // Assuming addTodoItem is for the new modal
import { parseTodoContent, decodeTimestampId } from '../utils';
import configStore from './configStore'; // Import the MobX config store instance

// Helper function (can remain outside or be part of the store if preferred)
export function isStatusDoneLike(status: string, appConfig: AppConfig | null): boolean {
  if (!appConfig || !appConfig.todo_states || appConfig.todo_states.length === 0) return false;
  for (const stateSet of appConfig.todo_states) {
    if (stateSet.length >= 3 && status === stateSet[2]) return true; // 3rd state is DONE
    if (stateSet.length >= 4 && status === stateSet[3]) return true; // 4th state is CANCELLED
  }
  return false;
}

interface GlobalTodoItem extends TodoItem {
  originalCategoryIndex: number;
  originalItemIndex: number;
}

class TodoStoreImpl {
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
      categories: observable.deep, // Use deep for arrays of objects
      loading: observable,
      error: observable,
      lastFetched: observable,
      focusedItem: observable.deep,
      tableEditingCell: observable.deep,
      displayMode: observable,
      activeTabIndex: observable,
      filter: observable,
      searchQuery: observable,
      showKeyboardHelp: observable,
      showAddTodoModal: observable,
      addTodoModalData: observable.deep,

      loadData: action,
      updateTodo: action,
      setFocusedItem: action,
      setTableEditingCell: action,
      navigateTodos: action,
      toggleDisplayMode: action,
      setActiveTabIndex: action,
      navigateTabs: action,
      setFilter: action,
      setSearchQuery: action,
      toggleKeyboardHelp: action,
      openAddTodoModal: action,
      closeAddTodoModal: action,
      submitAddTodo: action,

      filteredCategories: computed,
      filteredCategoryInfo: computed,
      globallySortedAndFilteredTodos: computed,
      totalCounts: computed,
      showCompleted: computed,
      computedFlattenedList: computed,
      computedTableDisplayData: computed,
    });

    // Example of a reaction if needed, e.g., reacting to configStore.config changes
    // reaction(
    //   () => configStore.config,
    //   (newConfig) => {
    //     // console.log('TodoStore detected config change:', newConfig);
    //     // Potentially re-filter or re-sort todos if config impacts that
    //     // This might be complex if filters depend heavily on config that changes rarely
    //   }
    // );
  }

  get showCompleted(): boolean {
    return this.filter !== 'active';
  }

  loadData = async () => {
    if (this.loading) return;
    runInAction(() => {
      this.loading = true;
      this.error = null;
    });
    try {
      const data = await fetchTodoData();
      runInAction(() => {
        this.categories = data;
        this.loading = false;
        this.lastFetched = new Date();
      });
    } catch (err: any) {
      runInAction(() => {
        this.error = err.message || 'Failed to load todos';
        this.loading = false;
      });
    }
  }

  updateTodo = (updatedTodo: TodoItem, originalContent?: string) => {
    this.categories = this.categories.map(category => ({
      ...category,
      todos: category.todos.map(todo =>
        todo.location === updatedTodo.location && todo.content === (originalContent ?? updatedTodo.content) // Use originalContent for matching if provided
          ? { ...todo, ...updatedTodo } // Merge existing todo with updates
          : todo
      ),
    }));
  }
  
  setTableEditingCell = (cell: { categoryIndex: number; itemIndex: number; initialFocus?: 'end' | 'afterPriority' } | null) => {
    this.tableEditingCell = cell;
  }

  setFilter = (filterValue: 'all' | 'active' | 'closed') => {
    this.filter = filterValue;
    // Potentially reset focus or adjust navigation based on new filter
    // For simplicity, current navigation logic handles disappearing items.
    this._adjustFocusAfterModeOrFilterChange();
  }

  setFocusedItem = (focus: { categoryIndex: number; itemIndex: number }) => {
     // Basic validation, can be enhanced based on current view (filtered/sorted lists)
    if (this.categories[focus.categoryIndex]?.todos[focus.itemIndex] || 
        (this.categories[focus.categoryIndex] && focus.itemIndex === -1) || // Allow focusing category itself
        focus.categoryIndex === -1 && focus.itemIndex === -1 // Allow clearing focus
    ) {
        this.focusedItem = focus;
    } else if (this.globallySortedAndFilteredTodos.length > 0 && this.displayMode === 'table') {
        // If focus is invalid but table has items, try focusing the first
        const firstItem = this.globallySortedAndFilteredTodos[0];
        this.focusedItem = { categoryIndex: firstItem.originalCategoryIndex, itemIndex: firstItem.originalItemIndex };
    }
  }
  
  // Computed property for filtered categories
  get filteredCategories(): TodoCategory[] {
    const appConfig = configStore.config; // Access MobX configStore
    if (this.showCompleted) return this.categories;
    return this.categories
      .map(category => ({
        ...category,
        todos: category.todos.filter(todo => !isStatusDoneLike(todo.status, appConfig)),
      }))
      .filter(category => category.todos.length > 0);
  }

  // Computed property for category information (name, icon, counts)
  get filteredCategoryInfo() {
    const appConfig = configStore.config;
    // Use this.categories directly for counts, then filter visibility based on filteredCategories
    // This ensures counts reflect the true total even if a category is filtered out
    return this.categories.map(category => {
      const filteredCat = this.filteredCategories.find(fc => fc.name === category.name);
      return {
        name: category.name,
        icon: category.icon,
        count: category.todos.filter(todo => !isStatusDoneLike(todo.status, appConfig)).length,
        totalCount: category.todos.length,
        isVisible: !!filteredCat, // Is the category visible after filtering its items
      };
    });
  }
  
  get globallySortedAndFilteredTodos(): GlobalTodoItem[] {
    const appConfig = configStore.config;
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

    const filtered = this.showCompleted
      ? allTodos
      : allTodos.filter(todo => !isStatusDoneLike(todo.status, appConfig));

    return filtered.sort((a, b) => {
      const aParsed = parseTodoContent(a.content);
      const bParsed = parseTodoContent(b.content);
      return (aParsed.priority ?? '').localeCompare(bParsed.priority ?? '');
    });
  }

  get totalCounts() {
    const appConfig = configStore.config;
    let active = 0;
    let done = 0;
    this.categories.forEach(cat => {
      cat.todos.forEach(todo => {
        if (isStatusDoneLike(todo.status, appConfig)) {
          done++;
        } else {
          active++;
        }
      });
    });
    return { active, done, total: active + done };
  }

  toggleDisplayMode = () => {
    const newDisplayMode = this.displayMode === 'section'
      ? 'tab'
      : this.displayMode === 'tab'
        ? 'table'
        : 'section';
    
    this.displayMode = newDisplayMode;
    // Adjust focus after mode toggle, MobX will auto-recompute dependent views
    // This logic might need refinement based on how focus should behave across mode changes
    this._adjustFocusAfterModeOrFilterChange();
  }

  _adjustFocusAfterModeOrFilterChange = () => {
    // If current focus is invalid in the new view, reset or pick first valid
    // For simplicity, we'll rely on components to handle focus within their new rendered lists
    // A more robust solution would re-calculate a valid focusedItem here.
    // Example: If switching to table and current focus is out of bounds for sorted list:
    if (this.displayMode === 'table') {
        if (this.globallySortedAndFilteredTodos.length > 0) {
            const currentItemStillVisible = this.globallySortedAndFilteredTodos.find(
                it => it.originalCategoryIndex === this.focusedItem.categoryIndex && it.originalItemIndex === this.focusedItem.itemIndex
            );
            if (!currentItemStillVisible) {
                const firstItem = this.globallySortedAndFilteredTodos[0];
                this.focusedItem = { categoryIndex: firstItem.originalCategoryIndex, itemIndex: firstItem.originalItemIndex };
            }
            // If visible, focus is preserved
        } else {
            this.focusedItem = { categoryIndex: -1, itemIndex: -1 }; // No items
        }
    } else if (this.displayMode === 'tab') {
        const catInfo = this.filteredCategoryInfo[this.activeTabIndex];
        if (catInfo && catInfo.count > 0) {
             // If current focusedItem belongs to the active tab and is still valid, keep it.
            // Otherwise, focus first item of active tab.
            const currentCat = this.filteredCategories[this.activeTabIndex];
            if (this.focusedItem.categoryIndex !== this.activeTabIndex || 
                this.focusedItem.itemIndex >= (currentCat?.todos.length || 0) ||
                this.focusedItem.itemIndex === -1) {
                 this.focusedItem = { categoryIndex: this.activeTabIndex, itemIndex: 0 };
            }
        } else if (catInfo) {
            this.focusedItem = { categoryIndex: this.activeTabIndex, itemIndex: -1 }; // No items in tab
        } else { // No valid active tab (e.g. all categories filtered out)
            this.activeTabIndex = 0; // Reset to first tab conceptually
            this.focusedItem = { categoryIndex: -1, itemIndex: -1 };
        }
    } else { // Section mode
        if (this.filteredCategories.length > 0) {
            const firstCatWithItems = this.filteredCategories.find(cat => cat.todos.length > 0);
            if (firstCatWithItems) {
                 const originalCatIndex = this.categories.findIndex(c => c.name === firstCatWithItems.name);
                // If current focus is still valid within filteredCategories, keep it.
                // Otherwise, focus first item of first visible category.
                const currentFocusedCat = this.categories[this.focusedItem.categoryIndex];
                const isCurrentFocusVisible = currentFocusedCat && this.filteredCategories.some(fc => fc.name === currentFocusedCat.name) &&
                                              this.filteredCategories.find(fc => fc.name === currentFocusedCat.name)?.todos[this.focusedItem.itemIndex];

                if (!isCurrentFocusVisible) {
                     this.focusedItem = { categoryIndex: originalCatIndex, itemIndex: 0 };
                }
            } else {
                this.focusedItem = { categoryIndex: -1, itemIndex: -1 };
            }
        } else {
            this.focusedItem = { categoryIndex: -1, itemIndex: -1 };
        }
    }
    // Ensure activeTabIndex is valid for tab mode
    if (this.displayMode === 'tab') {
        if (this.activeTabIndex >= this.filteredCategoryInfo.filter(ci => ci.isVisible).length) {
            this.activeTabIndex = Math.max(0, this.filteredCategoryInfo.filter(ci => ci.isVisible).length - 1);
        }
        if (this.filteredCategoryInfo.filter(ci => ci.isVisible).length === 0) this.activeTabIndex = 0;


    }
  }


  setActiveTabIndex = (index: number) => {
    const visibleTabs = this.filteredCategoryInfo.filter(info => info.isVisible);
    if (index < 0 || index >= visibleTabs.length) return; // Invalid index for visible tabs

    const targetCategoryName = visibleTabs[index].name;
    const originalCategoryIndex = this.categories.findIndex(cat => cat.name === targetCategoryName);

    if (originalCategoryIndex !== -1) {
        this.activeTabIndex = originalCategoryIndex; // Store original index for consistency if categories can be reordered
                                                // Or, if activeTabIndex should be index in filtered list, then `this.activeTabIndex = index;`
                                                // Let's assume activeTabIndex relates to the *original* categories array index for now
                                                // but navigation and display will use filteredCategoryInfo.

        const catInfo = this.filteredCategoryInfo.find(info => info.name === targetCategoryName);
        const hasItems = catInfo && catInfo.count > 0;
        this.focusedItem = { categoryIndex: originalCategoryIndex, itemIndex: hasItems ? 0 : -1 };
    }
  }

  navigateTodos = (direction: 'up' | 'down', step: number = 1) => {
    const { categories, focusedItem, displayMode, activeTabIndex } = this;
    
    if (categories.length === 0) {
        this.focusedItem = { categoryIndex: -1, itemIndex: -1 };
        return;
    }

    if (displayMode === 'table') {
        const sortedTodos = this.globallySortedAndFilteredTodos;
        if (sortedTodos.length === 0) {
            this.focusedItem = { categoryIndex: -1, itemIndex: -1 };
            return;
        }
        let currentIndex = sortedTodos.findIndex(
            item => item.originalCategoryIndex === focusedItem.categoryIndex && item.originalItemIndex === focusedItem.itemIndex
        );
        if (currentIndex === -1) currentIndex = direction === 'up' ? sortedTodos.length : -1; // Start from end or beginning

        let newIndex = direction === 'up' 
            ? Math.max(0, currentIndex - step) 
            : Math.min(sortedTodos.length - 1, currentIndex + step);
        
        if (newIndex >= 0 && newIndex < sortedTodos.length) {
            const newItem = sortedTodos[newIndex];
            this.focusedItem = { categoryIndex: newItem.originalCategoryIndex, itemIndex: newItem.originalItemIndex };
        }
    } else if (displayMode === 'tab') {
        // activeTabIndex here should refer to the index in the original categories array that corresponds to the visible active tab
        const currentVisibleFilteredCategory = this.filteredCategories.find(cat => cat.name === this.categories[activeTabIndex]?.name);

        if (!currentVisibleFilteredCategory || currentVisibleFilteredCategory.todos.length === 0) return;

        let currentLocalItemIndex = -1;
        // If focus is on the active tab, find the item's index within that tab's filtered todos
        if (focusedItem.categoryIndex === activeTabIndex && focusedItem.itemIndex !== -1) {
            const focusedTodo = this.categories[activeTabIndex].todos[focusedItem.itemIndex];
            currentLocalItemIndex = currentVisibleFilteredCategory.todos.findIndex(t => t.location === focusedTodo.location && t.content === focusedTodo.content);
        }
        
        if (currentLocalItemIndex === -1) currentLocalItemIndex = direction === 'up' ? currentVisibleFilteredCategory.todos.length : -1;

        let newLocalIndex = direction === 'up'
            ? Math.max(0, currentLocalItemIndex - step)
            : Math.min(currentVisibleFilteredCategory.todos.length - 1, currentLocalItemIndex + step);

        if (newLocalIndex >= 0 && newLocalIndex < currentVisibleFilteredCategory.todos.length) {
            // Map newLocalIndex back to originalItemIndex in the original categories array for consistency
            const targetTodoInFiltered = currentVisibleFilteredCategory.todos[newLocalIndex];
            const originalItemIndex = this.categories[activeTabIndex].todos.findIndex(t => t.location === targetTodoInFiltered.location && t.content === targetTodoInFiltered.content);
            this.focusedItem = { categoryIndex: activeTabIndex, itemIndex: originalItemIndex };
        }

    } else { // Section mode
        const flatItems: { originalCatIdx: number, originalItemIdx: number }[] = [];
        this.filteredCategories.forEach(cat => {
            const originalCatIdx = this.categories.findIndex(c => c.name === cat.name);
            cat.todos.forEach((todo, itemIdxInFiltered) => {
                const originalItemIdx = this.categories[originalCatIdx].todos.findIndex(t => t.location === todo.location && t.content === todo.content);
                flatItems.push({ originalCatIdx, originalItemIdx });
            });
        });

        if (flatItems.length === 0) {
            this.focusedItem = { categoryIndex: -1, itemIndex: -1 };
            return;
        }
        let currentIndex = flatItems.findIndex(
            item => item.originalCatIdx === focusedItem.categoryIndex && item.originalItemIdx === focusedItem.itemIndex
        );
        if (currentIndex === -1) currentIndex = direction === 'up' ? flatItems.length : -1;

        let newIndex = direction === 'up' 
            ? Math.max(0, currentIndex - step) 
            : Math.min(flatItems.length - 1, currentIndex + step);

        if (newIndex >= 0 && newIndex < flatItems.length) {
           this.focusedItem = { categoryIndex: flatItems[newIndex].originalCatIdx, itemIndex: flatItems[newIndex].originalItemIdx };
        }
    }
  }

  navigateTabs = (direction: 'left' | 'right') => {
    if (this.displayMode !== 'tab') return;

    const visibleCatInfo = this.filteredCategoryInfo.filter(info => info.isVisible);
    if(visibleCatInfo.length === 0) return;

    let currentVisibleTabIndex = visibleCatInfo.findIndex(info => info.name === this.categories[this.activeTabIndex]?.name);
    if (currentVisibleTabIndex === -1) currentVisibleTabIndex = 0;


    let newVisibleTabIndex = currentVisibleTabIndex;
    if (direction === 'left') {
      newVisibleTabIndex = Math.max(0, currentVisibleTabIndex - 1);
    } else {
      newVisibleTabIndex = Math.min(visibleCatInfo.length - 1, currentVisibleTabIndex + 1);
    }

    if (newVisibleTabIndex !== currentVisibleTabIndex) {
        const targetCategoryName = visibleCatInfo[newVisibleTabIndex].name;
        const originalCategoryIndex = this.categories.findIndex(cat => cat.name === targetCategoryName);

        if (originalCategoryIndex !== -1) {
            this.activeTabIndex = originalCategoryIndex;
            const catInfo = visibleCatInfo[newVisibleTabIndex];
            const hasItems = catInfo && catInfo.count > 0;
            this.focusedItem = { categoryIndex: originalCategoryIndex, itemIndex: hasItems ? 0 : -1 };
        }
    }
  }

  setSearchQuery = (query: string) => {
    this.searchQuery = query;
    // Potentially adjust focus if search results change focused item visibility
    this._adjustFocusAfterModeOrFilterChange();
  }

  toggleKeyboardHelp = () => {
    this.showKeyboardHelp = !this.showKeyboardHelp;
  }

  openAddTodoModal = (categoryType: 'git' | 'project', categoryName: string, exampleItemLocation?: string) => {
    this.addTodoModalData = { categoryType, categoryName, exampleItemLocation };
    this.showAddTodoModal = true;
  }

  closeAddTodoModal = () => {
    this.showAddTodoModal = false;
    this.addTodoModalData = null;
  }

  submitAddTodo = async (formData: { content: string; categoryName: string; categoryType: 'git' | 'project'; exampleItemLocation?: string }) => {
    // console.log('Submitting add todo:', formData); // Keep for debugging if needed
    try {
        await apiAddTodoItem({
            category_type: formData.categoryType,
            category_name: formData.categoryName,
            content: formData.content,
            example_item_location: formData.exampleItemLocation
        });
        await this.loadData(); // Refresh data after adding
    } catch (err) {
        console.error("Failed to submit todo:", err);
        // Optionally set an error state to show in UI
        runInAction(() => {
            this.error = (err as Error).message || "Failed to add ToDo";
        });
    } finally {
        this.closeAddTodoModal();
    }
  }

  // Computed property for flattened list (replaces useMemo in Todo.tsx)
  get computedFlattenedList(): FlatListItem[] {
    if (this.displayMode !== 'section') return [];
    const flatList: FlatListItem[] = [];
    let currentFlatIndex = 0;
    this.filteredCategories.forEach((category: TodoCategory) => {
      const originalCategoryIndex = this.categories.findIndex(c => c.name === category.name);
      if (originalCategoryIndex === -1) return;

      flatList.push({
        type: 'header',
        category: category,
        categoryIndex: originalCategoryIndex,
        flatIndex: currentFlatIndex++
      });
      category.todos.forEach((todo: TodoItem) => {
        // Find original item index carefully. If duplicates exist, this might need a more robust ID.
        // For now, assuming location+content is unique enough within its original category.
        const originalItemIndex = this.categories[originalCategoryIndex]?.todos.findIndex(t => t.location === todo.location && t.content === todo.content) ?? -1;
        
        flatList.push({
          type: 'item',
          todo: todo,
          categoryIndex: originalCategoryIndex,
          itemIndex: originalItemIndex !== -1 ? originalItemIndex : 0, // Fallback for safety, though should always be found
          flatIndex: currentFlatIndex++
        });
      });
    });
    return flatList;
  }

  // Computed property for table display data (replaces useMemo in Todo.tsx)
  get computedTableDisplayData(): TodoTableRow[] {
    if (this.displayMode !== 'table') return [];
    const sortedItems = this.globallySortedAndFilteredTodos;
    const originalStoreCategories = this.categories;

    return sortedItems.map(item => {
      const { content, location, status, originalCategoryIndex, originalItemIndex } = item;
      const parsed = parseTodoContent(content);
      const categoryIcon = originalStoreCategories[originalCategoryIndex]?.icon || ''; // Get icon
      
      let fullPath = location || '';
      let lineNumberStr = '';
      const lineMatch = location?.match(/\:(\d+)$/);
      if (lineMatch) {
        lineNumberStr = lineMatch[1];
        fullPath = location.replace(/\:\d+$/, '');
      }
      const basename = fullPath.split(/[/\\]/).pop() || fullPath || 'N/A';
      
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
        zoneIcon: categoryIcon,
        filePath: basename,
        lineNumber: lineNumberStr,
        created: createdTimestamp,
        finished: completedTimestamp,
        estDuration: null, // Placeholder, logic to derive this can be added if available
        originalTodo: item, // The GlobalTodoItem
        categoryIndex: originalCategoryIndex,
        itemIndex: originalItemIndex,
      };
    });
  }
}

const todoStore = new TodoStoreImpl();
export default todoStore;

// No useTodoSelectors hook needed. Components will import `todoStore`
// and use `observer` from `mobx-react-lite`.
// Computed properties like `filteredCategories`, `globallySortedAndFilteredTodos`, etc.,
// are now part of the store itself.