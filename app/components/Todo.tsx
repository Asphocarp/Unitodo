'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TodoCategory as TodoCategoryType } from '../types';
import { fetchTodoData } from '../services/todoService';
import TodoCategory from './TodoCategory';
import TodoItem from './TodoItem';
import isEqual from 'lodash/isEqual'; // Import lodash for deep comparison
import NerdFontIcon from './NerdFontIcon';

export default function Todo() {
  const [categories, setCategories] = useState<TodoCategoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all'); // 'all', 'completed', 'active'
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [displayMode, setDisplayMode] = useState<'section' | 'tab'>('section'); // Add display mode state
  const [activeTabIndex, setActiveTabIndex] = useState(0); // Track the active tab
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  async function loadData() {
    try {
      // Only show loading indicator on initial mount
      if (isInitialMount.current) {
        setLoading(true);
      }
      
      const newData = await fetchTodoData();
      
      // Compare new data with current data before setting state
      if (!isEqual(categories, newData)) {
          console.log("Data changed, updating state..."); // Debug log
          setCategories(newData);
          setLastUpdated(new Date());
          
          // Reset active tab index if categories change and the current one no longer exists
          if (activeTabIndex >= newData.length) {
            setActiveTabIndex(0);
          }
      } else {
           console.log("Data unchanged, skipping state update."); // Debug log
      }
      setError(null);
    } catch (err) {
      setError('Failed to load todo data. Please try again later.');
      console.error('Error loading todo data:', err);
    } finally {
      if (isInitialMount.current) {
        setLoading(false);
        isInitialMount.current = false; // Mark initial mount as complete
      }
    }
  }

  useEffect(() => {
    // Initial load
    loadData();
    
    // Set up polling interval
    intervalRef.current = setInterval(loadData, 5000);
    
    // Clean up interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []); // Use empty dependency array to run only on mount/unmount

  const handleRefresh = () => {
    loadData(); // Trigger a manual data load
  };

  // Filter todos based on filter state and search query
  const filteredCategories = categories.map(category => {
    const filteredTodos = category.todos.filter(todo => {
      let matchesFilter = true;
      if (filter === 'completed') matchesFilter = todo.completed;
      if (filter === 'active') matchesFilter = !todo.completed;

      // If we have a search query, match against content or location
      const matchesSearch = !searchQuery || 
        todo.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        todo.location.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesFilter && matchesSearch;
    });

    return {
      ...category,
      todos: filteredTodos
    };
  }).filter(category => category.todos.length > 0);

  // Calculate total counts
  const totalTodos = categories.reduce((acc, category) => acc + category.todos.length, 0);
  const completedTodos = categories.reduce(
    (acc, category) => acc + category.todos.filter(todo => todo.completed).length,
    0
  );
  const activeTodos = totalTodos - completedTodos;

  // Handle todo updates from children components
  const handleTodoUpdate = (updatedTodo: TodoCategoryType['todos'][0]) => {
    // Create a deep copy of categories
    const updatedCategories = categories.map(category => {
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
    
    // Update the state with the new categories
    setCategories(updatedCategories);
    setLastUpdated(new Date());
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
      <div className="bg-red-50 p-2 text-xs">
        <strong>Error:</strong> {error}
      </div>
    );
  }

  // Toggle between section and tab mode
  const toggleDisplayMode = () => {
    setDisplayMode(prev => prev === 'section' ? 'tab' : 'section');
  };

  // Render tabs for tab mode
  const renderTabs = () => {
    return (
      <div>
        <div className="flex flex-wrap border-b border-border-color text-xs overflow-visible">
          {filteredCategories.map((category, index) => (
            <button
              key={index}
              className={`px-2 py-1 my-1 mr-1 font-medium ${
                activeTabIndex === index
                ? 'border-b-2 border-accent-color font-bold'
                : 'text-subtle-color'
              }`}
              onClick={() => setActiveTabIndex(index)}
            >
              <NerdFontIcon 
                icon={category.icon} 
                category={category.name} 
                className="text-sm"
              />
              {category.name}
              <span className="ml-1 text-subtle-color">
                ({category.todos.filter(todo => todo.completed).length}/{category.todos.length})
              </span>
            </button>
          ))}
        </div>
        
        {/* Display active tab content */}
        {filteredCategories.length > 0 && (
          <div>
            {filteredCategories[activeTabIndex]?.todos.map((todo, index) => (
              <TodoItem 
                key={`${todo.location}-${index}`} 
                todo={todo} 
                onEditSuccess={handleTodoUpdate} 
              />
            )) || (
              <div className="p-2 text-center text-subtle-color text-xs">
                No todos in this category
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="hn-style">
      <div className="hn-header">
        <h1 className="hn-title">Unitodo</h1>
        <span className="hn-meta">
          {totalTodos} tasks · {completedTodos} completed · {activeTodos} active
          {lastUpdated && (
            <span className="ml-2">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </span>
      </div>
      
      <div className="hn-compact-controls">
        <input
          type="text"
          placeholder="Search todos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="hn-search"
        />
        
        <button 
          className={`hn-filter-button ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button 
          className={`hn-filter-button ${filter === 'active' ? 'active' : ''}`}
          onClick={() => setFilter('active')}
        >
          Active
        </button>
        <button 
          className={`hn-filter-button ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          Completed
        </button>
        <button
          className="hn-filter-button"
          onClick={handleRefresh}
        >
          ↻
        </button>
        
        <button
          className={`hn-filter-button ${displayMode === 'tab' ? 'active' : ''}`}
          onClick={toggleDisplayMode}
          title={`Switch to ${displayMode === 'section' ? 'tab' : 'section'} mode`}
        >
          {displayMode === 'section' ? '⊞' : '≡'}
        </button>
      </div>
      
      {filteredCategories.length > 0 ? (
        displayMode === 'section' ? (
          filteredCategories.map((category, index) => (
            <TodoCategory 
              key={index} 
              category={category}
              onTodoUpdate={handleTodoUpdate}
            />
          ))
        ) : (
          renderTabs()
        )
      ) : (
        <div className="text-center p-2 text-subtle-color text-xs">
          No todos found. Try changing your search or filter.
        </div>
      )}
    </div>
  );
} 