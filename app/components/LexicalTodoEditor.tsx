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
} from 'lexical';
import React, { useEffect, Component, ErrorInfo, ReactNode, ReactElement } from 'react';

import { LexicalComposer } from '@lexical/react/LexicalComposer';
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
  priority: 'unitodo-priority-node',
  id: 'unitodo-id-node',
  done: 'unitodo-done-node',
};

function onError(error: Error) {
  console.error(error);
}

interface LexicalTodoEditorProps {
  initialFullContent: string;
  isReadOnly: boolean;
  onChange?: (editorState: EditorState) => void;
}

function InitialStatePlugin({ initialFullContent }: { initialFullContent: string }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editor.update(() => {
      const root = $getRoot();
      if (root.getChildrenSize() === 0 || root.getTextContent() !== initialFullContent) {
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

interface Props {
  children: ReactElement;
  onError: (error: Error) => void;
}

interface State {
  hasError: boolean;
}

class StandardErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo); // Log the full error info
    // Call the onError prop passed down
    this.props.onError(error);
    // The existing global onError can still be used if needed, but prop is more direct
    // onError(error); 
  }

  public render() {
    if (this.state.hasError) {
      return <div className="text-red-500 text-xs">Error in editor</div>;
    }
    return this.props.children;
  }
}

export default function LexicalTodoEditor({
  initialFullContent,
  isReadOnly,
  onChange,
}: LexicalTodoEditorProps) {
  const initialConfig = {
    namespace: 'UnitodoEditor',
    theme,
    onError,
    editable: !isReadOnly,
    nodes: [PriorityNode, IdNode, DoneNode, ParagraphNode, TextNode],
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="editor-container relative">
        <RichTextPlugin
          contentEditable={<ContentEditable className="outline-none focus:ring-1 focus:ring-blue-300 p-1 -m-1 rounded min-h-[20px]" />}
          placeholder={<div className="editor-placeholder absolute top-0 left-0 text-gray-400 pointer-events-none p-1">Enter todo...</div>}
          ErrorBoundary={StandardErrorBoundary}
        />
        <OnChangePlugin onChange={onChange ? onChange : () => {}} />
        <HistoryPlugin />
        <InitialStatePlugin initialFullContent={initialFullContent} />
      </div>
    </LexicalComposer>
  );
} 