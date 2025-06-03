'use client';

import React, { useState, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import configStore from '../store/configStore';
import todoStore from '../store/todoStore';

interface AddTodoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (todoText: string, categoryType: 'git' | 'project', categoryName: string) => void;
  categoryName?: string;
  categoryType?: 'git' | 'project';
}

const AddTodoModal: React.FC<AddTodoModalProps> = observer(({ 
  isOpen, 
  onClose, 
  onSubmit, 
  categoryName, 
  categoryType 
}) => {
  const [todoText, setTodoText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const { config } = configStore;
  const inputRef = useRef<HTMLInputElement>(null);
  
  const categories = todoStore.categories;
  
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (isOpen) {
      setTodoText('');
      if (categoryName && categories.some(cat => cat.name === categoryName)) {
        setSelectedCategory(categoryName);
      } else if (categories.length > 0) {
        setSelectedCategory(categories[0].name);
      }
    }
  }, [isOpen, categoryName, categories]);

  const getSelectedCategoryType = (): 'git' | 'project' => {
    const category = categories.find(cat => cat.name === selectedCategory);
    if (category?.icon === "󰊢") return 'git';
    if (category?.icon === "") return 'project';
    return 'project';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = todoText.trim();
    if (trimmed && selectedCategory) {
      const categoryType = getSelectedCategoryType();
      onSubmit(trimmed, categoryType, selectedCategory);
    }
  };
  
  if (!isOpen) return null;
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-xl max-w-2xl w-full mx-4 border dark:border-neutral-700" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-medium">Add Todo</h3>
          <button 
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 p-1 rounded transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-700 rounded 
                       focus:ring-1 focus:ring-accent-color focus:border-accent-color 
                       dark:bg-neutral-800 appearance-none pr-8"
            style={{ 
              backgroundPosition: 'right 0.5rem center', 
              backgroundSize: '1.2em 1.2em'
            }}
          >
            {categories.map((category) => (
              <option key={category.name} value={category.name}>
                {category.name} ({category.icon === "󰊢" ? 'git' : 'project'})
              </option>
            ))}
          </select>
          
          <input
            ref={inputRef}
            value={todoText}
            onChange={(e) => setTodoText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter todo description..."
            className="w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-700 rounded 
                       focus:ring-1 focus:ring-accent-color focus:border-accent-color 
                       dark:bg-neutral-800"
            autoFocus
          />
          
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-sm border border-subtle-color dark:border-neutral-600 rounded 
                         hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!todoText.trim() || !selectedCategory}
              className="flex-1 py-2 text-sm bg-accent-color hover:bg-accent-color/90 rounded 
                         transition-colors disabled:opacity-50 border border-accent-color"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

export default AddTodoModal; 