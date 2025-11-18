import { useEffect, useState, useRef, useCallback } from "react";
import { getPlatform } from "./utils/platform";

export const Editor = () => {
  const [fileName] = useState("test.txt");
  const [cursorPosition, setCursorPosition] = useState({ row: 1, column: 1 });
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = async (event: KeyboardEvent) => {
      const platform = await getPlatform();
      const isMac = platform.toLowerCase() === "mac";

      const isCmd = isMac ? event.metaKey : event.ctrlKey;

      if (isCmd) {
        event.preventDefault();

        if (event.key === "s") {
          console.log("save");
        }

        if (event.key === "o") {
          console.log("open");
        }
      }
    };

    window.addEventListener("keydown", handler);

    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, []);

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

  const handleInput = () => {
    updateCursorPosition();
  };

  const handleClick = () => {
    updateCursorPosition();
  };

  const handleKeyUp = () => {
    updateCursorPosition();
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900">
      {/* Top Bar */}
      <header className="bg-gray-800 text-white px-4 py-2 border-b border-gray-700 flex items-center">
        <h1 className="text-sm font-medium">{fileName}</h1>
      </header>

      {/* Editor Area */}
      <div
        ref={editorRef}
        contentEditable
        className="flex-1 text-white bg-gray-900 px-4 py-3 font-mono text-sm outline-none overflow-auto"
        onInput={handleInput}
        onClick={handleClick}
        onKeyUp={handleKeyUp}
        spellCheck={false}
      />

      {/* Bottom Status Bar */}
      <footer className="bg-gray-800 text-gray-400 px-4 py-1 border-t border-gray-700 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <span>Plain Text</span>
        </div>
        <div className="flex items-center gap-4">
          <span>
            Ln {cursorPosition.row}, Col {cursorPosition.column}
          </span>
        </div>
      </footer>
    </div>
  );
};
