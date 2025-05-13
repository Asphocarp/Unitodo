'use client';

import {
  $getRoot,
  $getSelection,
  EditorState,
  $createParagraphNode,
  $createTextNode,
  LexicalNode,
  ParagraphNode,
  TextNode,
  KEY_ENTER_COMMAND,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_HIGH,
  LexicalEditor,
  $isElementNode,
  $isTextNode,
  $isRangeSelection,
  BaseSelection
} from 'lexical';
import React, { useEffect, Component, ErrorInfo, ReactNode, ReactElement } from 'react';

import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { LexicalErrorBoundaryProps } from '@lexical/react/LexicalErrorBoundary';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

import {
  PriorityNode,
  $createPriorityNode,
  IdNode,
  $createIdNode,
  DoneNode,
  $createDoneNode,
} from './LexicalNodes';

import { parseTodoContent } from '../utils';

const theme = {
  paragraph: 'editor-paragraph',
  text: {
    bold: 'editor-text-bold',
    italic: 'editor-text-italic',
    underline: 'editor-text-underline',
    strikethrough: 'editor-text-strikethrough',
    code: 'editor-text-code',
  },
  priority: 'unitodo-priority-node dark:text-amber-400',
  id: 'unitodo-id-node dark:text-blue-300',
  done: 'unitodo-done-node dark:text-green-300',
};

function globalOnError(error: Error) {
  console.error("Global error handler:", error);
}

export interface LexicalTodoEditorProps {
  initialFullContent: string;
  isReadOnly: boolean;
  onChange?: (editorState: EditorState) => void;
  onSubmit?: () => void;
  displayMode?: 'table-view' | 'full-edit';
  initialFocus?: 'afterPriority' | 'end';
}

function InitialStatePlugin({ initialFullContent, displayMode }: { initialFullContent: string, displayMode?: 'table-view' | 'full-edit' }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editor.update(() => {
      const root = $getRoot();
      if (root.isEmpty() || root.getTextContent() !== initialFullContent) {
        root.clear();
        const parsed = parseTodoContent(initialFullContent);
        const paragraph = $createParagraphNode();

        if (!parsed.isValidTodoFormat) {
           paragraph.append($createTextNode(initialFullContent));
        } else {
          if (displayMode === 'table-view') {
            if (parsed.priority) {
              paragraph.append($createPriorityNode(parsed.priority));
            }

            if (parsed.mainContent) {
              if (parsed.priority && parsed.mainContent.length > 0) { // Add leading space only if priority chip exists and there's text after
                paragraph.append($createTextNode(' '));
                paragraph.append($createTextNode(parsed.mainContent));
              } else if (!parsed.priority) { // No priority chip, just append the text
                paragraph.append($createTextNode(parsed.mainContent));
              }
            }
            // If only priority chip and no other text, nothing more to add.
            // If no priority chip and no other text (empty valid line), paragraph remains empty.

          } else { // 'full-edit' or default mode
            let hasPreviousPart = false;
            if (parsed.priority) {
              paragraph.append($createPriorityNode(parsed.priority));
              hasPreviousPart = true;
            }
            if (parsed.idPart) {
              paragraph.append($createIdNode(parsed.idPart));
              hasPreviousPart = true;
            }
            if (parsed.donePart) {
              paragraph.append($createDoneNode(parsed.donePart));
              hasPreviousPart = true;
            }
            if (parsed.mainContent) {
              if (hasPreviousPart) paragraph.append($createTextNode(' '));
              paragraph.append($createTextNode(parsed.mainContent));
            } else if (parsed.isValidTodoFormat && !hasPreviousPart && initialFullContent.trim() === "") {
              // Handles empty valid line, paragraph will be empty.
            }
          }
        }
        root.append(paragraph);
      }
    });
  }, [editor, initialFullContent, displayMode]);
  return null;
}

