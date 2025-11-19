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
pub fn insert_char(
    app_handle: AppHandle,
    state: State<'_, DocumentState>,
    ch: char,
) -> Result<(), ()> {
    let mut document = state.lock().unwrap();

    if let Some(line) = document.lines.last_mut() {
        *line = format!("{}{}", line, ch);
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

    Ok(())
}

#[tauri::command]
pub fn insert_string(
    app_handle: AppHandle,
    state: State<'_, DocumentState>,
    str: String,
) -> Result<(), ()> {
    let mut document = state.lock().unwrap();

    if let Some(line) = document.lines.last_mut() {
        *line = format!("{}{}", line, str);
    } else {
        document.lines.push(str);
    }

    app_handle
        .emit("document_updated", document.clone())
        .unwrap();

    Ok(())
}

#[tauri::command]
pub fn insert_newline(app_handle: AppHandle, state: State<'_, DocumentState>) -> Result<(), ()> {
    let mut document = state.lock().unwrap();

    document.lines.push("".to_string());
    document.cursor = Cursor {
        row: document.cursor.row + 1,
        col: 0,
    };

    app_handle
        .emit("document_updated", document.clone())
        .unwrap();

    Ok(())
}

#[tauri::command]
pub fn move_cursor(
    app_handle: AppHandle,
    state: State<'_, DocumentState>,
    movement: String,
) -> Result<(), ()> {
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

    Ok(())
}
