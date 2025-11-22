# Desktop Code/Text Editor TODO

**High-level target:**
Desktop code/text editor where:
* UI: React (inside Tauri)
* Core: Rust manages buffer, cursor, selection, file I/O, commands  
* Communication: Tauri commands + events, no heavy logic in JS

---

## 0. Groundwork
- [x] Set up base stack
  - [x] Install Rust toolchain (stable), Node, pnpm/yarn
  - [x] Create Tauri + React template (`tauri create` or equivalent)
  - [x] Verify React hot reload works
  - [x] Verify a Rust command is callable from React
- [ ] Define initial scope
  - [ ] Single file editor
  - [ ] Basic operations: insert, delete, move cursor, select, load/save file
  - [ ] No plugins, no LSP in v1

## 1. Basic Tauri–React wiring
- [ ] Define IPC style
  - [x] Use `tauri::command` for request/response calls
  - [ ] Use Tauri events (`app_handle.emit_all`) for push updates from Rust to UI
- [x] Implement trivial example
  - [x] `get_platform` command
  - [x] Call it from React and show result
  - [x] Implement one event (e.g., `ping`) emitted by Rust, listened in React

## 2. Minimal editor UI (React only, string buffer)
- [x] Editor UI skeleton
  - [x] Main layout: sidebar (optional), top bar, editor area
  - [x] Use a `<div contentEditable>` or `<textarea>` for initial text display
  - [x] Use React state with a single `text: string`
- [x] Keyboard handling
  - [x] Let browser handle text editing for now
  - [x] Attach keydown handlers to capture arrow keys
  - [x] Handle Enter, Backspace/Del
  - [x] Handle Ctrl/Cmd + S
- [x] File open/save (UI stub)
  - [x] Add "Open", "Save" buttons or menu items
  - [x] Wire these to stub functions in React (no Rust yet)

## 3. Move buffer & cursor logic into Rust
- [x] Define core Rust data structures
  - [x] `Cursor` struct with line, column
  - [x] `Selection` struct with start, end cursors
  - [x] `Document` struct with lines: Vec<String>, cursor, selection, dirty flag, file_path
- [ ] Document state management  
  - [x] Use `tauri::State` or `Arc<Mutex<EditorState>>`
  - [x] Implement `insert_char(ch)` method
  - [x] Implement `insert_string(s)` method
  - [ ] Implement `delete_backward()` method
  - [ ] Implement `delete_forward()` method
  - [x] Implement `move_cursor_left/right/up/down()` methods
  - [ ] Implement `set_selection(start, end)` method
- [ ] Commands for React
  - [ ] `load_document(path: String) -> SerializedDocument`
  - [ ] `save_document() -> Result<(), String>`
  - [ ] `get_document_snapshot() -> SerializedDocument`
  - [ ] `apply_edit(edit: EditCommand) -> SerializedDocumentDelta`
  - [ ] Define `EditCommand` enum (InsertString, DeleteBackward, etc.)
- [ ] React side updates
  - [ ] React no longer updates text itself
  - [ ] Convert key events into `EditCommand`
  - [ ] Send to Tauri via command
  - [ ] Receive updated snapshot or delta
  - [ ] Render `document.lines` in React

## 4. Rendering & performance v1  
- [ ] React rendering strategy
  - [ ] Use a virtualized list for lines (Tanstack Virtual or custom)
  - [ ] Each line: `<div className="line"><span className="line-number">…</span><span className="code">…</span></div>`
  - [ ] Compute visible line range based on scroll position and line height
  - [ ] Render a small overscan buffer (lines above/below viewport) for smooth scrolling
  - [ ] Manually test with 50k–100k line synthetic files for performance
- [ ] Cursor rendering
  - [ ] Have Rust send `cursor` position
  - [ ] Render custom cursor: absolutely-positioned div based on line index and character width
  - [ ] Use monospaced font and fixed line height
  - [ ] Support mouse click-to-move: map `(clientX, clientY)` to `(line, col)` using font metrics
  - [ ] Add `set_cursor(line, col)` command in Rust and wire it from React
