'use client';

import React, { useState, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { TodoItem as TodoItemType } from '../types';
import { editTodoItem as apiEditTodoItem, markTodoAsDone as apiMarkTodoAsDone } from '../services/todoService';
import { parseTodoContent } from '../utils';
import LexicalTodoEditor from './LexicalTodoEditor';
import { EditorState, $getRoot } from 'lexical';
import todoStore, { isStatusDoneLike } from '../store/todoStore';
import configStore from '../store/configStore';
import { openUrl } from '@tauri-apps/plugin-opener'

interface TodoItemProps {
  todo: TodoItemType;
  isFocused: boolean;
  onClick: () => void;
  categoryIndex: number;
  itemIndex: number;
  role?: string;
}

const TodoItem: React.FC<TodoItemProps> = observer(({ 
  todo, 
  isFocused,
  onClick,
  categoryIndex,
  itemIndex,
  role
}) => {
  // Use MobX stores directly
  const { loadData: storeLoadData, updateTodo: storeUpdateTodo, navigateTodos } = todoStore;
  const { config: appConfig } = configStore;
  
  const [hovered, setHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(todo.content);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingInitialFocus, setEditingInitialFocus] = useState<'afterPriority' | 'end' | undefined>();
  const itemRef = useRef<HTMLDivElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (isFocused && !isEditing && itemRef.current) {
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

  const getEditorOpenUrl = () => {
    if (!fullPath || !appConfig) return null;
    const editorScheme = appConfig.editor_uri_scheme || 'vscode://file/';
    let url = `${editorScheme}${fullPath}`;
    if (lineNumber) {
      url += `:${lineNumber}`;
    }
    return url;
  };

  const parsed = parseTodoContent(todo.content);
  const isReadOnly = false;
  const isValidTodoFormat = parsed.isValidTodoFormat;

  const formatContent = (identifier: string, prefix: string, content: string): string => {
    const literal_first_word = content.split(' ')[0];
    const isAlphanumeric = literal_first_word && /^[a-zA-Z0-9]+$/.test(literal_first_word);
    
    return isAlphanumeric 
      ? `${literal_first_word}${prefix}${identifier} ${content.replace(literal_first_word, '').trim()}`
      : `1${prefix}${identifier} ${content}`;
  };
  
  const handleSave = async () => {
    if (isSaving || isReadOnly) return;
    setError(null);
    setIsSaving(true);
    try {
      await apiEditTodoItem({
        location: todo.location,
        new_content: editedContent,
        original_content: todo.content,
      });
      storeUpdateTodo({ ...todo, content: editedContent }, todo.content);
      setIsEditing(false);
      setEditingInitialFocus(undefined);
    } catch (err: any) {
      console.error('Error saving todo:', err);
      setError(err.message && err.message.startsWith('CONFLICT_ERROR:') 
        ? 'This todo has been modified elsewhere. Please refresh and try again.' 
        : err.message || 'Failed to save changes.');
      if (err.message && err.message.startsWith('CONFLICT_ERROR:')) {
        setTimeout(() => setIsEditing(false), 3000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedContent(todo.content);
    setError(null);
    setEditingInitialFocus(undefined);
    if (isFocused && itemRef.current) {
        setTimeout(() => itemRef.current?.focus(), 0);
    }
  };

  const handleEnterSubmit = () => {
    if (isEditing && !isReadOnly) handleSave();
  };

  const handleEditorContentChange = (editorState: EditorState) => {
    if (!isReadOnly && isEditing) {
      editorState.read(() => {
        const root = $getRoot();
        setEditedContent(root.getTextContent());
      });
    }
  };

  const handleToggleDoneViaAPI = async () => {
    if (isReadOnly || isSaving) return;
    setError(null);
    setIsSaving(true);
    try {
      await apiMarkTodoAsDone({
        location: todo.location,
        original_content: todo.content, 
      });
      storeLoadData();
    } catch (err: any) {
      console.error('Error toggling completion status via API:', err);
      setError(err.message && err.message.startsWith('CONFLICT_ERROR:')
        ? 'This todo was modified elsewhere. Please refresh.'
        : err.message || 'Failed to update completion status.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddIgnoreComment = async () => {
    if (isSaving) return;
    if (!todo.location) return;
    const filePath = todo.location.split(':')[0];
    const validExtensions = ['.c', '.rs', '.md', '.ts', '.tsx'];
    if (!validExtensions.some(ext => filePath.endsWith(ext))) {
      setError('Cannot add ignore comment to this file type');
      return;
    }
    if (todo.content.includes('// UNITODO_IGNORE_LINE')) {
      setError('Already has ignore comment');
      return;
    }
    
    setError(null);
    setIsSaving(true);
    try {
      const newContent = `${todo.content} // UNITODO_IGNORE_LINE`;
      await apiEditTodoItem({
        location: todo.location,
        new_content: newContent,
        original_content: todo.content,
      });
      storeUpdateTodo({ ...todo, content: newContent }, todo.content);
    } catch (err: any) {
      console.error('Error adding ignore comment:', err);
      setError(err.message && err.message.startsWith('CONFLICT_ERROR:') 
        ? 'This todo has been modified elsewhere. Refresh and try again.' 
        : err.message || 'Failed to add ignore comment.');
    } finally {
      setIsSaving(false);
      if(isFocused && itemRef.current) itemRef.current.focus();
    }
  };
  
  const handleEditStart = (focusMode?: 'afterPriority' | 'end') => {
    if (!isReadOnly) {
      setEditedContent(todo.content);
      setIsEditing(true);
      setEditingInitialFocus(focusMode);
    }
  };
  
  const handleKeyDown = async (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isEditing) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleCancel();
      }
    } else {
      switch (e.key) {
        case 'i':
        case 'a':
          if (!isReadOnly) { e.preventDefault(); handleEditStart('end'); }
          break;
        case 'I': 
          if (e.shiftKey && !isReadOnly) { e.preventDefault(); handleEditStart('afterPriority'); }
          break;
        case 'x': e.preventDefault(); handleAddIgnoreComment(); break;
        case 'Enter':
          e.preventDefault();
          if (todo.location) {
            const url = getEditorOpenUrl();
            if (url) {
              try {
                await openUrl(url);
                setTimeout(() => itemRef.current?.focus({preventScroll: true}), 100);
              } catch (error) {
                console.error('[TodoItem] Error opening URL:', error);
                try { window.open(url, '_blank'); } catch (e2) { console.error('Fallback open failed', e2);}
              }
            }
          }
          break;
        case ' ':
        case 'Spacebar':
          if (!isReadOnly) { e.preventDefault(); handleToggleDoneViaAPI(); }
          break;
        case 'ArrowUp':
        case 'k':
          e.preventDefault();
          navigateTodos('up', e.shiftKey ? 5 : 1);
          break;
        case 'ArrowDown':
        case 'j':
          e.preventDefault();
          navigateTodos('down', e.shiftKey ? 5 : 1);
          break;
        case 'K': if(e.shiftKey) { e.preventDefault(); navigateTodos('up', 5); } break; 
        case 'J': if(e.shiftKey) { e.preventDefault(); navigateTodos('down', 5); } break;
      }
    }
  };

  const handleLocationClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault(); 
    e.stopPropagation();
    const url = getEditorOpenUrl();
    if (url) {
      try {
        await openUrl(url);
      } catch (err) {
        console.error('Failed to open URL with Tauri shell:', err);
        setError('Failed to open link.');
      }
    }
  };

  const isDone = appConfig ? isStatusDoneLike(todo.status, appConfig) : false;

  return (
    <div
      className={`hn-todo-item flex items-center h-6 ${
        hovered ? 'bg-neutral-50 dark:bg-neutral-800' : ''
      } ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''} ${
        isSaving ? 'opacity-50 pointer-events-none' : ''
      } ${isFocused ? 'focused bg-neutral-100 dark:bg-neutral-700/50' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={isReadOnly ? 'This TODO cannot be edited directly.' : todo.content}
      ref={itemRef}
      tabIndex={isFocused ? 0 : -1}
      onKeyDown={handleKeyDown}
      onClick={(e) => {
        if (isFocused && !isEditing && !isReadOnly) {
            const target = e.target as HTMLElement;
            if (!target.closest('.hn-checkbox-container') && !target.closest('.hn-todo-location')) {
                handleEditStart();
            }
        } else {
            onClick();
        }
      }}
      data-location={todo.location}
      data-category-index={categoryIndex}
      data-item-index={itemIndex}
      role={role}
      aria-current={isFocused ? 'true' : undefined}
    >
      <div 
        className="hn-checkbox-container flex-shrink-0 mr-0.5 h-full flex items-center justify-center"
        onClick={(e) => {
          e.stopPropagation();
          if (!isReadOnly && !isSaving) {
            handleToggleDoneViaAPI();
          }
        }}
      >
        <input
          type="checkbox"
          checked={isDone}
          onChange={() => {}}
          disabled={isReadOnly || isSaving}
          className={`hn-checkbox ${isReadOnly ? 'cursor-not-allowed' : 'cursor-pointer'} ${isSaving ? 'opacity-50' : ''}`}
          aria-label={`Mark todo as ${isDone ? 'not done' : 'done'}`}
          tabIndex={-1}
        />
      </div>

      <div 
        className="hn-todo-content flex-grow min-w-0 flex items-center h-full overflow-hidden"
        ref={editorContainerRef}
        onDoubleClick={() => {
            if (!isEditing && !isReadOnly) {
                handleEditStart();
            }
        }}
      >
        <div
          className={`${isDone && !isEditing ? 'hn-completed' : ''} ${!isEditing && !isReadOnly ? 'cursor-text' : ''} overflow-hidden text-ellipsis flex-grow flex items-center w-full`}
        >
          <LexicalTodoEditor
            initialFullContent={isEditing ? editedContent : todo.content}
            isReadOnly={!isEditing || isReadOnly}
            onChange={handleEditorContentChange}
            onSubmit={handleEnterSubmit}
            initialFocus={editingInitialFocus}
          />
        </div>

        {todo.location && (
          <a
            href={getEditorOpenUrl() || '#'}
            className={`hn-todo-location text-xs truncate text-neutral-500 transition-all duration-200 flex items-center ml-2 flex-shrink-0 ${
              (hovered || isFocused || isEditing) ? 'opacity-100' : 'opacity-50 hover:opacity-100'
            }`}
            title={todo.location}
            onClick={handleLocationClick}
            tabIndex={isFocused ? 0 : -1}
          >
            {formattedLocation}
          </a>
        )}
      </div>

      {error && (
        <div className="text-xs text-red-600 dark:text-red-400 ml-2 flex-shrink-0 flex items-center" title={error}>Error!</div>
      )}
    </div>
  );
});

export default TodoItem;