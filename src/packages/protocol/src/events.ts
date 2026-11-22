// The app's Tauri events, by name (7b). The front end listens and emits only
// through `listenTo` / `emitTo` (app/src/lib/native.ts) with one of these
// names, and test/names.test.ts checks that every event the host emits is
// named here. Payload types stay where each event is handled.
export const EVENTS = [
  // Host → front end.
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
  "product:event",
  // Front end → front end (between windows).
  "statistics:provider",
  "hud:config",
] as const;

export type AppEvent = (typeof EVENTS)[number];
