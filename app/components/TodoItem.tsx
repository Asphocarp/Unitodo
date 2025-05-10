'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TodoItem as TodoItemType } from '../types';
import { editTodoItem, markTodoAsDone } from '../services/todoService';
import { parseTodoContent, generateTimestamp } from '../utils';
import LexicalTodoEditor from './LexicalTodoEditor';
import { EditorState, $getRoot } from 'lexical';
import { nanoid } from 'nanoid';
import { useTodoStore } from '../store/todoStore';
import useConfigStore from '../store/configStore';
import { openUrl } from '@tauri-apps/plugin-opener'

interface TodoItemProps {
  todo: TodoItemType;
  isFocused: boolean;
  onClick: () => void;
  categoryIndex: number;
  itemIndex: number;
  role?: string;
}

export default function TodoItem({ 
  todo, 
  isFocused,
  onClick,
  categoryIndex,
  itemIndex,
  role
}: TodoItemProps) {
  // Use Zustand actions
  const updateTodo = useTodoStore(state => state.updateTodo);
  const navigateTodos = useTodoStore(state => state.navigateTodos);
  const { config: appConfig } = useConfigStore();
  
  const [hovered, setHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(todo.content);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const itemRef = useRef<HTMLDivElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  
  // Focus the item when isFocused prop changes
  useEffect(() => {
    if (isFocused && !isEditing && itemRef.current) {
      // Check if the element is already focused to avoid loops
      if (document.activeElement !== itemRef.current) {
        itemRef.current.focus({ preventScroll: false });
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
    // Use editor URI scheme from config, fallback to default
    const editorScheme = appConfig?.editor_uri_scheme || 'vscode://file/';
    let url = `${editorScheme}${fullPath}`;
    if (lineNumber) {
      url += `:${lineNumber}`;
    }
    return url;
  };

  const parsed = parseTodoContent(todo.content);
  // const isReadOnly = !parsed.isUnique; // TODO 1 consider no more unique-id?
  const isReadOnly = false;
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
        original_content: todo.content, // Add original content for verification
        completed: todo.completed,
      });
      
      // Update store
      updateTodo({
        ...todo,
        content: newContent
      });
      
    } catch (err: any) {
      console.error(`Error adding identifier:`, err);
      
      // Special handling for content conflicts
      if (err.message && err.message.startsWith('CONFLICT_ERROR:')) {
        setError('This todo has been modified elsewhere. Please refresh and try again.');
      } else {
        setError(err.message || `Failed to add identifier.`);
      }
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
      // Call API first with original content for verification
      await editTodoItem({
        location: todo.location,
        new_content: editedContent,
        original_content: todo.content, // Add original content for verification
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
      
      // Special handling for content conflicts
      if (err.message && err.message.startsWith('CONFLICT_ERROR:')) {
        setError('This todo has been modified elsewhere. Please refresh and try again.');
        setTimeout(() => {
          setIsEditing(false); // Close the editor after showing the error
        }, 3000);
      } else {
        setError(err.message || 'Failed to save changes.');
      }
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

  const handleToggleDoneViaAPI = async () => {
    if (isReadOnly || isSaving) return;
    setError(null);
    setIsSaving(true);
    try {
      const response = await markTodoAsDone({
        location: todo.location,
        original_content: todo.content, 
      });

      updateTodo({
        ...todo,
        content: response.getNewContent(),
        completed: response.getCompleted(),
      });

    } catch (err: any) {
      console.error('Error toggling completion status via API:', err);
      if (err.message && err.message.startsWith('CONFLICT_ERROR:')) {
        setError('This todo was modified elsewhere. Please refresh and try again.');
      } else {
        setError(err.message || 'Failed to update completion status.');
      }
      // Optionally, if we had an optimistic update, revert it here.
      // For now, we wait for backend so no optimistic update to revert.
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddIgnoreComment = async () => {
    if (isSaving) return;
    
    // Check if location exists
    if (!todo.location) return;
    
    // Extract the file path from the location (which includes line number)
    const filePath = todo.location.split(':')[0];
    
    // Check if the file has a valid extension
    const validExtensions = ['.c', '.rs', '.md', '.ts', '.tsx'];
    const hasValidExtension = validExtensions.some(ext => filePath.endsWith(ext));
    
    if (!hasValidExtension) {
      setError('Cannot add ignore comment to this file type');
      return;
    }
    
    // Check if already has the ignore comment
    if (todo.content.includes('// UNITODO_IGNORE_LINE')) {
      setError('Already has ignore comment');
      return;
    }
    
    setError(null);
    setIsSaving(true);
    
    try {
      const newContent = `${todo.content} // UNITODO_IGNORE_LINE`;
      
      // Call API first
      await editTodoItem({
        location: todo.location,
        new_content: newContent,
        original_content: todo.content, // Add original content for verification
        completed: todo.completed,
      });
      
      // Update store
      updateTodo({
        ...todo,
        content: newContent
      });
      
    } catch (err: any) {
      console.error('Error adding ignore comment:', err);
      
      // Special handling for content conflicts
      if (err.message && err.message.startsWith('CONFLICT_ERROR:')) {
        setError('This todo has been modified elsewhere. Please refresh and try again.');
      } else {
        setError(err.message || 'Failed to add ignore comment.');
      }
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleEditStart = () => {
    if (!isReadOnly) {
      setEditedContent(todo.content);
      setIsEditing(true);
    }
  };
  
  const handleKeyDown = async (e: React.KeyboardEvent<HTMLDivElement>) => {
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
        case 'i':
        case 'a':
          if (!isReadOnly) {
            e.preventDefault();
            handleEditStart();
          }
          break;
        case 'x':
        //   if (!isReadOnly) {
          e.preventDefault();
          handleAddIgnoreComment();
        //   }
          break;
        case 'Enter':
          e.preventDefault();
          if (todo.location) {
            const url = getVSCodeUrl();
            if (url) {
              const currentItemRef = itemRef.current; // Capture ref before await
              try {
                await openUrl(url);
                // Attempt to re-focus the item after the external action
                if (currentItemRef && isFocused && document.body.contains(currentItemRef)) {
                  setTimeout(() => {
                    // Check itemRef again inside setTimeout as component might have updated
                    if (itemRef.current && document.body.contains(itemRef.current)) {
                      itemRef.current.focus({ preventScroll: true });
                      console.log('[TodoItem] Attempted to re-focus item after openExternal:', todo.location);
                    }
                  }, 100); // 100ms delay for OS context switch
                }
              } catch (error) {
                console.error('[TodoItem] Error opening URL:', error);
                try {
                  window.open(url, '_blank');
                } catch (secondError) {
                  console.error('[TodoItem] Fallback also failed:', secondError);
                }
              }
            }
          }
          break;
        case ' ':
        case 'Spacebar':
          if (!isReadOnly) {
            e.preventDefault();
            handleToggleDoneViaAPI();
          }
          break;
        case 'ArrowUp':
        case 'k':
          e.preventDefault();
          // If shift is pressed, jump 5 lines at a time
          navigateTodos('up', e.shiftKey ? 5 : 1);
          break;
        case 'ArrowDown':
        case 'j':
          e.preventDefault();
          // If shift is pressed, jump 5 lines at a time
          navigateTodos('down', e.shiftKey ? 5 : 1);
          break;
        case 'K':
          e.preventDefault();
          navigateTodos('up', 5);
          break;
        case 'J':
          e.preventDefault();
          navigateTodos('down', 5);
          break;
      }
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Only handle blur if we're in editing mode
    if (isEditing) {
      // Skip if we're focusing something inside our component
      if (editorContainerRef.current?.contains(e.relatedTarget as Node)) {
        return;
      }
      
      // Skip if clicking one of our action buttons
      const isActionButton = (e.relatedTarget as HTMLElement)?.closest('.hn-todo-actions');
      if (isActionButton) {
        return;
      }
      
      handleCancel();
    }
  };

  const handleLocationClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault(); 
    const url = getVSCodeUrl();
    if (url) {
      try {
        // if (url.startsWith('vscode://') || url.startsWith('cursor://') || url.startsWith('http://') || url.startsWith('https://')) {
        //   console.log(`Attempting to open URL with Tauri shell: ${url}`);
        await openUrl(url);
        // } else {
        //   console.warn(`Unsupported URL scheme for shellOpen: ${url}`);
        // }
      } catch (err) {
        console.error('Failed to open URL with Tauri shell:', err);
        setError('Failed to open link. Ensure the editor or application is configured correctly.');
      }
    }
  };

  return (
    <div
      className={`hn-todo-item flex items-center h-6 ${
        hovered ? 'bg-gray-50 dark:bg-gray-800' : ''
      } ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''} ${isSaving ? 'opacity-50 pointer-events-none' : ''} ${isFocused ? 'focused' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={isReadOnly ? 'This TODO cannot be edited directly (non-unique pattern match). Edit the source file.' : todo.content} // UNITODO_IGNORE_LINE
      ref={itemRef}
      tabIndex={isFocused ? 0 : -1}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      onClick={(e) => {
        // Set focus to this item when it's clicked
        onClick();
        if (itemRef.current && !isEditing) {
          itemRef.current.focus();
        }
      }}
      data-location={todo.location}
      data-category-index={categoryIndex}
      data-item-index={itemIndex}
      role={role}
      aria-current={isFocused ? 'true' : undefined}
    >
      {/* Checkbox */}
      <div 
        className="flex-shrink-0 mr-0.5 h-full flex items-center justify-center"
        onClick={(e) => {
          // Let the event through, but still toggle checkbox
          if (!isReadOnly && !isSaving) {
            handleToggleDoneViaAPI();
          }
        }}
      >
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={(e) => {
            // This onChange is mostly for visual feedback now, the actual logic is in onClick of parent div
            // or could directly call handleToggleDoneViaAPI if preferred, but might cause double calls with parent div's onClick
            // For simplicity, we let the parent div's onClick handle the API call.
            // If we wanted direct checkbox interaction to call API, we'd need to stopPropagation in parent's onClick
            // or remove the parent div's onClick effect for checkbox changes.
          }}
          disabled={isReadOnly || isSaving}
          className={`hn-checkbox ${isReadOnly ? 'cursor-not-allowed' : 'cursor-pointer'} ${isSaving ? 'opacity-50' : ''}`}
          aria-label={`Mark todo as ${todo.completed ? 'incomplete' : 'complete'}`}
          tabIndex={-1}
        />
      </div>

      {/* Content Area */}
      <div 
        className="hn-todo-content flex-grow min-w-0 flex items-center h-full overflow-hidden"
        onClick={(e) => {
          if (!isEditing && !isReadOnly) {
            handleEditStart();
          }
        }}
        ref={editorContainerRef}
      >
        <div
          className={`${todo.completed && !isEditing ? 'hn-completed' : ''} ${!isEditing && !isReadOnly ? 'cursor-text' : ''} overflow-hidden text-ellipsis flex-grow flex items-center`}
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
            className={`hn-todo-location text-xs truncate text-gray-500 transition-all duration-200 flex items-center ${
              (hovered || isFocused || isEditing) ? 'flex-shrink-0' : 'flex-grow-0 pr-2'
            }`}
            title={todo.location}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleLocationClick}
            tabIndex={isFocused ? 0 : -1}
          >
            {formattedLocation}
          </a>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-xs text-red-600 flex-shrink-0 flex items-center">Error: {error}</div>
      )}
    </div>
  );
}