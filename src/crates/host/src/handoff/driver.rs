//! What the ChatGPT extension says is booked where it is heard, on the
//! channel's one reading thread, and driven on a thread of its own (#440):
//! driving may send words through the channel and wait for word that they
//! went in, and only the reading thread brings that word.
use serde_json::Value;
use std::sync::mpsc::{sync_channel, SyncSender};

/// Drives on a thread of its own whenever it is asked to. Asked while it
/// drives, it drives once more after, however often it was asked.
pub(super) struct Driver(SyncSender<()>);

impl Driver {
    pub(super) fn start(drive: impl Fn() + Send + 'static) -> Self {
        let (ask, asked) = sync_channel(1);
        let thread = std::thread::Builder::new().name("postpane-handoff-driver".into());
        // Not started: nothing drives here, and the sidebar's refresh still
        // does (`catch_up`).
        if let Err(error) = thread.spawn(move || {
            while asked.recv().is_ok() {
                drive();
            }
        }) {
            eprintln!("The handoff driver could not start: {error}");
        }
        Self(ask)
    }
    pub(super) fn ask(&self) {
        // One asking waits already: its drive comes after this one too.
        let _ = self.0.try_send(());
    }
}

/// What the channel calls with each thing the extension says: `observe`
/// books it there and then, and when that changed a handoff the sidebar is
/// shown it (`republish`) and `drive` takes it on, on the driver's thread,
/// showing the sidebar what came of it.
pub(super) fn hearing(
    observe: impl Fn(&Value) -> bool + Send + Sync + 'static,
    drive: impl Fn() -> bool + Send + 'static,
    republish: impl Fn() + Send + Sync + Clone + 'static,
) -> impl Fn(&Value) + Send + Sync + 'static {
    let driver = Driver::start({
        let republish = republish.clone();
        move || {
            if drive() {
                republish();
            }
        }
    });
    move |message| {
        if observe(message) {
            driver.ask();
            republish();
        }
    }
}
