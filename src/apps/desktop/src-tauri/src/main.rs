#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // PostPane: a copy installed in /Applications owns client hooks; build
    // outputs and copies elsewhere never do. No other system has that folder.
    let canonical_executable = std::env::current_exe()
        .ok()
        .filter(|path| path.starts_with("/Applications/"));
    agent_hud_host::run_with_options(
        tauri::generate_context!(),
        None,
        agent_hud_host::HostOptions {
            canonical_executable,
        },
    );
}
