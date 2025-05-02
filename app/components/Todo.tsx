'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TodoCategory as TodoCategoryType } from '../types';
import { fetchTodoData } from '../services/todoService';
import TodoCategory from './TodoCategory';
import TodoItem from './TodoItem';
import isEqual from 'lodash/isEqual'; // Import lodash for deep comparison

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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
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
      <div className="mb-4">
        <div className="flex border-b border-gray-200">
          {filteredCategories.map((category, index) => (
            <button
              key={index}
              className={`px-4 py-2 font-medium text-sm ${
                activeTabIndex === index
                ? 'border-b-2 border-indigo-500 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } flex items-center gap-2`}
              onClick={() => setActiveTabIndex(index)}
            >
              <span className="text-xl">
                {category.icon}
              </span>
              {category.name}
              <span className="ml-1 bg-gray-200 text-xs rounded-full px-2 py-0.5">
                {category.todos.filter(todo => todo.completed).length}/{category.todos.length}
              </span>
            </button>
          ))}
        </div>
        
        {/* Display active tab content */}
        {filteredCategories.length > 0 && (
          <div className="mt-4 border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-200">
              {filteredCategories[activeTabIndex]?.todos.map((todo, index) => (
                <TodoItem key={index} todo={todo} />
              )) || (
                <div className="p-4 text-center text-gray-500">
                  No todos in this category
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Unitodo</h1>
          <p className="text-gray-500 mt-1">
            {totalTodos} tasks · {completedTodos} completed · {activeTodos} active
            {lastUpdated && (
              <span className="ml-2 text-xs text-gray-400">
                Updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        
        <div className="w-full md:w-auto flex flex-col md:flex-row gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search todos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-64 pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchQuery && (
              <svg
                className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 cursor-pointer hover:text-gray-600"
                viewBox="0 0 20 20"
                fill="currentColor"
                onClick={() => setSearchQuery('')}
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
          
          <div className="flex space-x-2">
            <button 
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all' ? 'bg-indigo-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button 
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'active' ? 'bg-indigo-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
              onClick={() => setFilter('active')}
            >
              Active
            </button>
            <button 
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'completed' ? 'bg-indigo-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
              onClick={() => setFilter('completed')}
            >
              Completed
            </button>
            <button
              className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-200 hover:bg-gray-300 transition-colors"
              onClick={handleRefresh}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            
            {/* Display mode toggle button */}
            <button
              className={`px-3 py-2 rounded-lg text-sm font-medium ${
                displayMode === 'tab' ? 'bg-indigo-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
              } transition-colors`}
              onClick={toggleDisplayMode}
              title={`Switch to ${displayMode === 'section' ? 'tab' : 'section'} mode`}
            >
              {displayMode === 'section' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {filteredCategories.length > 0 ? (
        displayMode === 'section' ? (
          // Section mode (original layout)
          filteredCategories.map((category, index) => (
            <TodoCategory key={index} category={category} />
          ))
        ) : (
          // Tab mode
          renderTabs()
        )
      ) : (
        <div className="text-center p-8 bg-gray-50 rounded-lg">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p className="mt-4 text-lg font-medium text-gray-900">No todos found</p>
          <p className="text-gray-500">Try changing your search or filter.</p>
        </div>
      )}
    </div>
  );
} 