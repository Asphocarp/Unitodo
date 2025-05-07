'use client';

import React, { useState } from 'react';
import useConfigStore from '../store/configStore';

interface AddTodoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (todoText: string, categoryType: 'git' | 'project', categoryName: string) => void;
  categoryName: string;
  categoryType: 'git' | 'project';
}

export default function AddTodoModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  categoryName, 
  categoryType 
}: AddTodoModalProps) {
  const [todoText, setTodoText] = useState('');
  const { config } = useConfigStore();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (todoText.trim()) {
      onSubmit(todoText.trim(), categoryType, categoryName);
    }
  };
  
  if (!isOpen) return null;

  // Get the appropriate todo pattern from config
  let todoPattern = '- [ ] ';
  if (config?.todo_done_pairs && config.todo_done_pairs.length > 0) {
    todoPattern = config.todo_done_pairs[0][0];
    // Add space if pattern doesn't end with one
    if (!todoPattern.endsWith(' ')) {
      todoPattern += ' ';
    }
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center modal-backdrop" onClick={() => onClose()}>
      <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-lg max-w-lg w-full mx-4 modal-content dark:text-gray-200" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-medium">Add Todo to {categoryName}</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="todoText" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Todo text
            </label>
            <div className="relative">
              <div className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400 text-sm">
                {todoPattern}
              </div>
              <textarea
                id="todoText"
                value={todoText}
                onChange={(e) => setTodoText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter your todo here..."
                className="w-full px-3 py-2 pl-[calc(1rem+1ch*7)] border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-notion-green focus:border-notion-green dark:bg-gray-800 dark:text-gray-200"
                autoFocus
                rows={3}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {categoryType === 'git' 
                ? 'This todo will be added to your git repository'
                : 'This todo will be added to your project file'}
            </p>
          </div>
          
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!todoText.trim()}
              className="px-4 py-2 text-sm bg-notion-green text-white rounded-md hover:bg-notion-green/90 transition-colors disabled:opacity-50"
            >
              Add Todo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 