#[tauri::command]
fn open_in_browser(url: String) -> Result<(), String> {
  #[cfg(target_os = "windows")]
  {
    std::process::Command::new("rundll32")
      .args(["url.dll,FileProtocolHandler", &url])
      .spawn()
      .map_err(|e| e.to_string())?;
    Ok(())
  }
  #[cfg(target_os = "macos")]
  {
    std::process::Command::new("open")
      .arg(&url)
      .spawn()
      .map_err(|e| e.to_string())?;
    Ok(())
  }
  #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
  {
    std::process::Command::new("xdg-open")
      .arg(&url)
      .spawn()
      .map_err(|e| e.to_string())?;
    Ok(())
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .invoke_handler(tauri::generate_handler![open_in_browser])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
