'use client';

import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  ColumnDef,
  flexRender,
  Row,
  ColumnOrderState,
} from '@tanstack/react-table';
import { DndContext, closestCenter, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import { arrayMove, SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TodoItem as TodoItemType, TodoCategory as TodoCategoryType } from '../types';
import { parseTodoContent, decodeTimestampId } from '../utils'; // Added decodeTimestampId here
import TodoItem from './TodoItem'; // We might reuse parts or styling
import { markTodoAsDone } from '../services/todoService'; // Import for checkbox functionality
import { useTodoStore } from '../store/todoStore'; // To call updateTodo or loadData
import NerdFontIcon from './NerdFontIcon'; // Import NerdFontIcon

// Define a type for our table row data
export interface TodoTableRow {
  id: string; // Unique ID for the row (e.g., todo.location + todo.content hash)
  content: string;
  parsedContent: ReturnType<typeof parseTodoContent>; // Keep parsed content for rich display
  zone: string; // Category name (git-repo or project-name)
  filePath: string;
  lineNumber: string;
  created: string | null; // Will be extracted from parsedContent.idPart
  finished: string | null; // Will be extracted from parsedContent.donePart
  estDuration: string | null; // Placeholder
  originalTodo: TodoItemType; // Keep original todo for actions
  categoryIndex: number;
  itemIndex: number;
}

interface DraggableHeaderProps {
  header: any; // Type for header is complex, using any for now
  children: React.ReactNode;
}

const DraggableHeader: React.FC<DraggableHeaderProps> = ({ header, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: header.id,
  });

  const style: React.CSSProperties = {
    opacity: isDragging ? 0.8 : 1,
    position: 'relative',
    transform: CSS.Translate.toString(transform),
    transition,
    whiteSpace: 'nowrap',
    width: header.column.getSize(),
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <th
      ref={setNodeRef}
      style={style}
      colSpan={header.colSpan}
      className="px-2 py-1 border-b border-r dark:border-neutral-700 relative group hover:bg-neutral-100 dark:hover:bg-neutral-700/50"
    >
      <div className="flex items-center justify-between">
        {children}
        {header.id !== 'select' && (
          <button 
            {...attributes} 
            {...listeners} 
            className="cursor-grab p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
            </svg>
          </button>
        )}
      </div>
      {header.column.getCanResize() && (
        <div
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          className={`absolute top-0 right-0 h-full w-3 cursor-col-resize select-none touch-none flex items-center justify-end
            after:absolute after:right-0 after:w-0.5 after:h-3/5 after:bg-transparent after:transition-all after:duration-200 after:rounded-full
            hover:after:bg-neutral-500 dark:hover:after:bg-neutral-400
            ${header.column.getIsResizing() ? 'after:bg-neutral-600 dark:after:bg-neutral-300' : ''}
          `}
        />
      )}
    </th>
  );
};


interface TodoTableProps {
  categories: TodoCategoryType[];
  // Add other necessary props like focus handlers, etc.
  onRowClick: (categoryIndex: number, itemIndex: number) => void;
  focusedItem: { categoryIndex: number; itemIndex: number; };
}

