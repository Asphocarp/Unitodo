'use client';

import { $getRoot, $getSelection, EditorState, $createParagraphNode, $createTextNode } from 'lexical';
import React, { useEffect, Component, ErrorInfo, ReactNode, ReactElement } from 'react';

import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

const theme = {
  // Placeholder styling if needed
  placeholder: 'editor-placeholder',
  paragraph: 'editor-paragraph',
};

// Lexical React plugins are React components, so they emit errors if they are
// thrown during execution. LexicalErrorBoundary converts errors into useful error
// messages.
function onError(error: Error) {
  console.error(error);
}

interface LexicalTodoEditorProps {
  initialContent: string;
  isReadOnly: boolean;
  onChange?: (editorState: EditorState) => void;
}

// Plugin to set initial editor state from props
function PrepopulatedTextPlugin({ initialContent }: { initialContent: string }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editor.update(() => {
      const root = $getRoot();
      if (root.getChildrenSize() === 0 || root.getTextContent() !== initialContent) {
        root.clear();
        const paragraphNode = $createParagraphNode();
        paragraphNode.append($createTextNode(initialContent));
        root.append(paragraphNode);
      }
    });
  }, [editor, initialContent]); 
  return null;
}

// Standard React Error Boundary Class Component
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
  initialContent,
  isReadOnly,
  onChange,
}: LexicalTodoEditorProps) {
  const initialConfig = {
    namespace: 'UnitodoEditor',
    theme,
    onError, // This onError will be passed via context, not directly to StandardErrorBoundary here
    editable: !isReadOnly,
    editorState: null, // Start with empty and populate via plugin
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="editor-container relative">
        <PlainTextPlugin
          contentEditable={<ContentEditable className="outline-none focus:ring-1 focus:ring-blue-300 p-1 -m-1 rounded min-h-[20px]" />}
          placeholder={<div className="editor-placeholder absolute top-0 left-0 text-gray-400 pointer-events-none p-1">Enter todo...</div>}
          ErrorBoundary={StandardErrorBoundary} // Should now match the expected type
        />
        <OnChangePlugin onChange={onChange ? onChange : () => {}} />
        <HistoryPlugin />
        <PrepopulatedTextPlugin initialContent={initialContent} />
      </div>
    </LexicalComposer>
  );
} 