- [ ] Selection rendering
  - [ ] Rust sends `selection`
  - [ ] For each line, compute which columns are selected
  - [ ] Split line into spans or draw semi-transparent overlay
- [ ] Optimize snapshots
  - [ ] Accept that each edit returns full `SerializedDocument` for v1
  - [ ] Define `DocumentChange` enum in Rust (Insert, DeleteRange, UpdateCursor, UpdateSelection, etc.)
  - [ ] Emit `DocumentChange` events instead of full document when possible
  - [ ] Maintain a mirrored document in React and apply incoming `DocumentChange` deltas
  - [ ] Add tests to ensure applying a sequence of deltas matches a fresh snapshot

## 5. File system integration
- [ ] Open file
  - [ ] Use Tauri dialog APIs to choose a file path
  - [ ] Rust: Read file as text, split by `\n` into `Vec<String>`, initialize `Document`
  - [ ] React: Trigger open dialog, call `load_document`, replace current view
- [ ] Save file  
  - [ ] On Ctrl/Cmd + S: call `save_document` in Rust
  - [ ] If `file_path` is `None`: use "Save As" dialog to get path
  - [ ] Save and update `file_path`
- [ ] Dirty flag
  - [ ] Set `document.dirty = true` on any editing command
  - [ ] Clear on successful save
  - [ ] Reflect dirty state in UI (e.g., `*` in tab title)

## 6. Editing model v2: better buffer & undo/redo
- [ ] Explore buffer strategies
  - [ ] Keep current `Vec<String>` implementation as baseline behind a `TextBuffer`-style trait
  - [ ] Implement a simple gap buffer as a learning exercise (optimized for edits near cursor)
  - [ ] Prototype using `ropey` (rope-based text buffer) and compare complexity/performance
  - [ ] Decide which buffer type (gap buffer, piece table, rope) is the default for v2
- [ ] Replace naive `Vec<String>` with piece table
  - [ ] Two buffers: original file, add buffer  
  - [ ] Document as list of pieces (buffer ref + start + length)
  - [ ] Operations adjust piece list, not raw strings
- [ ] Abstract interface
  - [ ] Keep external API: `insert_string`, `delete_range`, `get_line(n)`, `num_lines()`
  - [ ] Internals can change without React changing
- [ ] Undo/redo
  - [ ] Define `Edit` struct with enough info to revert/redo
  - [ ] Define `History` struct with past/future Vec<Edit>
  - [ ] When applying edit: push inverse into `past`, clear `future`
  - [ ] Implement `undo()` command
  - [ ] Implement `redo()` command
- [ ] Unicode-aware editing
  - [ ] Integrate `unicode-segmentation` or similar crate for grapheme cluster handling
  - [ ] Represent cursor/selection positions in terms of grapheme clusters, not raw bytes
  - [ ] Ensure Backspace/Delete remove entire grapheme clusters (e.g., emojis, combining marks)
  - [ ] Add unit tests for emoji, accented characters, and multi-codepoint graphemes
- [ ] Keyboard bindings in React
  - [ ] Map Ctrl/Cmd + Z to `undo` command
  - [ ] Map Ctrl/Cmd + Shift + Z / Ctrl + Y to `redo`

## 7. Editor features: multi-file, tabs, search  
- [ ] Multi-file support
  - [ ] `EditorState` in Rust with `documents: Vec<Document>`, `active_index: usize`
  - [ ] `open_file(path)` command
  - [ ] `close_document(id)` command  
  - [ ] `set_active_document(id)` command
  - [ ] `list_documents() -> Vec<DocumentMeta>` command
  - [ ] React: Render tabs based on `list_documents`
  - [ ] React: Switch active document via `set_active_document`
- [ ] Find & replace
  - [ ] `find(query: String, options: FindOptions) -> Vec<Match>` command
  - [ ] `replace_next(query, replacement)` command
  - [ ] `replace_all(query, replacement)` command
  - [ ] React: Add search bar
  - [ ] React: Render highlights based on matches
