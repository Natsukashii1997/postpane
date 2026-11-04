#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // hud-dock: an installed copy owns client hooks; build outputs and copies elsewhere never do.
    let canonical_executable = std::env::current_exe()
        .ok()
        .filter(|path| cfg!(target_os = "macos") && path.starts_with("/Applications/"));
    agent_hud_host::run_with_options(
        tauri::generate_context!(),
        None,
        agent_hud_host::HostOptions {
            canonical_executable,
        },
    );
}
