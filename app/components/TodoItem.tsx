'use client';

import React, { useState, useEffect } from 'react';
import { TodoItem as TodoItemType } from '../types';
import { editTodoItem } from '../services/todoService';
import { parseTodoContent } from '../utils';
import LexicalTodoEditor from './LexicalTodoEditor';
import { EditorState, $getRoot } from 'lexical'; // Import EditorState and $getRoot
import { CheckCircleIcon, XCircleIcon, PencilIcon, CheckIcon, KeyIcon } from '@heroicons/react/24/solid';
import { nanoid } from 'nanoid';

interface TodoItemProps {
  todo: TodoItemType;
  onEditSuccess?: (updatedTodo: TodoItemType) => void;
}

export default function TodoItem({ todo, onEditSuccess }: TodoItemProps) {
  const [hovered, setHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(todo.content);
  const [isCompleted, setIsCompleted] = useState(todo.completed);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setEditedContent(todo.content);
      setIsCompleted(todo.completed);
    }
  }, [todo.content, todo.completed, isEditing]);

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

  const handleSave = async () => {
    if (isSaving || isReadOnly) return;
    setError(null);
    setIsSaving(true);
    try {
      await editTodoItem({
        location: todo.location,
        new_content: editedContent,
        completed: isCompleted,
      });
      
      // Create updated todo object with the new content
      const updatedTodo = {
        ...todo,
        content: editedContent,
        completed: isCompleted
      };
      
      setIsEditing(false);
      if (onEditSuccess) onEditSuccess(updatedTodo);
    } catch (err: any) {
      console.error('Error saving todo:', err);
      setError(err.message || 'Failed to save changes.');
    } finally {
      setEditedContent(editedContent); // TODO hacky way to update the frontend immediately (maybe need to use a better state management framework to avoid this)
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedContent(todo.content);
    setIsCompleted(todo.completed);
    setError(null);
  };

  const handleEnterSubmit = () => {
    setIsEditing(false);
    handleSave();
  };

  const handleEditorContentChange = (editorState: EditorState) => {
    if (!isReadOnly) {
      editorState.read(() => {
        const root = $getRoot();
        const text = root.getTextContent();
        setEditedContent(text);
      });
    }
  };

  const handleCheckboxChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;
    const newCompletedStatus = e.target.checked;
    setIsCompleted(newCompletedStatus);
    setError(null);
    setIsSaving(true);
    try {
      const contentToSave = isEditing ? editedContent : todo.content;
      await editTodoItem({
        location: todo.location,
        new_content: contentToSave,
        completed: newCompletedStatus,
      });
      
      // Create updated todo object with the new completion status
      const updatedTodo = {
        ...todo,
        content: contentToSave,
        completed: newCompletedStatus
      };
      
      if (onEditSuccess) onEditSuccess(updatedTodo);
    } catch (err: any) {
      console.error('Error saving checkbox state:', err);
      setError(err.message || 'Failed to save completion status.');
      setIsCompleted(!newCompletedStatus);
    } finally {
      setIsSaving(false);
    }
  };

  const addUniqueId = async () => {
    if (isSaving || !isReadOnly) return;
    setError(null);
    setIsSaving(true);
    
    try {
      // Generate a unique nanoid (20 characters)
      const id = nanoid(20);
      
      // Parse current content to extract parts
      const parsed = parseTodoContent(todo.content);
      
      // Create new content with the unique ID
      // Format: [priority]#[nanoid] [mainContent]
      const priority = parsed.priority || '1'; // Default priority to 1 if not present
      const newContent = `${priority}#${id} ${parsed.mainContent}`;
      setEditedContent(newContent);
      
      // Save the updated todo
      await editTodoItem({
        location: todo.location,
        new_content: newContent,
        completed: isCompleted,
      });
      
      // Create updated todo object with the new content that includes unique ID
      const updatedTodo = {
        ...todo,
        content: newContent
      };
      
      if (onEditSuccess) onEditSuccess(updatedTodo);
    } catch (err: any) {
      console.error('Error adding unique ID:', err);
      setError(err.message || 'Failed to add unique ID.');
      setEditedContent(todo.content);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={`flex items-start gap-3 p-3 border-b border-gray-200 group relative ${
        hovered ? 'bg-gray-50' : ''
      } ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''} ${isSaving ? 'pointer-events-none' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={isReadOnly ? 'This TODO cannot be edited directly (non-unique pattern match). Edit the source file.' : undefined}
    >
      {/* Checkbox */}
      <div className="flex-shrink-0 mt-1">
        <input
          type="checkbox"
          checked={isCompleted}
          onChange={handleCheckboxChange}
          disabled={isReadOnly || isSaving}
          className={`h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ${isReadOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        />
      </div>

      {/* Content Area (Editor or Display) */}
      <div className="min-w-0 flex-1">
        <div
          className={`text-sm ${isCompleted && !isEditing ? 'line-through text-gray-500' : 'text-gray-900'} ${!isEditing && !isReadOnly ? 'cursor-text' : ''}`}
          onClick={() => {
            if (!isEditing && !isReadOnly) {
              setIsEditing(true);
            }
          }}
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
            className="text-xs text-gray-500 mt-1 flex items-center hover:text-indigo-600 group"
            title={todo.location}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (!getVSCodeUrl()) {
                e.preventDefault();
              }
            }}
          >
            <svg className="h-3 w-3 mr-1 group-hover:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            {formattedLocation}
          </a>
        )}

        {/* Error Message */}
        {error && (
          <p className="mt-1 text-xs text-red-600">Error: {error}</p>
        )}
      </div>

      {/* Action Buttons (Edit/Save/Cancel) - Show on hover or when editing */}
      <div className={`absolute top-2 right-2 flex items-center gap-2 transition-opacity duration-150 ${hovered || isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        {isEditing ? (
          <>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"
              title="Save changes"
            >
              <CheckIcon className="h-5 w-5" />
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="p-1 text-red-600 hover:text-red-800 disabled:opacity-50"
              title="Cancel edit"
            >
              <XCircleIcon className="h-5 w-5" />
            </button>
          </>
        ) : (
          <>
            {isReadOnly && (
              <button
                onClick={addUniqueId}
                disabled={isSaving}
                className="p-1 text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                title="Add unique ID to make editable"
              >
                <KeyIcon className="h-4 w-4" />
              </button>
            )}
            {!isReadOnly && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 text-gray-500 hover:text-indigo-600"
                title="Edit todo"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
            )}
          </>
        )}
        {isSaving && <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-indigo-500"></div>}
      </div>
    </div>
  );
} 