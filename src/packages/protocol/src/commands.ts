// The app's Tauri commands, by name (7b). The front end calls them only
// through `call` (app/src/lib/native.ts) with one of these names, and
// test/names.test.ts keeps this list equal to the commands the host
// registers (`generate_handler!` in src/crates/host/src/lib.rs).
export const COMMANDS = [
  "native_request",
  "cached_snapshot",
  "startup_mode",
  "presentation_request",
  "native_mcp_clients",
  "native_claude_plugin",
  "native_chatgpt_extension",
  "handoff_act",
  "relay_launch",
  "chatgpt_project",
  "chatgpt_review_limit",
  "native_deepseek_plugin",
  "picture_payload",
  "picture_complete",
  "picture_resize",
  "native_capture_webview",
  "native_system_status",
  "window_activity",
  "hud_monitors",
  "hud_geometry",
  "hud_report_regions",
  "hud_drag_start",
  "hud_text_focus",
  "hud_show_main",
  "toggle_float_notes",
  "float_notes_shown",
  "disk_slim_status",
  "toggle_disk_slim",
  "quit_app",
  "open_statistics",
  "take_statistics_target",
  "take_settings_page",
  "hud_bot_directions",
  "hud_bot_looked",
] as const;

export type Command = (typeof COMMANDS)[number];
