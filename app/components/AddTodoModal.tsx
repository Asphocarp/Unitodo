'use client';

import React, { useState, useEffect, useRef } from 'react';

interface AddTodoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string) => void;
  categoryName: string;
  categoryType: 'git' | 'project';
}

export default function AddTodoModal({
  isOpen,
  onClose,
  onSubmit,
  categoryName,
  categoryType,
}: AddTodoModalProps) {
  const [content, setContent] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Focus the input when modal opens
      inputRef.current.focus();
    }
    // Reset content when modal is opened
    if (isOpen) {
      setContent('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onSubmit(content.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70">
      <div 
        className="bg-white dark:bg-gray-800 rounded-sm shadow-lg w-full max-w-md p-4 border border-border-color dark:border-gray-700"
        onKeyDown={handleKeyDown}
      >
        <h3 className="text-sm font-medium mb-2 dark:text-gray-200">
          Add New Todo to {categoryName} ({categoryType})
        </h3>
        
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter TODO content..." // UNITODO_IGNORE_LINE
            className="w-full px-2 py-1.5 mb-3 text-sm border border-gray-300 dark:border-gray-700 rounded-sm shadow-sm 
                    focus:outline-none focus:ring-1 focus:ring-accent-color focus:border-accent-color 
                    dark:bg-gray-800 dark:text-gray-200"
          />
          
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-sm text-xs hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!content.trim()}
              className="px-3 py-1 bg-accent-color hover:opacity-90 rounded-sm text-xs border border-accent-color transition-opacity disabled:opacity-50"
            >
              Add Todo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 