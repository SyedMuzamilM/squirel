#[tauri::command]
pub fn get_platform() -> String {
    let platform = tauri_plugin_os::platform();
    platform.to_string()
}
