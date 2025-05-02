'use client';

import React from 'react';
import { TodoItem as TodoItemType } from '../types';
import { parseTodoContent } from '../utils';
import LexicalTodoEditor from './LexicalTodoEditor';

interface TodoItemProps {
  todo: TodoItemType;
}

export default function TodoItem({ todo }: TodoItemProps) {
  const [hovered, setHovered] = React.useState(false);
  
  // If the location contains a file path, extract just the filename and line number
  const { formattedLocation, fullPath, lineNumber } = React.useMemo(() => {
    if (!todo.location) return { formattedLocation: '', fullPath: '', lineNumber: '' };
    
    // Extract line number if present
    let line = '';
    const lineMatch = todo.location.match(/\:(\d+)$/);
    if (lineMatch) {
      line = lineMatch[1];
    }
    
    // If we have a full file path, extract just the filename
    const match = todo.location.match(/([^\/\\]+)(\:\d+)?$/);
    const formatted = match ? match[0] : todo.location;
    
    return { 
      formattedLocation: formatted,
      fullPath: todo.location.replace(/\:\d+$/, ''), // Remove line number for path
      lineNumber: line
    };
  }, [todo.location]);
  
  // Create VSCode URL to open the file directly
  const getVSCodeUrl = () => {
    if (!fullPath) return null;
    
    let url = `cursor://file/${fullPath}`;
    if (lineNumber) {
      url += `:${lineNumber}`;
    }
    return url;
  };

  // Parse only to determine read-only status and validity
  const parsed = parseTodoContent(todo.content);
  const isReadOnly = !parsed.isUnique;
  const isValidTodoFormat = parsed.isValidTodoFormat; // Keep track of validity

  const handleEditorChange = (editorState: any) => {
    // TODO: Implement saving logic
    // console.log(JSON.stringify(editorState));
  };
  
  return (
    <div 
      className={`flex items-start gap-2 p-3 border-b border-gray-200 ${hovered ? 'bg-gray-50' : ''} ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={isReadOnly ? 'This TODO cannot be edited here. Edit the original source file.' : undefined}
    >
      <div className="flex-shrink-0 mt-0.5">
        <input 
          type="checkbox" 
          checked={todo.completed}
          readOnly
          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className={`text-sm ${todo.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
          {isValidTodoFormat ? (
            <LexicalTodoEditor
              initialFullContent={todo.content}
              isReadOnly={isReadOnly}
              onChange={handleEditorChange} 
            />
          ) : (
            <span className="text-gray-400 italic">{todo.content}</span>
          )}
        </div>
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
      </div>
      {hovered && (
        <div className="flex-shrink-0 text-gray-400 cursor-pointer">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </div>
      )}
    </div>
  );
} 