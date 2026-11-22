//! The events the host sends the front end, by name (7b). The same names are
//! listed in src/packages/protocol/src/events.ts (`HOST_EVENTS`), and
//! src/packages/protocol/test/names.test.ts keeps the two lists equal.
pub const SNAPSHOT_JSON: &str = "hud:snapshot-json";
pub const SNAPSHOT_ERROR: &str = "hud:snapshot-error";
pub const CLOCK: &str = "hud:clock";
pub const PRESENTATION: &str = "hud:presentation";
pub const FLIGHT: &str = "hud:flight";
pub const POINTER: &str = "hud:pointer";
pub const DRAG_PREVIEW: &str = "hud:drag-preview";
pub const DRAG_END: &str = "hud:drag-end";
pub const GEOMETRY: &str = "hud:geometry";
pub const MONITORS: &str = "hud:monitors";
pub const BOT_DIRECTIONS: &str = "hud:bot-directions";
pub const WINDOW_ACTIVITY: &str = "window:activity";
pub const FLOAT_NOTES_SHOWN: &str = "float-notes:shown";
pub const DEMO_PANEL: &str = "demo:panel";
pub const SETTINGS_PAGE: &str = "settings:page";
pub const STATISTICS_TAB: &str = "statistics:tab";
pub const STATISTICS_SESSION: &str = "statistics:session";

/// Not sent as such: `activity::publish` sends a snapshot as JSON text under
/// `SNAPSHOT_JSON`, which WebKit decodes far faster than an object literal.
pub const SNAPSHOT: &str = "hud:snapshot";