function UpdateEditablePlugin({ isReadOnly, initialFocus }: { isReadOnly: boolean, initialFocus?: 'afterPriority' | 'end' }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const isNowEditable = !isReadOnly;
    editor.setEditable(isNowEditable);

    if (isNowEditable) {
       setTimeout(() => {
          editor.update(() => {
            const root = $getRoot();
            if (initialFocus === 'afterPriority') {
              let priorityNodeFoundAndFocused = false;
              if (root.getChildrenSize() > 0) {
                const firstChild = root.getFirstChild();
                if (firstChild && $isElementNode(firstChild)) {
                  const nodes = firstChild.getChildren();
                  const priorityNode = nodes.find(node => node instanceof PriorityNode || (typeof (node as any).getType === 'function' && (node as any).getType() === PriorityNode.getType()));

                  if (priorityNode) {
                    // priorityNode.selectEnd();
                    // priorityNodeFoundAndFocused = true;
                    const nextSibling = priorityNode.getNextSibling();
                    if (nextSibling && $isTextNode(nextSibling) && nextSibling.getTextContent().startsWith(' ')) {
                      nextSibling.select(0, 0);
                      priorityNodeFoundAndFocused = true;
                    } else if (nextSibling && ($isTextNode(nextSibling) || $isElementNode(nextSibling))) {
                      nextSibling.select(0, 0);
                      priorityNodeFoundAndFocused = true;
                    } else if (nextSibling) {
                      if ($isElementNode(firstChild)) firstChild.selectEnd();
                      priorityNodeFoundAndFocused = true;
                    } else {
                      if ($isElementNode(firstChild)) firstChild.selectEnd();
                      priorityNodeFoundAndFocused = true;
                    }
                  }
                }
              }
              if (priorityNodeFoundAndFocused) {
                return;
              }
            }

            if (root.getChildrenSize() > 0) {
                const lastNode = root.getLastDescendant();
                if (lastNode) {
                    const currentSelection = $getSelection();
                    const editorRootElement = editor.getRootElement();
                    const isActiveElement = editorRootElement && document.activeElement === editorRootElement;

                    if ($isRangeSelection(currentSelection)) {
                      if (currentSelection === null ||
                          !currentSelection.isCollapsed() ||
                          !isActiveElement ||
                          currentSelection.anchor.key !== lastNode.getKey() ||
                          currentSelection.anchor.offset !== lastNode.getTextContentSize()) {
                            lastNode.selectEnd();
                      }
                    } else if (currentSelection === null || !isActiveElement) {
                       lastNode.selectEnd();
                    }
                }
            }
          });
          editor.focus();
       }, 0);
    }
  }, [editor, isReadOnly, initialFocus]);

  return null;
}

function EnterSubmitPlugin({ onSubmit }: { onSubmit?: () => void }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.isEditable()) {
      return;
    }

    return editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event: KeyboardEvent | null) => {
        if (onSubmit && editor.isEditable()) {
          if (event !== null) {
            event.preventDefault();
            onSubmit();
            return true;
          }
        }
        return false;
      },
      COMMAND_PRIORITY_HIGH
    );
  }, [editor, onSubmit]);

  return null;
}

interface CustomErrorBoundaryProps {
  children: ReactElement;
  onError: (error: Error) => void;
}

interface CustomErrorBoundaryState {
  hasError: boolean;
}

class StandardErrorBoundary extends Component<LexicalErrorBoundaryProps, CustomErrorBoundaryState> {
  public state: CustomErrorBoundaryState = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): CustomErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.props.onError(error);
  }

  public render() {
    if (this.state.hasError) {
      return <div className="text-red-500 text-xs">Error loading content</div>;
    }
    return this.props.children;
  }
}

export default function LexicalTodoEditor({
  initialFullContent,
  isReadOnly,
  onChange,
  onSubmit,
  displayMode = 'full-edit',
  initialFocus,
}: LexicalTodoEditorProps) {
  const initialConfig = {
    namespace: 'UnitodoEditor',
    theme,
    onError: globalOnError,
    editable: !isReadOnly,
    nodes: [PriorityNode, IdNode, DoneNode, ParagraphNode, TextNode],
    editorState: (editor: LexicalEditor) => {
      editor.update(() => {
        const root = $getRoot();
        if (root.isEmpty()) {
          const paragraph = $createParagraphNode();
          root.append(paragraph);
        }
      });
    }
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="editor-container relative inline-block w-full max-w-full overflow-hidden items-center">
        <RichTextPlugin
          contentEditable={
            <div className="w-full h-5 min-h-[16px]">
              <ContentEditable className="outline-none focus:ring-0 focus:ring-offset-0 py-0 px-0 h-full w-full overflow-hidden text-ellipsis dark:text-neutral-200 leading-5 whitespace-pre-wrap" />
            </div>
          }
          placeholder={<div className="editor-placeholder absolute top-0 bottom-0 my-auto h-fit left-0 text-subtle-color dark:text-neutral-500 pointer-events-none p-0">Enter todo...</div>}
          ErrorBoundary={StandardErrorBoundary}
        />
        <OnChangePlugin onChange={onChange ? onChange : () => {}} />
        <HistoryPlugin />
        <InitialStatePlugin initialFullContent={initialFullContent} displayMode={displayMode} />
        <UpdateEditablePlugin isReadOnly={isReadOnly} initialFocus={initialFocus} />
        <EnterSubmitPlugin onSubmit={onSubmit} />
      </div>
    </LexicalComposer>
  );
} 