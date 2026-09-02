use serde::Serialize;
use std::{
    fs::{self, File},
    io::Write,
    path::{Path, PathBuf},
};
use tauri::{AppHandle, Manager};

const SAVE_FILE: &str = "save-v1.json";
const MAX_SAVE_BYTES: usize = 1024 * 1024;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopSaveLoadResult {
    archives: Vec<DesktopSaveCandidate>,
    path: String,
}

#[derive(Serialize)]
struct DesktopSaveCandidate {
    json: String,
    source: String,
}

fn save_directory(app: &AppHandle) -> Result<PathBuf, String> {
    app.path().app_data_dir().map_err(|error| error.to_string())
}

fn validate_archive(json: &str) -> Result<(), String> {
    if json.as_bytes().len() > MAX_SAVE_BYTES {
        return Err("Save archive exceeds the 1 MB safety limit.".into());
    }
    let value: serde_json::Value = serde_json::from_str(json).map_err(|_| "Save archive is not valid JSON.".to_string())?;
    if value.get("format").and_then(|item| item.as_str()) != Some("IRON_KESTREL_SAVE_ARCHIVE")
        || value.get("version").and_then(|item| item.as_u64()) != Some(1)
    {
        return Err("Save archive format is not supported.".into());
    }
    Ok(())
}

fn write_synced(path: &Path, contents: &[u8]) -> Result<(), String> {
    let mut file = File::create(path).map_err(|error| error.to_string())?;
    file.write_all(contents).map_err(|error| error.to_string())?;
    file.sync_all().map_err(|error| error.to_string())
}

fn remove_if_present(path: &Path) -> Result<(), String> {
    if path.exists() {
        fs::remove_file(path).map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn atomic_write(directory: &Path, json: &str) -> Result<(), String> {
    fs::create_dir_all(directory).map_err(|error| error.to_string())?;
    let primary = directory.join(SAVE_FILE);
    let temporary = directory.join("save-v1.tmp");
    let previous = directory.join("save-v1.previous");
    let backup1 = directory.join("save-v1.backup-1.json");
    let backup2 = directory.join("save-v1.backup-2.json");
    let backup3 = directory.join("save-v1.backup-3.json");

    remove_if_present(&temporary)?;
    write_synced(&temporary, json.as_bytes())?;
    remove_if_present(&previous)?;
    if primary.exists() {
        fs::rename(&primary, &previous).map_err(|error| error.to_string())?;
    }
    if let Err(error) = fs::rename(&temporary, &primary) {
        if previous.exists() {
            let _ = fs::rename(&previous, &primary);
        }
        return Err(error.to_string());
    }

    remove_if_present(&backup3)?;
    if backup2.exists() { fs::rename(&backup2, &backup3).map_err(|error| error.to_string())?; }
    if backup1.exists() { fs::rename(&backup1, &backup2).map_err(|error| error.to_string())?; }
    if previous.exists() { fs::rename(&previous, &backup1).map_err(|error| error.to_string())?; }
    Ok(())
}

#[tauri::command]
fn load_desktop_save(app: AppHandle) -> Result<DesktopSaveLoadResult, String> {
    let directory = save_directory(&app)?;
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    load_archives(&directory)
}

fn load_archives(directory: &Path) -> Result<DesktopSaveLoadResult, String> {
    let primary = directory.join(SAVE_FILE);
    let candidates = [
        primary.clone(),
        directory.join("save-v1.previous"),
        directory.join("save-v1.backup-1.json"),
        directory.join("save-v1.backup-2.json"),
        directory.join("save-v1.backup-3.json"),
    ];
    let mut archives = Vec::new();
    for candidate in candidates {
        let Ok(json) = fs::read_to_string(&candidate) else { continue };
        if validate_archive(&json).is_err() { continue; }
        let source = candidate.file_name().map(|name| name.to_string_lossy().to_string()).unwrap_or_default();
        archives.push(DesktopSaveCandidate { json, source });
    }
    Ok(DesktopSaveLoadResult { archives, path: primary.to_string_lossy().to_string() })
}

#[tauri::command]
fn write_desktop_save(app: AppHandle, json: String) -> Result<(), String> {
    validate_archive(&json)?;
    atomic_write(&save_directory(&app)?, &json)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![load_desktop_save, write_desktop_save])
        .run(tauri::generate_context!())
        .expect("error while running Iron Kestrel '87");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn rejects_unrelated_json() {
        assert!(validate_archive(r#"{"version":1}"#).is_err());
    }

    #[test]
    fn accepts_the_release_archive_envelope() {
        assert!(validate_archive(r#"{"format":"IRON_KESTREL_SAVE_ARCHIVE","version":1}"#).is_ok());
    }

    #[test]
    fn atomically_rotates_three_backups() {
        let unique = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
        let directory = std::env::temp_dir().join(format!("iron-kestrel-save-test-{}-{unique}", std::process::id()));
        let archive = |marker: u8| format!(r#"{{"format":"IRON_KESTREL_SAVE_ARCHIVE","version":1,"marker":{marker}}}"#);
        for marker in 1..=5 { atomic_write(&directory, &archive(marker)).unwrap(); }
        assert!(fs::read_to_string(directory.join(SAVE_FILE)).unwrap().contains("\"marker\":5"));
        assert!(fs::read_to_string(directory.join("save-v1.backup-1.json")).unwrap().contains("\"marker\":4"));
        assert!(fs::read_to_string(directory.join("save-v1.backup-3.json")).unwrap().contains("\"marker\":2"));
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn skips_a_corrupt_primary_and_exposes_a_valid_backup_for_recovery() {
        let unique = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
        let directory = std::env::temp_dir().join(format!("iron-kestrel-recovery-test-{}-{unique}", std::process::id()));
        fs::create_dir_all(&directory).unwrap();
        fs::write(directory.join(SAVE_FILE), "{corrupt").unwrap();
        fs::write(directory.join("save-v1.backup-1.json"), r#"{"format":"IRON_KESTREL_SAVE_ARCHIVE","version":1,"exportedAt":"2026-08-31T12:00:00.000Z"}"#).unwrap();
        let loaded = load_archives(&directory).unwrap();
        assert_eq!(loaded.archives.len(), 1);
        assert_eq!(loaded.archives[0].source, "save-v1.backup-1.json");
        fs::remove_dir_all(directory).unwrap();
    }
}
