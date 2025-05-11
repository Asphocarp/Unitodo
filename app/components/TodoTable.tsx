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
      className="p-2 border-b border-r dark:border-neutral-700"
    >
      <div className="flex items-center justify-between">
        {children}
        <button {...attributes} {...listeners} className="cursor-grab p-1">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
          </svg>
        </button>
      </div>
    </th>
  );
};


interface TodoTableProps {
  categories: TodoCategoryType[];
  // Add other necessary props like focus handlers, etc.
  onRowClick: (categoryIndex: number, itemIndex: number) => void;
  focusedItem: { categoryIndex: number; itemIndex: number; };
}

const defaultColumns: ColumnDef<TodoTableRow>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <input
        type="checkbox"
        className="hn-checkbox"
        {...{
          checked: table.getIsAllRowsSelected(),
          indeterminate: table.getIsSomeRowsSelected(),
          onChange: table.getToggleAllRowsSelectedHandler(),
        }}
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        className="hn-checkbox"
        {...{
          checked: row.original.originalTodo.completed, // Reflect actual completion
          disabled: !row.original.parsedContent.isUnique, // Or other conditions for read-only
          // onChange: row.getToggleSelectedHandler(), // This is for row selection, not completion
          onChange: async () => {
            const todo = row.original.originalTodo;
            const store = useTodoStore.getState();
            try {
              await markTodoAsDone({
                location: todo.location,
                original_content: todo.content,
              });
              // Optimistically update or simply reload data
              // store.updateTodo({ ...todo, completed: !todo.completed, content: newContentFromMark }); // if new content is returned
              store.loadData(); // Simplest way to reflect change
            } catch (error) {
              console.error("Failed to mark todo as done from table:", error);
              // Handle error display if needed
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
    size: 450, // Constrained size for content
    cell: ({ row }) => (
      // For now, just display raw content. Later, we can use a simplified TodoItem or Lexical display
      <div className="truncate" title={row.original.content}>
        {row.original.parsedContent.mainContent || row.original.content}
      </div>
    ),
  },
  {
    accessorKey: 'zone',
    header: 'Zone',
    size: 120,
  },
  {
    accessorKey: 'filePath',
    header: 'File',
    size: 200,
    cell: ({ row }) => (
      <span title={row.original.originalTodo.location}>
        {row.original.filePath}{row.original.lineNumber ? `:${row.original.lineNumber}` : ''}
      </span>
    ),
  },
  {
    accessorKey: 'created',
    header: 'Created',
    size: 170,
    cell: info => {
      const createdVal = info.getValue() as string | null;
      return createdVal ? new Date(createdVal).toLocaleString() : 'N/A';
    },
  },
  {
    accessorKey: 'finished',
    header: 'Finished',
    size: 170,
    cell: info => {
      const finishedVal = info.getValue() as string | null;
      return finishedVal ? new Date(finishedVal).toLocaleString() : 'N/A';
    },
  },
  {
    accessorKey: 'estDuration',
    header: 'Est. Duration',
    size: 100,
    cell: info => info.getValue() || 'N/A',
  },
];

export default function TodoTable({ categories, onRowClick, focusedItem }: TodoTableProps) {
  const data = useMemo((): TodoTableRow[] => {
    const flatList: TodoTableRow[] = [];
    categories.forEach((category, catIndex) => {
      category.todos.forEach((todo, itemIndex) => {
        const parsed = parseTodoContent(todo.content);
        let filePath = todo.location || '';
        let lineNumber = '';
        const lineMatch = todo.location?.match(/\:(\d+)$/); // Corrected regex for line number
        if (lineMatch) {
          lineNumber = lineMatch[1];
          filePath = todo.location.replace(/\:\d+$/, ''); // Corrected regex for file path
        } else {
          const fileMatch = todo.location?.match(/([^/\\]+)$/);
          filePath = fileMatch ? fileMatch[0] : todo.location || 'N/A';
        }

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
          filePath: filePath,
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
    defaultColumns.map(column => column.id || (column as any).accessorKey)
  );

  const table = useReactTable({
    data,
    columns: defaultColumns,
    state: {
      columnOrder,
    },
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    // enableColumnResizing: true, // We'll add resizing later if needed
    // columnResizeMode: 'onChange',
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
      <div className="h-full overflow-auto">
        <table className="text-xs border-collapse dark:text-neutral-300 table-fixed w-full">
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
                  <td key={cell.id} className="p-2 border-b dark:border-neutral-700" style={{ width: cell.column.getSize() }}>
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