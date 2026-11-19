//! What the ChatGPT extension says is booked where it is heard, on the
//! channel's one reading thread, and nothing else is done there (#440).
//! Driving may send words through the channel and wait for word that they
//! went in, and only the reading thread brings that word; the sidebar's
//! refresh drives too (`projection`) and waits for the backend, which the
//! data thread may hold while it waits for such word itself. Both are done
//! on a thread of their own.
use serde_json::Value;
use std::panic::{catch_unwind, AssertUnwindSafe};
use std::sync::mpsc::{sync_channel, SyncSender, TrySendError};
use std::sync::{Arc, Mutex};

/// Does its work on a thread of its own whenever it is asked to. Asked
/// while it works, it works once more after, however often it was asked.
pub(super) struct Driver {
    work: Arc<dyn Fn() + Send + Sync>,
    /// The way to its thread, once that runs.
    ask: Mutex<Option<SyncSender<()>>>,
}

impl Driver {
    pub(super) fn new(work: impl Fn() + Send + Sync + 'static) -> Self {
        Self {
            work: Arc::new(work),
            ask: Mutex::new(None),
        }
    }
    /// Never works on the caller's thread. Its own thread starts with the
    /// first asking, and again should it be gone; when it cannot start,
    /// the data thread's passes still drive what waits (`catch_up`, every
    /// `SAFETY_REFRESH_MS` at the latest).
    pub(super) fn ask(&self) {
        let mut ask = self.ask.lock().unwrap_or_else(|p| p.into_inner());
        if let Some(thread) = ask.as_ref() {
            match thread.try_send(()) {
                // One asking waits already: its work comes after this one too.
                Ok(()) | Err(TrySendError::Full(())) => return,
                Err(TrySendError::Disconnected(())) => {}
            }
        }
        *ask = self.start();
        if let Some(thread) = ask.as_ref() {
            let _ = thread.try_send(());
        }
    }
    fn start(&self) -> Option<SyncSender<()>> {
        let (ask, asked) = sync_channel(1);
        let work = Arc::clone(&self.work);
        let thread = std::thread::Builder::new().name("postpane-handoff-driver".into());
        let started = thread.spawn(move || {
            while asked.recv().is_ok() {
                // Work that panics is over, not the thread: the next asking
                // works again.
                if catch_unwind(AssertUnwindSafe(|| work())).is_err() {
                    eprintln!("The handoff driver's work panicked");
                }
            }
        });
        match started {
            Ok(_) => Some(ask),
            Err(error) => {
                eprintln!("The handoff driver could not start: {error}");
                None
            }
        }
    }
}

/// What the channel calls with each thing the extension says: `observe`
/// books it there and then. When that changed a handoff, the driver's
/// thread takes it on (`drive`) and shows the sidebar what there is now
/// (`republish`).
pub(super) fn hearing(
    observe: impl Fn(&Value) -> bool + Send + Sync + 'static,
    drive: impl Fn() + Send + Sync + 'static,
    republish: impl Fn() + Send + Sync + 'static,
) -> impl Fn(&Value) + Send + Sync + 'static {
    let driver = Driver::new(move || {
        drive();
        republish();
    });
    move |message| {
        if observe(message) {
            driver.ask();
        }
    }
}
