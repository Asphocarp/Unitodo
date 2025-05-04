'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TodoItem as TodoItemType } from '../types';
import { editTodoItem } from '../services/todoService';
import { parseTodoContent } from '../utils';
import LexicalTodoEditor from './LexicalTodoEditor';
import { EditorState, $getRoot } from 'lexical';
import { nanoid } from 'nanoid';
import { useTodoStore } from '../store/todoStore';

// Function to generate a 5-character timestamp in URL-safe base64 format
// Starting from 25.1.1 (as specified in the README)
function generateTimestamp(): string {
  // Custom Epoch: January 1, 2025 00:00:00 UTC
  const now = new Date();
  const currentUnixTimestamp = Math.floor(now.getTime() / 1000);
  const customEpoch = Math.floor(new Date('2025-01-01T00:00:00Z').getTime() / 1000);
  const secondsSinceCustomEpoch = currentUnixTimestamp - customEpoch;
  // const secondsSinceCustomEpoch = currentUnixTimestamp;

  // Ensure the timestamp is non-negative (for dates before 2025)
  const timestampValue = Math.max(0, secondsSinceCustomEpoch);

  // --- Direct 30-bit Number to 5 URL-Safe Base64 Chars ---
  const urlSafeBase64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let base64Timestamp = '';

  // Extract 5x 6-bit chunks directly from the 30-bit timestampValue
  // (Assuming timestampValue fits within 30 bits for the next ~34 years; 2025-2059)
  const mask6bit = 0x3F; // === 63 === 111111 in binary

  base64Timestamp += urlSafeBase64Chars.charAt((timestampValue >> 24) & mask6bit); // Bits 29-24
  base64Timestamp += urlSafeBase64Chars.charAt((timestampValue >> 18) & mask6bit); // Bits 23-18
  base64Timestamp += urlSafeBase64Chars.charAt((timestampValue >> 12) & mask6bit); // Bits 17-12
  base64Timestamp += urlSafeBase64Chars.charAt((timestampValue >> 6) & mask6bit);  // Bits 11-6
  base64Timestamp += urlSafeBase64Chars.charAt(timestampValue & mask6bit);        // Bits 5-0
  // --- End of Direct Encoding ---

  return base64Timestamp;
}

interface TodoItemProps {
  todo: TodoItemType;
  isFocused: boolean;
  onClick: () => void;
  categoryIndex: number;
  originalCategoryIndex: number;
  itemIndex: number;
  role?: string;
}