export default function TodoTable({ categories, onRowClick, focusedItem }: TodoTableProps) {
  const columns = useMemo((): ColumnDef<TodoTableRow>[] => [
    {
      id: 'select',
      header: () => null,
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="hn-checkbox h-3.5 w-3.5"
          {...{
            checked: row.original.originalTodo.completed, // Reflect actual completion
            disabled: !row.original.parsedContent.isUnique, // Or other conditions for read-only
            onChange: async () => {
              const todo = row.original.originalTodo;
              const store = useTodoStore.getState();
              try {
                await markTodoAsDone({
                  location: todo.location,
                  original_content: todo.content,
                });
                store.loadData(); 
              } catch (error) {
                console.error("Failed to mark todo as done from table:", error);
              }
            },
          }}
        />
      ),
      size: 40,
    },
    {
      accessorKey: 'content',
      header: 'Content',
      size: 450, 
      cell: ({ row }) => (
        <div className="truncate" title={row.original.content}>
          {row.original.parsedContent.mainContent || row.original.content}
        </div>
      ),
    },
    {
      accessorKey: 'zone',
      header: 'Zone',
      size: 150, // Adjusted size slightly for icon
      cell: ({ row }) => {
        const categoryIcon = categories[row.original.categoryIndex]?.icon || ''; // Default icon
        return (
          <div className="flex items-center">
            <NerdFontIcon icon={categoryIcon} category={row.original.zone} className="mr-1.5 text-sm" />
            <span className="truncate" title={row.original.zone}>{row.original.zone}</span>
          </div>
        );
      }
    },
    {
      accessorKey: 'filePath',
      header: 'File',
      size: 180, // Adjusted size
      cell: ({ row }) => (
        <span title={row.original.originalTodo.location}>
          {row.original.filePath}{row.original.lineNumber ? `:${row.original.lineNumber}` : ''}
        </span>
      ),
    },
    {
      accessorKey: 'created',
      header: 'Created',
      size: 150, // Adjusted size
      cell: info => {
        const createdVal = info.getValue() as string | null;
        return createdVal ? new Date(createdVal).toLocaleDateString(undefined, { year: '2-digit', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'N/A';
      },
    },
    {
      accessorKey: 'finished',
      header: 'Finished',
      size: 150, // Adjusted size
      cell: info => {
        const finishedVal = info.getValue() as string | null;
        return finishedVal ? new Date(finishedVal).toLocaleDateString(undefined, { year: '2-digit', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'N/A';
      },
    },
    {
      accessorKey: 'estDuration',
      header: 'Est. Dur', // Shortened header
      size: 80, // Adjusted size
      cell: info => info.getValue() || 'N/A',
    },
  ], [categories]); // Added categories to dependency array

  const data = useMemo((): TodoTableRow[] => {
    const flatList: TodoTableRow[] = [];
    categories.forEach((category, catIndex) => {
      category.todos.forEach((todo, itemIndex) => {
        const parsed = parseTodoContent(todo.content);
        
        let fullPath = todo.location || '';
        let lineNumber = '';
        const lineMatch = todo.location?.match(/\:(\d+)$/);
        if (lineMatch) {
          lineNumber = lineMatch[1];
          fullPath = todo.location.replace(/\:\d+$/, '');
        }
        
        // Extract basename from the fullPath
        const basename = fullPath.split(/[/\\]/).pop() || fullPath || 'N/A';

        let createdTimestamp: string | null = null;
        if (parsed.idPart && parsed.idPart.startsWith('@')) {
          // Assuming decodeTimestampId exists and can convert this to a Date string or object
          // For now, let's store the raw part, conversion to Date can happen in cell render
          const dateObj = decodeTimestampId(parsed.idPart.substring(1));
          createdTimestamp = dateObj ? dateObj.toISOString() : null;
        }

        let completedTimestamp: string | null = null;
        if (parsed.donePart && parsed.donePart.startsWith('@@')) {
          const dateObj = decodeTimestampId(parsed.donePart.substring(2));
          completedTimestamp = dateObj ? dateObj.toISOString() : null;
        }

        flatList.push({
          id: (todo.location || 'loc') + (parsed.idPart || 'id') + catIndex + '-' + itemIndex, // More robust unique ID
          content: todo.content,
          parsedContent: parsed,
          zone: category.name,
          filePath: basename, // Use basename here
          lineNumber: lineNumber,
          created: createdTimestamp,
          finished: completedTimestamp,
          estDuration: null, // Placeholder
          originalTodo: todo,
          categoryIndex: catIndex,
          itemIndex: itemIndex,
        });
      });
    });
    return flatList;
  }, [categories]);

  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(
    columns.map(column => column.id || (column as any).accessorKey) // Use dynamic columns for initial order
  );

  const table = useReactTable({
    data,
    columns, // Use dynamic columns
    state: {
      columnOrder,
    },
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
  });

  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setColumnOrder(currentOrder => {
        const oldIndex = currentOrder.indexOf(active.id as string);
        const newIndex = currentOrder.indexOf(over.id as string);
        return arrayMove(currentOrder, oldIndex, newIndex);
      });
    }
  };
  
  // Helper to get column IDs for SortableContext
  const columnIds = useMemo(() => table.getFlatHeaders().map(header => header.id),[table.getFlatHeaders()])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToHorizontalAxis]}
    >
      <div className="h-full overflow-auto rounded-lg border dark:border-neutral-700"> {/* Added rounded-lg and border */}
        <table className="text-sm border-collapse dark:text-neutral-300 table-fixed w-full"> {/* Changed text-xs to text-sm */}
          <thead className="bg-neutral-50 dark:bg-neutral-800 sticky top-0 z-10">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
                  {headerGroup.headers.map(header => (
                     <DraggableHeader key={header.id} header={header}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </DraggableHeader>
                  ))}
                </SortableContext>
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr 
                key={row.id} 
                className={`hover:bg-neutral-100 dark:hover:bg-neutral-750 cursor-pointer ${
                  focusedItem.categoryIndex === row.original.categoryIndex && focusedItem.itemIndex === row.original.itemIndex ? 'bg-blue-100 dark:bg-blue-800/30' : ''
                }`}
                onClick={() => onRowClick(row.original.categoryIndex, row.original.itemIndex)}
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-2 py-0.5 border-b dark:border-neutral-700" style={{ width: cell.column.getSize() }}> {/* Changed py-1 to py-0.5 */}
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DndContext>
  );
} 