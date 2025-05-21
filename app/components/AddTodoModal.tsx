'use client';

import React, { useState, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import configStore from '../store/configStore';

interface AddTodoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (todoText: string, categoryType: 'git' | 'project', categoryName: string) => void;
  categoryName: string;
  categoryType: 'git' | 'project';
}

const AddTodoModal: React.FC<AddTodoModalProps> = observer(({ 
  isOpen, 
  onClose, 
  onSubmit, 
  categoryName, 
  categoryType 
}) => {
  const [todoText, setTodoText] = useState('');
  const { config } = configStore;
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (isOpen) {
      setTodoText('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = todoText.trim();
    if (trimmed) {
      onSubmit(trimmed, categoryType, categoryName);
    }
  };
  
  if (!isOpen) return null;
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center modal-backdrop" onClick={onClose}>
      <div className="bg-white dark:bg-neutral-800 p-5 rounded-lg shadow-lg max-w-lg w-full mx-4 modal-content dark:text-neutral-200" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-medium">Add Todo to {categoryName} ({categoryType})</h3>
          <button 
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            aria-label="Close modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <input
                id="todoText"
                ref={inputRef}
                value={todoText}
                onChange={(e) => setTodoText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter your todo here... (e.g., Fix the login bug)"
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-1 focus:ring-accent-color focus:border-accent-color dark:bg-neutral-800 dark:text-neutral-200"
                autoFocus
                type="text"
            />
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              {categoryType === 'git' 
                ? 'This todo will be added to a file in your git repository.'
                : 'This todo will be added to your project file.'}
                 Standard TODO pattern will be prepended if not typed.
            </p>
          </div>
          
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-700 dark:text-neutral-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!todoText.trim()}
              className="px-4 py-2 text-sm bg-notion-green rounded-md hover:bg-notion-green/90 transition-colors disabled:opacity-50"
            >
              Add Todo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

export default AddTodoModal; 