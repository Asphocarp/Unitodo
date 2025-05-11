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

interface LexicalTodoEditorProps {
  initialFullContent: string;
  isReadOnly: boolean;
  onChange?: (editorState: EditorState) => void;
  onSubmit?: () => void;
}

function InitialStatePlugin({ initialFullContent }: { initialFullContent: string }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editor.update(() => {
      const root = $getRoot();
      if (root.isEmpty() || root.getTextContent() !== initialFullContent) {
        root.clear();
        const parsed = parseTodoContent(initialFullContent);
        
        const nodesToAppend: LexicalNode[] = [];

        if (parsed.priority) {
          nodesToAppend.push($createPriorityNode(parsed.priority));
        }
        if (parsed.idPart) {
          nodesToAppend.push($createIdNode(parsed.idPart));
          if (parsed.mainContent || parsed.donePart) {
             nodesToAppend.push($createTextNode(' '));
          }
        }
        if (parsed.donePart) {
          nodesToAppend.push($createDoneNode(parsed.donePart));
          if (parsed.mainContent) {
             nodesToAppend.push($createTextNode(' '));
          }
        }
        if (parsed.mainContent) {
          nodesToAppend.push($createTextNode(parsed.mainContent));
        }

        if (!parsed.isValidTodoFormat) {
           root.clear();
           const paragraph = $createParagraphNode();
           paragraph.append($createTextNode(initialFullContent));
           root.append(paragraph);
        } else {
          const paragraph = $createParagraphNode();
          nodesToAppend.forEach(node => paragraph.append(node));
          root.append(paragraph);
        }

      }
    });
  }, [editor, initialFullContent]); 
  return null;
}

function UpdateEditablePlugin({ isReadOnly }: { isReadOnly: boolean }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    const isNowEditable = !isReadOnly;
    editor.setEditable(isNowEditable);

    if (isNowEditable) {
       setTimeout(() => {
          editor.focus();
          editor.update(() => {
            const root = $getRoot();
            if (root.getChildrenSize() > 0) {
                const lastNode = root.getLastDescendant();
                if (lastNode) {
                    const selection = $getSelection();
                    if (selection === null) {
                        lastNode.selectEnd();
                    }
                }
            }
          });
       }, 0); 
    }
  }, [editor, isReadOnly]);

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
      <div className="editor-container relative inline-block w-full max-w-full overflow-hidden flex items-center">
        <RichTextPlugin
          contentEditable={
            <div className="w-full h-5 min-h-[16px]">
              <ContentEditable className="outline-none focus:ring-0 focus:ring-offset-0 py-0 px-0 h-full w-full whitespace-nowrap overflow-hidden text-ellipsis dark:text-neutral-200 leading-5" />
            </div>
          }
          placeholder={<div className="editor-placeholder absolute top-0 bottom-0 my-auto h-fit left-0 text-subtle-color dark:text-neutral-500 pointer-events-none p-0">Enter todo...</div>}
          ErrorBoundary={StandardErrorBoundary}
        />
        <OnChangePlugin onChange={onChange ? onChange : () => {}} />
        <HistoryPlugin />
        <InitialStatePlugin initialFullContent={initialFullContent} />
        <UpdateEditablePlugin isReadOnly={isReadOnly} />
        <EnterSubmitPlugin onSubmit={onSubmit} />
      </div>
    </LexicalComposer>
  );
} 