- [ ] Basic config/settings
  - [ ] Store simple settings: tab size, theme, font size
  - [ ] Keep in Rust or Tauri config and expose via commands

## 8. Syntax highlighting & language features
- [ ] Tokenization approach
  - [ ] Do tokenization in Rust using regex-based tokenizers
  - [ ] Per line, compute tokens: `(span_text, token_type)`
- [ ] Data model
  - [ ] Extend serialized line: `type Token = { text: string; kind: string }; type SerializedLine = Token[];`
  - [ ] Rust: For each line, generate tokens
  - [ ] React: Render `<span className={\`token-${kind}\`}>{text}</span>`
- [ ] Incremental highlighting  
  - [ ] Initially, re-tokenize entire document on each change
  - [ ] Later optimization: only re-tokenize affected lines
- [ ] Optional: LSP integration (later phase)
  - [ ] Run LSP servers externally or in background process
  - [ ] Use IPC or side-channel for diagnostics, completions, etc.
  - [ ] Render diagnostics (squiggles) using extra overlays

## 9. Internal architecture cleanup
- [ ] Separate layers in Rust
  - [ ] `buffer` module: piece table / rope implementation
  - [ ] `document` module: cursor, selection, editing operations
  - [ ] `history` module: undo/redo  
  - [ ] `editor_state` module: multiple documents, etc.
  - [ ] `api` module: tauri commands, serialization structs
- [ ] Serialization layer
  - [ ] Explicit DTO types for UI: `SerializedDocument` with id, lines, cursor, selection, file_name, dirty
  - [ ] Implement `From<&Document>` for `SerializedDocument`
- [ ] Testing
  - [ ] Pure Rust unit tests for buffer operations
  - [ ] Pure Rust unit tests for cursor movement
  - [ ] Pure Rust unit tests for undo/redo sequences
  - [ ] Fuzz tests for random edits vs simple string reference implementation

## 10. Desktop polish and packaging
- [ ] Shortcuts and menus
  - [ ] Define native menus in Tauri
  - [ ] Map menu items to commands: New, Open, Save, Save As, Close, Quit
  - [ ] Map menu items to commands: Undo, Redo, Cut, Copy, Paste
  - [ ] Keyboard shortcuts consistent across platforms
- [ ] Window & state persistence
  - [ ] Persist last opened files, window size, theme
  - [ ] Restore on startup
- [ ] Packaging
  - [ ] Configure Tauri bundler for Windows, macOS, Linux
  - [ ] Add app icons
  - [ ] Sign builds if needed
- [ ] Basic error handling
  - [ ] Graceful error messages for file I/O, encoding, etc.
  - [ ] Avoid panics in commands; return structured errors

## 11. Future directions (once core is stable)
- [ ] Advanced buffer structures
  - [ ] Swap piece table with Rope
  - [ ] Swap piece table with B-tree chunked buffer
  - [ ] Keep same public interface so UI doesn't change
- [ ] Command system & Vim/keybinding layer
  - [ ] Introduce command registry in Rust
  - [ ] Map key sequences (vim-style or VSCode-style) to internal commands
  - [ ] Enable custom keymaps per user config
  - [ ] Vim Normal Mode
  - [ ] Vim Insert Mode  
  - [ ] Vim Visual Mode
  - [ ] Vim Command Mode
- [ ] Extensions/plugins
  - [ ] Define JSON or IPC-based plugin protocol
  - [ ] Allow external processes or scripts to register commands or UI actions
- [ ] Collaboration & presence (if needed)
  - [ ] Add CRDT/OT layer on top of Document
  - [ ] Sync via WebSockets to backend

---

**Build Order:**
1. Base Tauri + React + IPC
2. React-only editor UI  
3. Rust-owned document (string-based)
4. Rendering, cursor, selection from Rust
5. File I/O
6. Better buffer + undo/redo
7. Multi-file, tabs, search
8. Syntax highlighting
9. Architecture cleanup + tests  
10. Packaging and desktop polish
11. Optional advanced features
