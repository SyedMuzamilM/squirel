use ropey::Rope;
use serde::Serialize;
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Clone, Serialize)]
pub struct EditorSnapshot {
    pub text: String,
    pub cursor: usize,
    pub selection: Option<(usize, usize)>,
}

#[derive(Debug)]
struct EditorCore {
    buffer: Rope,
    cursor: usize,
    selection: Option<(usize, usize)>,
}

impl EditorCore {
    fn new(initial: &str) -> Self {
        Self {
            buffer: Rope::from_str(initial),
            cursor: 0,
            selection: None,
        }
    }

    fn snapshot(&self) -> EditorSnapshot {
        EditorSnapshot {
            text: self.buffer.to_string(),
            cursor: self.cursor,
            selection: self.selection,
        }
    }

    // Insert text at cursor or replace selection
    fn insert_text(&mut self, s: &str) {
        match self.selection {
            Some((start, end)) if start < end => {
                // Replace selection
                self.buffer.remove(start..end);
                self.buffer.insert(start, s);
                self.cursor = start + s.chars().count();
                self.selection = None;
            }
            _ => {
                // Insert at cursor
                let pos = self.cursor.min(self.buffer.len_chars());
                self.buffer.insert(pos, s);
                self.cursor = pos + s.chars().count();
                self.selection = None;
            }
        }
    }

    fn set_cursor(&mut self, pos: usize) {
        let len = self.buffer.len_chars();
        self.cursor = pos.min(len);
        self.selection = None;
    }

    fn set_selection(&mut self, start: usize, end: usize) {
        let len = self.buffer.len_chars();
        let s = start.min(len);
        let e = end.min(len);
        if s >= e {
            self.cursor = s;
            self.selection = None;
        } else {
            self.cursor = e;
            self.selection = Some((s, e));
        }
    }

    fn delete_at_cursor(&mut self) {
        match self.selection {
            Some((start, end)) if start < end => {
                // Delete selection
                self.buffer.remove(start..end);
                self.cursor = start;
                self.selection = None;
            }
            _ => {
                // Delete single character before cursor (backspace)
                if self.cursor > 0 {
                    let pos = self.cursor - 1;
                    self.buffer.remove(pos..self.cursor);
                    self.cursor = pos;
                }
            }
        }
    }
}

pub struct EditorState {
    pub inner: Mutex<EditorCore>,
}

impl EditorState {
    pub fn new(initial_content: &str) -> Self {
        Self {
            inner: Mutex::new(EditorCore::new(initial_content)),
        }
    }
}

// Tauri commands
#[tauri::command]
pub fn get_editor_state(state: State<EditorState>) -> EditorSnapshot {
    let core = state.inner.lock().unwrap();
    core.snapshot()
}

#[tauri::command]
pub fn insert_at_cursor(text: String, state: State<EditorState>) -> EditorSnapshot {
    let mut core = state.inner.lock().unwrap();
    core.insert_text(&text);
    core.snapshot()
}

#[tauri::command]
pub fn update_selection(start: usize, end: usize, state: State<EditorState>) -> EditorSnapshot {
    let mut core = state.inner.lock().unwrap();
    core.set_selection(start, end);
    core.snapshot()
}

#[tauri::command]
pub fn set_cursor(pos: usize, state: State<EditorState>) -> EditorSnapshot {
    let mut core = state.inner.lock().unwrap();
    core.set_cursor(pos);
    core.snapshot()
}

#[tauri::command]
pub fn delete_at_cursor(state: State<EditorState>) -> EditorSnapshot {
    let mut core = state.inner.lock().unwrap();
    core.delete_at_cursor();
    core.snapshot()
}
