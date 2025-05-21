'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  ColumnDef,
  flexRender,
  Row,
  ColumnOrderState,
  ColumnSizingState,
} from '@tanstack/react-table';
import { DndContext, closestCenter, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import { arrayMove, SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TodoItem as TodoItemType, TodoCategory as TodoCategoryType, TodoTableRow } from '../types';
import { parseTodoContent, decodeTimestampId, abbreviateTimeDistanceString } from '../utils';
import { formatDistanceStrict } from 'date-fns';
import { markTodoAsDone as apiMarkTodoAsDone, editTodoItem as apiEditTodoItem } from '../services/todoService';
import todoStore, { isStatusDoneLike } from '../store/todoStore';
import configStore from '../store/configStore';
import NerdFontIcon from './NerdFontIcon';
import { openUrl } from '@tauri-apps/plugin-opener';
import { observer } from 'mobx-react-lite';

// Import for virtualization
import { useVirtualizer } from '@tanstack/react-virtual';

// Import Lexical editor and related types
import LexicalTodoEditor from '../components/LexicalTodoEditor';
import { EditorState, $getRoot } from 'lexical';

interface DraggableHeaderProps {
  header: any; // Type for header is complex, using any for now
  children: React.ReactNode;
}

const DraggableHeader: React.FC<DraggableHeaderProps> = React.memo(({ header, children }) => {
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
});


interface TodoTableProps {
  tableRows: TodoTableRow[];
  onRowClick: (categoryIndex: number, itemIndex: number) => void;
  focusedItem: { categoryIndex: number; itemIndex: number; };
  height: number;
  width: number;
}

// Wrap TodoTable with observer to make it reactive to MobX store changes
const TodoTable: React.FC<TodoTableProps> = observer(({ tableRows, onRowClick, focusedItem, height, width }) => {
  const appConfig = configStore.config;
  
  // Access editing state and action from MobX todoStore
  const tableEditingCell = todoStore.tableEditingCell;
  const setTableEditingCell = todoStore.setTableEditingCell;
  const [editedContent, setEditedContent] = useState<string>('');

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});

  const focusRowElement = (catIdx: number, itmIdx: number) => {
    setTimeout(() => {
      const selector = `tr[data-category-index="${catIdx}"][data-item-index="${itmIdx}"]`;
      const rowEl = tableContainerRef.current?.querySelector(selector) as HTMLElement | null;
      rowEl?.focus();
    }, 0);
  };

  const columns = useMemo((): ColumnDef<TodoTableRow>[] => [
    {
      id: 'select',
      header: () => null,
      cell: ({ row }) => {
        if (row.original.isSectionHeader || !row.original.originalTodo) return null;
        return (
        <div className="flex items-center justify-center h-full">
          <input
            type="checkbox"
            className="hn-checkbox h-3.5 w-3.5"
            {...{
              checked: isStatusDoneLike(row.original.originalTodo.status, appConfig),
              disabled: false,
              onChange: async () => {
                const todo = row.original.originalTodo!;
                try {
                  await apiMarkTodoAsDone({
                    location: todo.location,
                    original_content: todo.content,
                  });
                  todoStore.loadData();
                } catch (error) {
                  console.error("Failed to mark todo as done from table:", error);
                }
              },
            }}
          />
        </div>
      )},
      size: 25,
    },
    {
      accessorKey: 'zone',
      header: 'Zone',
      size: 100,
      cell: ({ row }) => {
        if (row.original.isSectionHeader || !row.original.zone) return null;
        return (
          <div className="flex items-center truncate">
            <NerdFontIcon icon={row.original.zoneIcon!} category={row.original.zone} className="mr-0.5 text-sm" />
            <span className="truncate" title={row.original.zone}>{row.original.zone}</span>
          </div>
        );
      }
    },
    {
      accessorKey: 'content',
      header: 'Content',
      size: 1250, 
      cell: ({ row }) => {
        if (row.original.isSectionHeader || !row.original.originalTodo) return null;
        const isThisEditing = tableEditingCell?.categoryIndex === row.original.categoryIndex && tableEditingCell?.itemIndex === row.original.itemIndex;
        if (isThisEditing) {
          return (
            <div
              ref={editorWrapperRef}
              className="w-full h-full flex items-center"
              onKeyDown={async (e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  e.stopPropagation();
                  setTableEditingCell(null);
                  focusRowElement(row.original.categoryIndex!, row.original.itemIndex!);
                }
              }}
              onBlur={(e) => {
                if (editorWrapperRef.current && !editorWrapperRef.current.contains(e.relatedTarget as Node | null)) {
                  if (todoStore.tableEditingCell) {
                    setTableEditingCell(null);
                    focusRowElement(row.original.categoryIndex!, row.original.itemIndex!);
                  }
                }
              }}
            >
              <LexicalTodoEditor
                initialFullContent={editedContent}
                isReadOnly={false}
                onSubmit={async () => {
                  if (!todoStore.tableEditingCell || !row.original.originalTodo) return;
                  const root = $getRoot();
                  const text = root.getTextContent();
                  try {
                    await apiEditTodoItem({
                      location: row.original.originalTodo.location,
                      new_content: text,
                      original_content: row.original.originalTodo.content,
                    });
                    todoStore.updateTodo(
                      {
                        ...row.original.originalTodo,
                        content: text,
                      },
                      row.original.originalTodo.content
                    );
                    todoStore.loadData();
                  } catch (err) {
                    console.error('Failed to save todo in table:', err);
                  } finally {
                    if (todoStore.tableEditingCell) {
                        setTableEditingCell(null);
                        focusRowElement(row.original.categoryIndex!, row.original.itemIndex!);
                    }
                  }
                }}
                initialFocus={tableEditingCell?.initialFocus}
              />
            </div>
          );
        }
        return (
          <div 
            className="truncate text-sm h-full flex items-center"
            title={row.original.content}
          >
            <LexicalTodoEditor
                key={row.original.id + '-display'}
                initialFullContent={row.original.content!}
                isReadOnly={true}
                displayMode='table-view'
            />
          </div>
        );
      },
    },
    {
      accessorKey: 'filePath',
      header: 'File',
      size: 180,
      cell: ({ row }) => {
        if (row.original.isSectionHeader || !row.original.originalTodo) return null;
        return (
        <div className="truncate text-xs text-neutral-500">
          <a 
            href={getEditorUrl(row.original.originalTodo.location) || '#'} 
            className="hover:underline"
            title={row.original.originalTodo.location}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const url = getEditorUrl(row.original.originalTodo!.location);
              if (url && appConfig) {
                try {
                  openUrl(url).catch(error => {
                    console.error('[TodoTable] Error opening URL with Tauri:', error);
                    try {
                      window.open(url, '_blank');
                    } catch (secondError) {
                      console.error('[TodoTable] Fallback also failed:', secondError);
                    }
                  });
                } catch (error) {
                  console.error('[TodoTable] Error opening URL:', error);
                }
              }
            }}
          >
            {row.original.filePath}{row.original.lineNumber ? `:${row.original.lineNumber}` : ''}
          </a>
        </div>
      );},
    },
    {
      accessorKey: 'created',
      header: 'Created',
      size: 150,
      cell: info => {
        const row = info.row;
        if (row.original.isSectionHeader) return null;
        const createdVal = info.getValue() as string | null;
        if (!createdVal) return <div className="truncate" title="-"> - </div>;
        const decodedDate = new Date(createdVal);
        const strictDistance = formatDistanceStrict(decodedDate, new Date());
        const abbreviated = abbreviateTimeDistanceString(strictDistance);
        const displayDate = `[${abbreviated} ago]`;
        return <div className="truncate" title={decodedDate.toLocaleString()}>{displayDate}</div>;
      },
    },
    {
      accessorKey: 'finished',
      header: 'Finished',
      size: 150,
      cell: info => {
        const row = info.row;
        if (row.original.isSectionHeader) return null;
        const finishedVal = info.getValue() as string | null;
        if (!finishedVal) return <div className="truncate" title="-"> - </div>;
        const decodedDate = new Date(finishedVal);
        const strictDistance = formatDistanceStrict(decodedDate, new Date());
        const abbreviated = abbreviateTimeDistanceString(strictDistance);
        const displayDate = `[${abbreviated} ago]`;
        return <div className="truncate" title={decodedDate.toLocaleString()}>{displayDate}</div>;
      },
    },
    {
      accessorKey: 'estDuration',
      header: 'Est. Dur',
      size: 80,
      cell: info => {
        const row = info.row;
        if (row.original.isSectionHeader) return null;
        const estDurVal = info.getValue() as string | null || 'N/A';
        return <div className="truncate" title={estDurVal}>{estDurVal}</div>;
      }
    },
  ], [appConfig, tableEditingCell, setTableEditingCell]);

  const data = tableRows;

  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(
    columns.map(column => column.id || (column as any).accessorKey)
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      columnOrder,
      columnSizing,
    },
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: setColumnSizing,
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
  
  const columnIds = useMemo(() => table.getFlatHeaders().map(header => header.id),[table.getFlatHeaders()])

  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 24,
    overscan: 10,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  useEffect(() => {
    if (focusedItem && table.getRowModel().rows.length > 0) {
      const targetRowIndex = table.getRowModel().rows.findIndex(
        row => row.original.categoryIndex === focusedItem.categoryIndex && 
               row.original.itemIndex === focusedItem.itemIndex
      );
      if (targetRowIndex !== -1) {
        rowVirtualizer.scrollToIndex(targetRowIndex, { align: 'auto' });
        const rowElement = tableContainerRef.current?.querySelector(`tr[data-index="${targetRowIndex}"]`) as HTMLElement | null;
        rowElement?.focus({ preventScroll: true }); 
      }
    }
  }, [focusedItem, rowVirtualizer, table.getRowModel().rows]);

  const getEditorUrl = (location: string) => {
    if (!location || !appConfig) return null;
    let fullPath = location;
    let lineNumber = '';
    const lineMatch = location.match(/\:(\d+)$/);
    if (lineMatch) {
      lineNumber = lineMatch[1];
      fullPath = location.replace(/\:\d+$/, '');
    }
    const editorScheme = appConfig.editor_uri_scheme || 'vscode://file/';
    let url = `${editorScheme}${fullPath}`;
    if (lineNumber) {
      url += `:${lineNumber}`;
    }
    return url;
  };
  
  const handleRowKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>, row: Row<TodoTableRow>) => {
    if (tableEditingCell || row.original.isSectionHeader || !row.original.originalTodo) {
      return;
    }
    const { originalTodo, categoryIndex, itemIndex } = row.original;
    switch (e.key) {
      case 'a':
      case 'i':
        e.preventDefault();
        e.stopPropagation();
        setEditedContent(originalTodo.content!);
        setTableEditingCell({ categoryIndex: categoryIndex!, itemIndex: itemIndex!, initialFocus: 'end' });
        return;
      case 'I':
        if (e.shiftKey) {
          e.preventDefault();
          e.stopPropagation();
          setEditedContent(originalTodo.content!);
          setTableEditingCell({ categoryIndex: categoryIndex!, itemIndex: itemIndex!, initialFocus: 'afterPriority' });
        }
        return;
      case 'x':
        e.preventDefault();
        ;(async () => {
          const todo = originalTodo;
          const newContent = `${todo.content} // UNITODO_IGNORE_LINE`;
          try {
            await apiEditTodoItem({
              location: todo.location,
              new_content: newContent,
              original_content: todo.content,
            });
            todoStore.updateTodo(
              {
                ...todo,
                content: newContent,
              },
              todo.content
            );
          } catch (err) {
            console.error('[TodoTable] Failed to add ignore comment:', err);
          } finally {
            focusRowElement(categoryIndex!, itemIndex!);
          }
        })();
        return;
      case 'Enter':
        e.preventDefault();
        if (originalTodo.location && appConfig) {
          const url = getEditorUrl(originalTodo.location);
          if (url) {
            try {
              openUrl(url).catch(error => {
                console.error('[TodoTable] Error opening URL with Tauri:', error);
                try {
                  window.open(url, '_blank');
                } catch (secondError) {
                  console.error('[TodoTable] Fallback also failed:', secondError);
                }
              });
            } catch (error) {
              console.error('[TodoTable] Error opening URL:', error);
            }
          }
        }
        break;
      case ' ':
      case 'Spacebar':
        e.preventDefault();
        const todoForDone = row.original.originalTodo!;
        apiMarkTodoAsDone({
          location: todoForDone.location,
          original_content: todoForDone.content,
        }).then(() => {
          todoStore.loadData();
        }).catch(error => {
          console.error("Failed to mark todo as done from table:", error);
        });
        break;
      case 'ArrowUp':
      case 'k':
        e.preventDefault();
        todoStore.navigateTodos('up', e.shiftKey ? 5 : 1);
        break;
      case 'ArrowDown':
      case 'j':
        e.preventDefault();
        todoStore.navigateTodos('down', e.shiftKey ? 5 : 1);
        break;
      case 'K':
        e.preventDefault();
        todoStore.navigateTodos('up', 5);
        break;
      case 'J':
        e.preventDefault();
        todoStore.navigateTodos('down', 5);
        break;
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToHorizontalAxis]}
    >
      <div 
        style={{ height: `${height}px`, width: `${width}px` }}
        className="flex flex-col overflow-hidden rounded-lg border dark:border-neutral-700"
      >
        <div ref={tableContainerRef} className="flex-grow overflow-auto" style={{ position: 'relative' }}>
          <table className="text-sm border-collapse dark:text-neutral-300 table-fixed w-full">
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
            <tbody style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
              {virtualRows.map(virtualRow => {
                const row = table.getRowModel().rows[virtualRow.index];
                const isDoneLike = appConfig && row.original.originalTodo ? isStatusDoneLike(row.original.originalTodo.status, appConfig) : false;

                if (row.original.isSectionHeader) {
                  return (
                    <tr
                      key={row.id}
                      ref={node => rowVirtualizer.measureElement(node)}
                      data-index={virtualRow.index}
                      style={{
                        position: 'absolute',
                        transform: `translateY(${virtualRow.start}px)`,
                        width: '100%',
                      }}
                      className="h-7 bg-neutral-100 dark:bg-neutral-800 sticky top-[29px] z-[2]"
                      // Header height + sticky top offset by thead height
                      role="rowheader"
                    >
                      <td 
                        colSpan={table.getAllColumns().length} 
                        className="px-3 py-1 text-xs font-semibold text-neutral-700 dark:text-neutral-300 border-b dark:border-neutral-700 tracking-wider uppercase"
                      >
                        {row.original.sectionHeaderText}
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr 
                    key={row.id} 
                    ref={node => rowVirtualizer.measureElement(node)}
                    data-index={virtualRow.index}
                    style={{
                      position: 'absolute',
                      transform: `translateY(${virtualRow.start}px)`,
                      width: '100%',
                    }}
                    className={`h-6 cursor-pointer transition-colors
                      ${isDoneLike ? 'opacity-70' : ''}
                      ${focusedItem.categoryIndex === row.original.categoryIndex && focusedItem.itemIndex === row.original.itemIndex 
                        ? 'bg-neutral-50 dark:bg-neutral-800 focused' 
                        : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'
                      }`}
                    onClick={() => {
                        if (!row.original.isSectionHeader && typeof row.original.categoryIndex === 'number' && typeof row.original.itemIndex === 'number') {
                            onRowClick(row.original.categoryIndex, row.original.itemIndex);
                            todoStore.setFocusedItem({ categoryIndex: row.original.categoryIndex, itemIndex: row.original.itemIndex });
                        }
                    }}
                    onKeyDown={(e) => handleRowKeyDown(e, row)}
                    tabIndex={!row.original.isSectionHeader && focusedItem.categoryIndex === row.original.categoryIndex && focusedItem.itemIndex === row.original.itemIndex ? 0 : -1}
                    data-location={row.original.originalTodo?.location}
                    data-category-index={row.original.categoryIndex}
                    data-item-index={row.original.itemIndex}
                    role="row"
                    aria-current={!row.original.isSectionHeader && focusedItem.categoryIndex === row.original.categoryIndex && focusedItem.itemIndex === row.original.itemIndex ? 'true' : undefined}
                  >
                    {row.getVisibleCells().map(cell => {
                      const width = cell.column.getSize();
                      return (
                        <td 
                          key={cell.id} 
                          className={`px-2 py-0.5 border-b dark:border-neutral-700 ${cell.column.id === 'select' ? 'w-10' : ''
                            }`}
                          style={{ 
                            width: `${width}px`,
                            minWidth: `${width}px`,
                            maxWidth: `${width}px`
                          }}
                          onDoubleClick={() => {
                            if (cell.column.id === 'content' && !tableEditingCell && row.original.originalTodo) {
                                setEditedContent(row.original.content!);
                                setTableEditingCell({ categoryIndex: row.original.categoryIndex!, itemIndex: row.original.itemIndex!, initialFocus: 'end' });
                            }
                          }}
                        >
                          <div className={`h-full flex items-center ${isDoneLike && cell.column.id !== 'select' && cell.column.id !== 'filePath' ? 
                            'line-through text-neutral-500 dark:text-neutral-400' : ''
                            }`}>
                            {row.original.isSectionHeader ? (cell.column.id === 'select' ? '' : null ) : flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </DndContext>
  );
});

export default TodoTable; 