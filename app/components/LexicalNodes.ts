import {
  TextNode,
  LexicalNode,
  NodeKey,
  EditorConfig,
  SerializedTextNode,
  Spread,
} from 'lexical';
import { decodeTimestampId, abbreviateTimeDistanceString } from '../utils';
import { formatDistanceStrict } from 'date-fns';

// --- PriorityNode ---

export type SerializedPriorityNode = Spread<
  {
    type: 'priority';
    version: 1;
  },
  SerializedTextNode
>;

export class PriorityNode extends TextNode {
  static getType(): string {
    return 'priority';
  }

  static clone(node: PriorityNode): PriorityNode {
    return new PriorityNode(node.__text, node.__key);
  }

  constructor(text: string, key?: NodeKey) {
    super(text, key);
    this.__mode = 2; 
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    // Add specific classes for styling
    dom.className = 'unitodo-priority-node';
    return dom;
  }

  static importJSON(serializedNode: SerializedPriorityNode): PriorityNode {
    const node = $createPriorityNode(serializedNode.text);
    node.setFormat(serializedNode.format);
    node.setDetail(serializedNode.detail);
    node.setMode(serializedNode.mode);
    node.setStyle(serializedNode.style);
    return node;
  }

  exportJSON(): SerializedPriorityNode {
    return {
      ...super.exportJSON(),
      type: 'priority',
      version: 1,
    };
  }
}

export function $createPriorityNode(text: string): PriorityNode {
  // Ensure node is not empty
  return new PriorityNode(text || '?');
}

export function $isPriorityNode(node: LexicalNode | null | undefined): node is PriorityNode {
  return node instanceof PriorityNode;
}

// --- IdNode ---

export type SerializedIdNode = Spread<
  {
    type: 'id';
    version: 1;
  },
  SerializedTextNode
>;

export class IdNode extends TextNode {
  static getType(): string {
    return 'id';
  }

  static clone(node: IdNode): IdNode {
    return new IdNode(node.__text, node.__key);
  }

  constructor(text: string, key?: NodeKey) {
    super(text, key);
    this.__mode = 2; // Make it immutable
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    dom.className = 'unitodo-id-node';

    let displayText = this.__text; // Default to original text

    if (this.__text.startsWith('@') && this.__text.length === 6) {
      const encodedPart = this.__text.substring(1);
      const decodedDate = decodeTimestampId(encodedPart);
      if (decodedDate) {
        // Get strict distance, e.g., "5 minutes"
        const strictDistance = formatDistanceStrict(decodedDate, new Date());
        // Abbreviate to "5m"
        const abbreviated = abbreviateTimeDistanceString(strictDistance);
        // Add "ago" and brackets
        displayText = `[${abbreviated} ago]`;
      } else {
        // If decoding fails but it looks like a timestamp ID, show with prefix
        displayText = `ID: ${encodedPart}`;
      }
    } else if (this.__text.startsWith('#') || this.__text.startsWith('##')) {
      // For NanoID or incremented IDs, show with prefix
      displayText = `ID: ${this.__text.substring(this.__text.startsWith('##') ? 2 : 1)}`;
    } 
    // else: for any other IdNode content, it will display as is (original displayText)

    dom.innerText = displayText;
    return dom;
  }

  static importJSON(serializedNode: SerializedIdNode): IdNode {
    const node = $createIdNode(serializedNode.text);
    node.setFormat(serializedNode.format);
    node.setDetail(serializedNode.detail);
    node.setMode(serializedNode.mode);
    node.setStyle(serializedNode.style);
    return node;
  }

  exportJSON(): SerializedIdNode {
    return {
      ...super.exportJSON(),
      type: 'id',
      version: 1,
    };
  }
}

export function $createIdNode(text: string): IdNode {
  return new IdNode(text || '?id?');
}

export function $isIdNode(node: LexicalNode | null | undefined): node is IdNode {
  return node instanceof IdNode;
}

// --- DoneNode ---

export type SerializedDoneNode = Spread<
  {
    type: 'done';
    version: 1;
  },
  SerializedTextNode
>;

export class DoneNode extends TextNode {
  static getType(): string {
    return 'done';
  }

  static clone(node: DoneNode): DoneNode {
    return new DoneNode(node.__text, node.__key);
  }

  constructor(text: string, key?: NodeKey) {
    super(text, key);
    this.__mode = 2; // Make it immutable
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    dom.className = 'unitodo-done-node';
    return dom;
  }

  static importJSON(serializedNode: SerializedDoneNode): DoneNode {
    const node = $createDoneNode(serializedNode.text);
    node.setFormat(serializedNode.format);
    node.setDetail(serializedNode.detail);
    node.setMode(serializedNode.mode);
    node.setStyle(serializedNode.style);
    return node;
  }

  exportJSON(): SerializedDoneNode {
    return {
      ...super.exportJSON(),
      type: 'done',
      version: 1,
    };
  }
}

export function $createDoneNode(text: string): DoneNode {
  return new DoneNode(text || '?done?');
}

export function $isDoneNode(node: LexicalNode | null | undefined): node is DoneNode {
  return node instanceof DoneNode;
} 