export default function TodoItem({ 
  todo, 
  isFocused,
  onClick,
  categoryIndex,
  originalCategoryIndex,
  itemIndex,
  role
}: TodoItemProps) {
  // Use Zustand actions
  const updateTodo = useTodoStore(state => state.updateTodo);
  const navigateTodos = useTodoStore(state => state.navigateTodos);
  
  const [hovered, setHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(todo.content);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const itemRef = useRef<HTMLDivElement>(null);
  
  // Focus the item when isFocused prop changes
  useEffect(() => {
    if (isFocused && !isEditing && itemRef.current) {
      // Check if the element is already focused to avoid loops
      if (document.activeElement !== itemRef.current) {
        itemRef.current.focus({ preventScroll: true });
      }
    }
  }, [isFocused, isEditing]);
  
  useEffect(() => {
    if (!isEditing) {
      setEditedContent(todo.content);
    }
  }, [todo.content, isEditing]);

  const { formattedLocation, fullPath, lineNumber } = React.useMemo(() => {
    if (!todo.location) return { formattedLocation: '', fullPath: '', lineNumber: '' };
    let line = '';
    const lineMatch = todo.location.match(/\:(\d+)$/);
    if (lineMatch) {
      line = lineMatch[1];
    }
    const match = todo.location.match(/([^\/\\]+)(\:\d+)?$/);
    const formatted = match ? match[0] : todo.location;
    return {
      formattedLocation: formatted,
      fullPath: todo.location.replace(/\:\d+$/, ''),
      lineNumber: line
    };
  }, [todo.location]);

  const getVSCodeUrl = () => {
    if (!fullPath) return null;
    let url = `cursor://file/${fullPath}`;
    if (lineNumber) {
      url += `:${lineNumber}`;
    }
    return url;
  };

  const parsed = parseTodoContent(todo.content);
  const isReadOnly = !parsed.isUnique;
  const isValidTodoFormat = parsed.isValidTodoFormat;

  // Format content based on identifier and prefix
  const formatContent = (identifier: string, prefix: string, content: string): string => {
    const literal_first_word = content.split(' ')[0];
    const isAlphanumeric = literal_first_word && /^[a-zA-Z0-9]+$/.test(literal_first_word);
    
    return isAlphanumeric 
      ? `${literal_first_word}${prefix}${identifier} ${content.replace(literal_first_word, '').trim()}`
      : `1${prefix}${identifier} ${content}`;
  };
  
  // Core function to add an identifier using a generator function
  const addIdentifier = async (generateId: () => string, prefix: string) => {
    if (isSaving || !isReadOnly) return;
    
    setError(null);
    setIsSaving(true);
    
    try {
      const identifier = generateId();
      const newContent = formatContent(identifier, prefix, todo.content);
      
      // Call API first
      await editTodoItem({
        location: todo.location,
        new_content: newContent,
        completed: todo.completed,
      });
      
      // Update store
      updateTodo({
        ...todo,
        content: newContent
      });
      
    } catch (err: any) {
      console.error(`Error adding identifier:`, err);
      setError(err.message || `Failed to add identifier.`);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Simple wrapper functions for API compatibility
  const addUniqueId = () => addIdentifier(() => nanoid(20), '#');
  const addTimestamp = () => addIdentifier(generateTimestamp, '@');

  const handleSave = async () => {
    if (isSaving || isReadOnly) return;
    setError(null);
    setIsSaving(true);
    try {
      // Call API first
      await editTodoItem({
        location: todo.location,
        new_content: editedContent,
        completed: todo.completed,
      });
      
      // Update store
      updateTodo({
        ...todo,
        content: editedContent,
        completed: todo.completed,
      });
      
      setIsEditing(false);
    } catch (err: any) {
      console.error('Error saving todo:', err);
      setError(err.message || 'Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedContent(todo.content);
    setError(null);
  };

  const handleEnterSubmit = () => {
    if (isEditing && !isReadOnly) {
      handleSave();
    }
  };

  const handleEditorContentChange = (editorState: EditorState) => {
    if (!isReadOnly && isEditing) {
      editorState.read(() => {
        const root = $getRoot();
        const text = root.getTextContent();
        setEditedContent(text);
      });
    }
  };

  const handleCheckboxChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly || isSaving) return;
    const newCompletedStatus = e.target.checked;
    setError(null);
    setIsSaving(true);
    try {
      const contentToSave = isEditing ? editedContent : todo.content;
      
      // Call API first
      await editTodoItem({
        location: todo.location,
        new_content: contentToSave,
        completed: newCompletedStatus,
      });
      
      // Update store
      updateTodo({
        ...todo,
        content: contentToSave,
        completed: newCompletedStatus
      });
      
    } catch (err: any) {
      console.error('Error saving checkbox state:', err);
      setError(err.message || 'Failed to save completion status.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleCompletion = () => {
    if (isReadOnly || isSaving) return;
    
    const newCompletedStatus = !todo.completed;
    
    // Update store (optimistic update)
    updateTodo({
      ...todo,
      completed: newCompletedStatus
    });
    
    // Call API in background
    editTodoItem({
      location: todo.location,
      new_content: todo.content,
      completed: newCompletedStatus,
    }).catch(err => {
        console.error('Error toggling completion:', err);
        // Revert on error
        updateTodo(todo);
        setError('Failed to toggle completion status.');
      });
  };
  
  const handleEditStart = () => {
    if (!isReadOnly) {
      setEditedContent(todo.content);
      setIsEditing(true);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isEditing) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleCancel();
      }
      // Enter is handled by Lexical's EnterSubmitPlugin
    } else {
      // Prevent default actions for keys we handle
      switch (e.key) {
        case 'Enter':
          if (!isReadOnly) {
            e.preventDefault();
            handleEditStart();
          }
          break;
        case ' ':
        case 'Spacebar':
          if (!isReadOnly) {
            e.preventDefault();
            handleToggleCompletion();
          }
          break;
        case 'ArrowUp':
        case 'k':
          e.preventDefault();
          navigateTodos('up'); // Use store action
          break;
        case 'ArrowDown':
        case 'j':
          e.preventDefault();
          navigateTodos('down'); // Use store action
          break;
      }
    }
  };

  return (
    <div
      className={`hn-todo-item ${
        hovered ? 'bg-gray-50' : ''
      } ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''} ${isSaving ? 'opacity-50 pointer-events-none' : ''} ${isFocused ? 'focused' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={isReadOnly ? 'This TODO cannot be edited directly (non-unique pattern match). Edit the source file.' : todo.content}
      ref={itemRef}
      tabIndex={isFocused ? 0 : -1}
      onKeyDown={handleKeyDown}
      onClick={onClick}
      data-location={todo.location}
      data-category-index={categoryIndex}
      data-item-index={itemIndex}
      role={role}
      aria-current={isFocused ? 'true' : undefined}
    >
      {/* Checkbox */}
      <div onClick={(e) => e.stopPropagation()} className="flex items-center h-full">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={handleCheckboxChange}
          disabled={isReadOnly || isSaving}
          className={`hn-checkbox ${isReadOnly ? 'cursor-not-allowed' : 'cursor-pointer'} ${isSaving ? 'opacity-50' : ''}`}
          aria-label={`Mark todo as ${todo.completed ? 'incomplete' : 'complete'}`}
          tabIndex={-1}
        />
      </div>

      {/* Content Area */}
      <div 
        className="hn-todo-content flex-grow min-w-0"
        onClick={(e) => {
          e.stopPropagation();
          if (!isEditing && !isReadOnly) {
            handleEditStart();
          }
        }}
      >
        <div
          className={`${todo.completed && !isEditing ? 'hn-completed' : ''} ${!isEditing && !isReadOnly ? 'cursor-text' : ''}`}
        >
          <LexicalTodoEditor
            initialFullContent={editedContent}
            isReadOnly={!isEditing || isReadOnly}
            onChange={handleEditorContentChange}
            onSubmit={handleEnterSubmit}
          />
        </div>

        {/* Location Link */}
        {todo.location && (
          <a
            href={getVSCodeUrl() || '#'}
            className="hn-todo-location block text-xs truncate"
            title={todo.location}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (!getVSCodeUrl()) {
                e.preventDefault();
              }
              e.stopPropagation();
            }}
            tabIndex={isFocused ? 0 : -1}
          >
            {formattedLocation}
          </a>
        )}

        {/* Error Message */}
        {error && (
          <div className="text-xs text-red-600 mt-1">Error: {error}</div>
        )}
      </div>

      {/* Action Buttons */}
      <div 
        className={`hn-todo-actions flex items-center pl-2 transition-opacity duration-150 ${hovered || isEditing ? 'opacity-100' : 'opacity-0 group-focus-within:opacity-100'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {isEditing ? (
          <>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="hn-action-button"
              title="Save changes (Enter)"
              tabIndex={isFocused ? 0 : -1}
            >
              save
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="hn-action-button"
              title="Cancel edit (Escape)"
              tabIndex={isFocused ? 0 : -1}
            >
              cancel
            </button>
          </>
        ) : (
          <>
            {isReadOnly && (
              <>
                <button
                  onClick={addUniqueId}
                  disabled={isSaving}
                  className="hn-action-button"
                  title="Add unique ID (#) to make editable"
                  tabIndex={isFocused ? 0 : -1}
                >
                  id
                </button>
                <button
                  onClick={addTimestamp}
                  disabled={isSaving}
                  className="hn-action-button"
                  title="Add timestamp (@) to make editable"
                  tabIndex={isFocused ? 0 : -1}
                >
                  time
                </button>
              </>
            )}
            {!isReadOnly && (
              <button
                onClick={handleEditStart}
                className="hn-action-button"
                title="Edit todo (Enter)"
                tabIndex={isFocused ? 0 : -1}
              >
                edit
              </button>
            )}
          </>
        )}
        {isSaving && <div className="animate-spin h-3 w-3 border-t-2 border-b-2 border-accent-color ml-1"></div>}
      </div>
    </div>
  );
} 