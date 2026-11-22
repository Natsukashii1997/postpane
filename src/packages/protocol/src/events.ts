// The app's Tauri events, by name (7b). The front end listens and emits only
// through `listenTo` / `emitTo` (app/src/lib/native.ts) with one of these
// names. test/names.test.ts keeps `HOST_EVENTS` equal to the names the host
// emits (src/crates/host/src/events.rs). Payload types stay where each event
// is handled.

/** Sent by the host to the front end. */
export const HOST_EVENTS = [
  "hud:snapshot-json",
  "hud:snapshot-error",
  "hud:clock",
  "hud:presentation",
  "hud:flight",
  "hud:pointer",
  "hud:drag-preview",
  "hud:drag-end",
  "hud:geometry",
  "hud:monitors",
  "hud:bot-directions",
  "window:activity",
  "float-notes:shown",
  "demo:panel",
  "settings:page",
  "statistics:tab",
  "statistics:session",
] as const;

/** Sent by one front-end window to another; the host never emits these. */
export const WINDOW_EVENTS = ["statistics:provider"] as const;

export const EVENTS = [...HOST_EVENTS, ...WINDOW_EVENTS] as const;

export type AppEvent = (typeof EVENTS)[number];
