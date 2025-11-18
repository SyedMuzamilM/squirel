import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

type EditorSnapshot = {
  text: string;
  cursor: number;
  selection: [number, number] | null;
};

// Selection API helpers
function getSelectionRange(root: HTMLElement | null): { start: number; end: number } {
  if (!root) return { start: 0, end: 0 };

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return { start: 0, end: 0 };
  const range = selection.getRangeAt(0);

  // Range from start of root to start of selection
  const preRange = range.cloneRange();
  preRange.selectNodeContents(root);
  preRange.setEnd(range.startContainer, range.startOffset);
  const start = preRange.toString().length;

  const preRangeEnd = range.cloneRange();
  preRangeEnd.selectNodeContents(root);
  preRangeEnd.setEnd(range.endContainer, range.endOffset);
  const end = preRangeEnd.toString().length;

  return { start, end };
}

function setCaret(root: HTMLElement | null, pos: number) {
  if (!root) return;
  const text = root.textContent ?? "";
  const clamped = Math.max(0, Math.min(pos, text.length));

  const range = document.createRange();
  const sel = window.getSelection();
  if (!sel) return;

  // Walk down to the text node where this offset lives
  let remaining = clamped;
  let node: Node | null = root;
  let textNode: Text | null = null;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while ((node = walker.nextNode())) {
    const t = node as Text;
    if (t.length >= remaining) {
      textNode = t;
      break;
    } else {
      remaining -= t.length;
    }
  }

  if (!textNode) {
    // No text nodes found, create one
    textNode = root.appendChild(document.createTextNode(""));
    remaining = 0;
  }

  range.setStart(textNode, remaining);
  range.collapse(true);

  sel.removeAllRanges();
  sel.addRange(range);
}

function setSelection(root: HTMLElement | null, start: number, end: number) {
  if (!root) return;
  const text = root.textContent ?? "";
  const clampedStart = Math.max(0, Math.min(start, text.length));
  const clampedEnd = Math.max(0, Math.min(end, text.length));

  const range = document.createRange();
  const sel = window.getSelection();
  if (!sel) return;

  // Helper to find text node and offset
  const findNodeAndOffset = (targetOffset: number): [Text, number] => {
    let remaining = targetOffset;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node: Node | null;

    while ((node = walker.nextNode())) {
      const t = node as Text;
      if (t.length >= remaining) {
        return [t, remaining];
      } else {
        remaining -= t.length;
      }
    }

    // If no text node found, create one
    const newNode = root.appendChild(document.createTextNode(""));
    return [newNode, 0];
  };

  const [startNode, startOffset] = findNodeAndOffset(clampedStart);
  const [endNode, endOffset] = findNodeAndOffset(clampedEnd);

  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);

  sel.removeAllRanges();
  sel.addRange(range);
}

export function Editor() {
  const divRef = useRef<HTMLDivElement>(null);
  const [snapshot, setSnapshot] = useState<EditorSnapshot | null>(null);
  const isUpdatingRef = useRef(false);

  // Initial load from Rust
  useEffect(() => {
    invoke<EditorSnapshot>("get_editor_state").then((snap) => {
      setSnapshot(snap);
      if (divRef.current) {
        divRef.current.textContent = snap.text;
        setCaret(divRef.current, snap.cursor);
      }
    });
  }, []);

  // Apply snapshot from Rust to DOM
  const applySnapshot = (snap: EditorSnapshot) => {
    isUpdatingRef.current = true;
    setSnapshot(snap);

    if (divRef.current) {
      divRef.current.textContent = snap.text;

      if (snap.selection && snap.selection[0] !== snap.selection[1]) {
        setSelection(divRef.current, snap.selection[0], snap.selection[1]);
      } else {
        setCaret(divRef.current, snap.cursor);
      }
    }

    // Allow DOM events to fire again after a short delay
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 0);
  };

  // Mode A: Intercept keyboard events and send to Rust
  const handleKeyDown = async (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isUpdatingRef.current) return;

    // Handle printable characters
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const snap = await invoke<EditorSnapshot>("insert_at_cursor", { text: e.key });
      applySnapshot(snap);
    }
    // Handle Enter
    else if (e.key === "Enter") {
      e.preventDefault();
      const snap = await invoke<EditorSnapshot>("insert_at_cursor", { text: "\n" });
      applySnapshot(snap);
    }
    // Handle Backspace
    else if (e.key === "Backspace") {
      e.preventDefault();
      const snap = await invoke<EditorSnapshot>("delete_at_cursor");
      applySnapshot(snap);
    }
    // Handle Tab
    else if (e.key === "Tab") {
      e.preventDefault();
      const snap = await invoke<EditorSnapshot>("insert_at_cursor", { text: "  " });
      applySnapshot(snap);
    }
    // Arrow keys, Home, End - update cursor position
    else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) {
      // Let browser handle the movement first, then sync to Rust
      setTimeout(async () => {
        if (isUpdatingRef.current) return;
        const { start, end } = getSelectionRange(divRef.current);

        if (start === end) {
          const snap = await invoke<EditorSnapshot>("set_cursor", { pos: start });
          setSnapshot(snap);
        } else {
          const snap = await invoke<EditorSnapshot>("update_selection", { start, end });
          setSnapshot(snap);
        }
      }, 0);
    }
  };

  // Track selection changes from mouse or keyboard (Shift+Arrow)
  const handleSelectionChange = async () => {
    if (isUpdatingRef.current) return;

    const { start, end } = getSelectionRange(divRef.current);

    if (start === end) {
      const snap = await invoke<EditorSnapshot>("set_cursor", { pos: start });
      setSnapshot(snap);
    } else {
      const snap = await invoke<EditorSnapshot>("update_selection", { start, end });
      setSnapshot(snap);
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "monospace" }}>
      <h2>Rust-Driven Text Editor</h2>
      <div
        ref={divRef}
        contentEditable
        suppressContentEditableWarning
        onKeyDown={handleKeyDown}
        onMouseUp={handleSelectionChange}
        spellCheck={false}
        style={{
          minHeight: "400px",
          border: "1px solid #ccc",
          padding: "10px",
          outline: "none",
          whiteSpace: "pre-wrap",
          fontFamily: "monospace",
          fontSize: "14px",
          lineHeight: "1.5",
          backgroundColor: "#f9f9f9",
        }}
      />
      <div style={{ marginTop: "10px", fontSize: "12px", color: "#666" }}>
        Cursor: {snapshot?.cursor} | Selection: {snapshot?.selection ? `${snapshot.selection[0]}-${snapshot.selection[1]}` : "none"}
      </div>
    </div>
  );
}
