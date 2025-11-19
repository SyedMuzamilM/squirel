import { useEffect, useState, useRef, useCallback } from "react";
import { getPlatform } from "./utils/platform";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

type Document = {
  lines: Array<string>;
  cursor: {
    row: number;
    col: number;
  };
  selection: {
    start: {
      row: number;
      col: number;
    };
    end: {
      row: number;
      col: number;
    };
  };
};

export const Editor = () => {
  const [fileName] = useState("test.txt");
  const [lines, setLines] = useState<Array<string>>([]);
  const [cursorPosition, setCursorPosition] = useState({ row: 1, col: 1 });
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let unsubscribe: UnlistenFn;

    (async () => {
      unsubscribe = await listen<Document>("document_updated", (event) => {
        const eventLines = event.payload.lines;
        const cursor = event.payload.cursor;
        console.log("Cursor:: ", cursor);
        setCursorPosition(cursor);
        setLines(eventLines);
      });
    })();

    return () => unsubscribe && unsubscribe();
  }, []);

  const handleSave = useCallback(() => {
    console.log("save");
  }, []);

  const handleOpen = useCallback(() => {
    console.log("open");
  }, []);

  useEffect(() => {
    const handler = async (event: KeyboardEvent) => {
      const platform = await getPlatform();
      const isMac = platform.toLowerCase() === "mac";

      const isCmd = isMac ? event.metaKey : event.ctrlKey;

      if (isCmd) {
        event.preventDefault();

        if (event.key === "s") {
          handleSave();
        }

        if (event.key === "o") {
          handleOpen();
        }
      }
    };

    window.addEventListener("keydown", handler);

    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, [handleOpen, handleSave]);

  const updateCursorPosition = useCallback(() => {
    const selection = window.getSelection();

    if (!selection || !editorRef.current) return;
    const textContent = editorRef.current.innerText;

    const range = selection.getRangeAt(0);
    const cursorOffset = range.startOffset;

    const preRange = document.createRange();
    preRange.selectNodeContents(editorRef.current);
    preRange.setEnd(range.startContainer, range.startOffset);

    const preRangeText = preRange.toString();
    const allLines = textContent.split("\n");
    let reconstructed = "";
    let preRangeIndex = 0;

    for (let i = 0; i < allLines.length; i++) {
      const line = allLines[i];

      if (preRangeIndex < preRangeText.length) {
        const remainingPreRange = preRangeText.substring(preRangeIndex);

        if (remainingPreRange.startsWith(line)) {
          reconstructed += line;
          preRangeIndex += line.length;

          if (preRangeIndex < preRangeText.length && i < allLines.length - 1) {
            reconstructed += "\n";
          }
        } else {
          const remainingText = remainingPreRange;
          reconstructed += remainingText;
          break;
        }
      }

      if (preRangeIndex >= preRangeText.length) return;
    }

    const lines = reconstructed.split("\n");

    setCursorPosition({
      row: lines.length,
      column: cursorOffset,
    });
  }, []);

  const handleKeyDown = async (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (
      event.key === "ArrowRight" ||
      event.key === "ArrowLeft" ||
      event.key === "ArrowUp" ||
      event.key === "ArrowDown"
    ) {
      await invoke("move_cursor", { movement: event.key });
    }

    if (event.key === "Enter") {
      event.preventDefault();
    } else if (event.key.length !== 1) {
      return;
    }

    const isEnter = event.key === "Enter";
    if (isEnter) {
      await invoke("insert_newline");
    } else {
      await invoke("insert_char", { ch: event.key });
    }
  };

  // const handleClick = () => {
  //   updateCursorPosition();
  // };

  // const handleKeyUp = () => {
  //   updateCursorPosition();
  // };

  const handleEditorClick = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900">
      {/* Top Bar */}
      <header className="bg-gray-800 text-white px-4 py-2 border-b border-gray-700 flex items-center justify-between">
        <h1 className="text-sm font-medium">{fileName}</h1>
        <div className="flex items-center gap-2 text-xs">
          <button
            className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 transition-colors"
            type="button"
            onClick={handleOpen}
          >
            Open
          </button>
          <button
            className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 transition-colors"
            type="button"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </header>

      {/* Editor Area */}
      <div
        ref={editorRef}
        contentEditable
        className="opacity-0 z-0"
        onKeyDown={handleKeyDown}
        // onClick={handleClick}
        // onKeyUp={handleKeyUp}
        spellCheck={false}
      />

      <div
        onClick={handleEditorClick}
        className="relative flex-1 z-2 text-white bg-gray-900 font-mono text-sm outline-none overflow-auto"
      >
        {lines.map((line, index) => (
          <div key={line} className="flex gap-2 h-6">
            <span className="bg-gray-700 px-2 w-10 h-6 text-righ">
              {index + 1}
            </span>
            <span className="flex-1">{line}</span>
          </div>
        ))}

        {/* Cursor For now */}
        <div
          className="absolute"
          style={{
            top: `${cursorPosition.row * 24}px`,
            left: `${48 + cursorPosition.col * 8}px`,
          }}
        >
          <span className="bg-blue-500 h-6 w-0.5 animate-plus block" />
        </div>
      </div>

      {/* Bottom Status Bar */}
      <footer className="bg-gray-800 text-gray-400 px-4 py-1 border-t border-gray-700 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <span>Plain Text</span>
        </div>
        <div className="flex items-center gap-4">
          <span>
            Ln {cursorPosition.row + 1}, Col {cursorPosition.col}
          </span>
        </div>
      </footer>
    </div>
  );
};
