use tauri::Manager;

mod editor;
mod fs;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            app.manage(editor::EditorState::new("Hello from Rust core"));
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            editor::get_editor_state,
            editor::insert_at_cursor,
            editor::update_selection,
            editor::set_cursor,
            editor::delete_at_cursor
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
