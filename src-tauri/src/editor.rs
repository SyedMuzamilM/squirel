use std::sync::{Arc, Mutex};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};

#[derive(Default, Serialize, Deserialize, Clone)]
struct Cursor {
    row: usize,
    col: usize,
}

#[derive(Default, Serialize, Deserialize, Clone)]
struct Selection {
    start: Cursor,
    end: Cursor,
}

#[derive(Default, Serialize, Deserialize, Clone)]
pub struct Document {
    cursor: Cursor,
    selection: Selection,
    file_path: String,
    is_dirty: bool,
    lines: Vec<String>,
}

type DocumentState = Arc<Mutex<Document>>;

#[tauri::command]
pub fn insert_char(app_handle: AppHandle, state: State<'_, DocumentState>, ch: char) -> Option<()> {
    let mut document = state.lock().unwrap();

    if document.cursor.row >= document.lines.len() {
        document.cursor.row = document.lines.len() + 1;
    }

    let row = document.cursor.row;
    let col = document.cursor.col;

    if let Some(line) = document.lines.get_mut(row) {
        // Build a vector of (byte_index, char) to map character positions to byte indices.
        let char_indices: Vec<(usize, char)> = line.char_indices().collect();

        // Determine the byte index in the string where we should insert the character.
        // cursor.col is the character position (0 means start of line).
        let insert_byte = if col == 0 {
            0
        } else if col >= char_indices.len() {
            // If the cursor is beyond or at the end of the line, append to the end.
            line.len()
        } else {
            // Insert at the byte index of the character at position `col`.
            char_indices[col].0
        };

        line.insert_str(insert_byte, &ch.to_string());
    } else {
        document.lines.push(ch.to_string());
    }

    document.cursor = Cursor {
        row: document.cursor.row,
        col: document.cursor.col + 1,
    };

    app_handle
        .emit("document_updated", document.clone())
        .unwrap();

    Some(())
}

#[tauri::command]
pub fn delete_backward(app_handle: AppHandle, state: State<'_, DocumentState>) -> Option<()> {
    let mut document = state.lock().unwrap();

    // If there are no lines, nothing to delete.
    if document.lines.is_empty() {
        return Some(());
    }

    // Ensure the cursor row is within bounds.
    if document.cursor.row >= document.lines.len() {
        document.cursor.row = document.lines.len() - 1;
    }

    let row = document.cursor.row;
    let col = document.cursor.col;

    if document.cursor.col > 0 {
        // Delete the character immediately before the cursor on the current line.
        if let Some(line) = document.lines.get_mut(row) {
            let char_idx = col - 1;
            let char_indices: Vec<(usize, char)> = line.char_indices().collect();
            if char_idx < char_indices.len() {
                let start = char_indices[char_idx].0;
                let end = if char_idx + 1 < char_indices.len() {
                    char_indices[char_idx + 1].0
                } else {
                    line.len()
                };
                line.drain(start..end);
                document.cursor.col -= 1;
            }
        }
    } else if document.cursor.row > 0 {
        // If at start of a line, join this line with the previous one.
        let current = document.lines.remove(row);
        let prev_row = row - 1;
        if let Some(prev_line) = document.lines.get_mut(prev_row) {
            let prev_len_chars = prev_line.chars().count();
            prev_line.push_str(&current);
            document.cursor.row = prev_row;
            document.cursor.col = prev_len_chars;
        }
    }

    app_handle
        .emit("document_updated", document.clone())
        .unwrap();

    Some(())
}

#[tauri::command]
pub fn insert_string(
    app_handle: AppHandle,
    state: State<'_, DocumentState>,
    str: String,
) -> Option<()> {
    let mut document = state.lock().unwrap();

    // Not used yet need to fix this somehow (would be used for past or something)
    if let Some(line) = document.lines.last_mut() {
        *line = format!("{}{}", line, str);
    } else {
        document.lines.push(str);
    }

    app_handle
        .emit("document_updated", document.clone())
        .unwrap();

    Some(())
}

#[tauri::command]
pub fn insert_newline(app_handle: AppHandle, state: State<'_, DocumentState>) -> Option<()> {
    let mut document = state.lock().unwrap();

    // This adds a new line
    // Need to fix this
    document.lines.push("".to_string());
    document.cursor = Cursor {
        row: document.cursor.row + 1,
        col: 0,
    };

    app_handle
        .emit("document_updated", document.clone())
        .unwrap();

    Some(())
}

#[tauri::command]
pub fn move_cursor(
    app_handle: AppHandle,
    state: State<'_, DocumentState>,
    movement: String,
) -> Option<()> {
    let mut document = state.lock().unwrap();

    match movement.as_str() {
        "ArrowLeft" => {
            document.cursor = Cursor {
                col: document.cursor.col - 1,
                row: document.cursor.row,
            }
        }
        "ArrowRight" => {
            document.cursor = Cursor {
                col: document.cursor.col + 1,
                row: document.cursor.row,
            }
        }
        "ArrowUp" => {
            document.cursor = Cursor {
                col: document.cursor.col,
                row: document.cursor.row - 1,
            }
        }
        "ArrowDown" => {
            document.cursor = Cursor {
                col: document.cursor.col,
                row: document.cursor.row + 1,
            }
        }
        _ => println!("Unknown movement."),
    }

    app_handle
        .emit("document_updated", document.clone())
        .unwrap();

    Some(())
}
