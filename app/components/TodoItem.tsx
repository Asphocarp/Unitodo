'use client';

import React, { useState, useEffect } from 'react';
import { TodoItem as TodoItemType } from '../types';
import { editTodoItem } from '../services/todoService';
import { parseTodoContent } from '../utils';
import LexicalTodoEditor from './LexicalTodoEditor';
import { EditorState, $getRoot } from 'lexical';
import { nanoid } from 'nanoid';

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
      // Generate the identifier using the provided function
      const identifier = generateId();
      
      // Create the new content
      const newContent = formatContent(identifier, prefix, todo.content);
      setEditedContent(newContent);
      
      // Save the updated todo
      await editTodoItem({
        location: todo.location,
        new_content: newContent,
        completed: isCompleted,
      });
      
      // Create updated todo object
      const updatedTodo = {
        ...todo,
        content: newContent
      };
      
      if (onEditSuccess) onEditSuccess(updatedTodo);
    } catch (err: any) {
      console.error(`Error adding identifier:`, err);
      setError(err.message || `Failed to add identifier.`);
      setEditedContent(todo.content);
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

  return (
    <div
      className={`hn-todo-item ${
        hovered ? 'bg-gray-50' : ''
      } ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''} ${isSaving ? 'pointer-events-none' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={isReadOnly ? 'This TODO cannot be edited directly (non-unique pattern match). Edit the source file.' : undefined}
    >
      {/* Checkbox */}
      <div>
        <input
          type="checkbox"
          checked={isCompleted}
          onChange={handleCheckboxChange}
          disabled={isReadOnly || isSaving}
          className={`hn-checkbox ${isReadOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        />
      </div>

      {/* Content Area */}
      <div className="hn-todo-content">
        <div
          className={`${isCompleted && !isEditing ? 'hn-completed' : ''} ${!isEditing && !isReadOnly ? 'cursor-text' : ''}`}
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
            className="hn-todo-location"
            title={todo.location}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (!getVSCodeUrl()) {
                e.preventDefault();
              }
            }}
          >
            {formattedLocation}
          </a>
        )}

        {/* Error Message */}
        {error && (
          <div className="text-xs text-red-600">Error: {error}</div>
        )}
      </div>

      {/* Action Buttons */}
      <div className={`flex items-center transition-opacity duration-150 ${hovered || isEditing ? 'opacity-100' : 'opacity-0'}`}>
        {isEditing ? (
          <>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="hn-action-button"
              title="Save changes"
            >
              save
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="hn-action-button"
              title="Cancel edit"
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
                  title="Add unique ID to make editable"
                >
                  id
                </button>
                <button
                  onClick={addTimestamp}
                  disabled={isSaving}
                  className="hn-action-button"
                  title="Add timestamp to make editable"
                >
                  time
                </button>
              </>
            )}
            {!isReadOnly && (
              <button
                onClick={() => setIsEditing(true)}
                className="hn-action-button"
                title="Edit todo"
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