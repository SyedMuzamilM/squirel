// use tauri::Manager;

use std::sync::{Arc, Mutex};

use tauri::Manager;

mod editor;
mod fs;
mod platform;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            app.manage(Arc::new(Mutex::new(editor::Document::default())));
            #[cfg(debug_assertions)] // only include this code on debug builds
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
                window.close_devtools();
            }
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .invoke_handler(tauri::generate_handler![
            platform::get_platform,
            editor::insert_char,
            editor::insert_newline,
            editor::insert_string,
            editor::move_cursor
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
