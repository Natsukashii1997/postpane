//! #440: what the extension says is booked on the channel's one reading
//! thread and driven on another. Driving may send words through the channel
//! and wait for word of them, and only the reading thread brings that word.
use super::super::driver::{hearing, Driver};
use super::*;
use std::sync::mpsc::{channel, Receiver, Sender};
use std::sync::Arc;
use std::time::{Duration, Instant};

/// How long the lines below wait for word that words went in: short, where
/// the channel waits `SEND_TIME`.
const WORD_WAIT: Duration = Duration::from_millis(400);
const NO_VERDICT: &str = "1. 还差一点，先这样";

/// Lines as the channel is (G-34): words sent are with the extension at
/// once, and known to have gone in only when the thread that reads what the
/// extension says brings its word (`Shared::ask_as`).
struct Wired {
    /// What the extension says, for the reading thread to read.
    says: Mutex<Sender<Value>>,
    /// Who waits for word of the words being sent.
    waiting: Mutex<Option<Sender<()>>>,
    /// Each sending, once it is over: the words, and whether word came.
    over: Mutex<Sender<(String, bool)>>,
}
impl Wired {
    /// As `Shared::inbound` hears `sent`: it answers who waits for it.
    fn word(&self) {
        if let Some(waiting) = self.waiting.lock().unwrap().take() {
            let _ = waiting.send(());
        }
    }
}
impl Lines for Wired {
    fn connected(&self) -> bool {
        true
    }
    fn pr_head(&self, _: &str) -> Result<String, String> {
        Err("not read here".into())
    }
    fn open(
        &self,
        _: &str,
        _: Option<&str>,
        _: &str,
        _: &str,
    ) -> Result<(String, Option<String>), String> {
        Err("not here".into())
    }
    fn send(
        &self,
        conversation: &str,
        text: &str,
        request: &str,
    ) -> Result<Option<String>, SendFailed> {
        let (word, heard) = channel();
        *self.waiting.lock().unwrap() = Some(word);
        // The extension puts the words in and says so.
        let sent = json!({"type":"sent","requestId":request,"ok":true,"conversation":conversation});
        self.says.lock().unwrap().send(sent).unwrap();
        let came = heard.recv_timeout(WORD_WAIT).is_ok();
        self.over
            .lock()
            .unwrap()
            .send((text.to_owned(), came))
            .unwrap();
        if came {
            Ok(None)
        } else {
            Err(SendFailed::Unsure("ChatGPT 插件没能完成：timeout".into()))
        }
    }
    fn find(&self, _: &str, _: &str, _: Option<&str>) -> Result<(), String> {
        Ok(())
    }
    fn reread(&self, _: &str) -> Result<(), String> {
        Ok(())
    }
    fn reaches(&self, _: &str, _: &str) -> Result<(), String> {
        Ok(())
    }
    fn reply(&self, _: &str, _: &str, _: &str, _: &str) -> Result<(), Unsent> {
        Ok(())
    }
    fn leave(&self, _: &str, _: &str) -> Result<String, String> {
        Err("not here".into())
    }
    fn queue(&self, _: &str, _: &str, _: &str, _: &str) -> Result<(), Unsent> {
        Err(Unsent::Failed("not here".into()))
    }
    fn left(&self, _: &str, _: &str, _: &str, _: &str) -> Option<(String, Option<String>)> {
        None
    }
    fn opener(&self, _: &str, _: &str) -> Option<(Opener, i64)> {
        None
    }
    fn stopped(&self, _: &str) -> bool {
        false
    }
    fn withdraw(&self, _: &str, _: &str) -> bool {
        false
    }
    fn wake(&self, _: &str, _: &str, _: &str) -> Result<(), String> {
        Err("not here".into())
    }
}

/// Waits till no handoff has words on their way (what was sent is booked).
fn settled(desk: &Desk) {
    let by = Instant::now() + Duration::from_secs(5);
    while !desk.sending.lock().unwrap().is_empty() {
        assert!(Instant::now() < by, "words still on their way");
        std::thread::sleep(Duration::from_millis(10));
    }
}

/// A handoff whose answer, with last lines that do not hold, is about to
/// come in over the channel.
struct Rig {
    _temp: tempfile::TempDir,
    desk: Arc<Desk>,
    wired: Arc<Wired>,
    handoff: Handoff,
    /// The answer as the page shows it, under the words this test sent.
    answer: Value,
    says: Sender<Value>,
    said: Receiver<Value>,
    sendings: Receiver<(String, bool)>,
}
fn rig() -> Rig {
    let (temp, desk) = desk();
    let handoff = opened(&desk, &Fake::default());
    let answer = turn("complete", NO_VERDICT);
    let (says, said) = channel::<Value>();
    let (over, sendings) = channel();
    let wired = Arc::new(Wired {
        says: Mutex::new(says.clone()),
        waiting: Mutex::new(None),
        over: Mutex::new(over),
    });
    Rig {
        _temp: temp,
        desk: Arc::new(desk),
        wired,
        handoff,
        answer,
        says,
        said,
        sendings,
    }
}
impl Rig {
    /// The sidebar's refresh as the app does it (`republish` →
    /// `Backend::refresh_handoffs` → `projection`): under the backend's
    /// lock, and driving what waits to go on.
    fn refresh(&self, backend: &Arc<Mutex<()>>) -> impl Fn() + Send + Sync + Clone + 'static {
        let (desk, wired, backend) = (self.desk.clone(), self.wired.clone(), backend.clone());
        move || {
            let _held = backend.lock().unwrap();
            desk.catch_up(&*wired, 10);
        }
    }
    /// The answer comes in and `hear` is told of it on the channel's
    /// reading thread, as `Shared::inbound` does: one thing after another,
    /// word of words sent to who waits for it and to the listener. The ask
    /// to mend that followed, once the book has it: whether word that it
    /// went in came, and the handoff after.
    fn heard_by(self, hear: impl Fn(&Value) + Send + 'static) -> (bool, Handoff) {
        self.heard_then(hear, || {})
    }
    /// `heard_by`, with `then` done once the ask to mend is over.
    fn heard_then(
        self,
        hear: impl Fn(&Value) + Send + 'static,
        then: impl FnOnce(),
    ) -> (bool, Handoff) {
        let (wired, said) = (self.wired.clone(), self.said);
        let reading = std::thread::spawn(move || {
            while let Ok(message) = said.recv() {
                if message.is_null() {
                    break;
                }
                if message["type"] == "sent" {
                    wired.word();
                }
                hear(&message);
            }
        });
        self.says.send(self.answer).unwrap();
        let (text, came) = self
            .sendings
            .recv_timeout(Duration::from_secs(5))
            .expect("the ask to mend was sent");
        then();
        settled(&self.desk);
        self.says.send(Value::Null).unwrap();
        reading.join().unwrap();
        assert!(text.contains("驿窗自动发送"), "{text}");
        let now = self.desk.lock().get(&self.handoff.id).cloned().unwrap();
        (came, now)
    }
}
/// The ask to mend was heard to have gone in, and nothing stopped.
fn went_in((came, now): (bool, Handoff)) {
    assert!(came, "word that it went in was heard while it waited");
    assert!(!now.unsure(), "known to have gone in: {:?}", now.halt);
    assert!(now.auto, "the round trip goes on: {:?}", now.halt);
    assert!(
        now.steps.iter().all(|step| step.kind != StepKind::Fail),
        "nothing failed"
    );
}

/// An answer whose last lines do not hold comes in over the channel, and
/// PostPane asks ChatGPT to mend them: the extension's word that the ask
/// went in is right behind the answer on the same reading thread, and is
/// heard. Driven on the reading thread itself, the ask waited out its own
/// word and was booked as never known to have gone in (#440).
#[test]
fn an_ask_to_mend_hears_that_it_went_in() {
    let rig = rig();
    let hear = hearing(
        {
            let desk = rig.desk.clone();
            move |message| desk.observe(message, 10)
        },
        {
            let (desk, wired) = (rig.desk.clone(), rig.wired.clone());
            move || {
                desk.drive(&*wired, 10);
            }
        },
        || {},
    );
    went_in(rig.heard_by(hear));
}

/// The sidebar's refresh drives what waits to go on as well, so it is not
/// done on the reading thread either: there its ask to mend would wait out
/// its own word just the same (#440 review P1-01).
#[test]
fn the_sidebar_is_not_refreshed_on_the_reading_thread() {
    let rig = rig();
    let hear = hearing(
        {
            let desk = rig.desk.clone();
            move |message| desk.observe(message, 10)
        },
        // Nothing but the refresh takes the answer on.
        || {},
        rig.refresh(&Arc::new(Mutex::new(()))),
    );
    went_in(rig.heard_by(hear));
}

/// While the data thread holds the backend (a snapshot pass), the refresh
/// waits for it; the reading thread does not, and still brings word of the
/// ask to mend (#440 review P1-01).
#[test]
fn a_refresh_that_waits_for_the_data_thread_does_not_hold_the_reading_thread() {
    let rig = rig();
    let backend = Arc::new(Mutex::new(()));
    let hear = hearing(
        {
            let desk = rig.desk.clone();
            move |message| desk.observe(message, 10)
        },
        {
            let (desk, wired) = (rig.desk.clone(), rig.wired.clone());
            move || {
                desk.drive(&*wired, 10);
            }
        },
        rig.refresh(&backend),
    );
    // The pass lasts till the ask to mend is over.
    let pass = backend.lock().unwrap();
    went_in(rig.heard_then(hear, || drop(pass)));
}

/// Asked while it works, the driver works once more after, however often
/// it was asked: nothing booked meanwhile is left undriven, and askings do
/// not pile up.
#[test]
fn asked_while_it_works_the_driver_works_once_more() {
    let (entered, enters) = channel();
    let (go, goes) = channel::<()>();
    let (entered, goes) = (Mutex::new(entered), Mutex::new(goes));
    let driver = Driver::new(move || {
        entered.lock().unwrap().send(()).unwrap();
        goes.lock().unwrap().recv().unwrap();
    });
    let soon = Duration::from_secs(5);
    driver.ask();
    enters.recv_timeout(soon).expect("it works");
    for _ in 0..3 {
        driver.ask();
    }
    go.send(()).unwrap();
    enters.recv_timeout(soon).expect("once more");
    go.send(()).unwrap();
    assert!(
        enters.recv_timeout(Duration::from_millis(300)).is_err(),
        "and no more"
    );
}

/// Work that panics does not end the driver: asked again, it works again
/// (#440 review P2-02).
#[test]
fn work_that_panics_does_not_end_the_driver() {
    let (done, does) = channel();
    let done = Mutex::new(done);
    let times = std::sync::atomic::AtomicUsize::new(0);
    let driver = Driver::new(move || {
        let time = times.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
        done.lock().unwrap().send(time).unwrap();
        assert!(time > 0, "the first work panics (meant to, in this test)");
    });
    let soon = Duration::from_secs(5);
    driver.ask();
    assert_eq!(does.recv_timeout(soon), Ok(0));
    // The panic is over before the next asking is taken or not: asked till
    // it works again.
    let by = Instant::now() + soon;
    loop {
        driver.ask();
        if let Ok(time) = does.recv_timeout(Duration::from_millis(50)) {
            assert_eq!(time, 1, "it works again");
            break;
        }
        assert!(Instant::now() < by, "the driver never worked again");
    }
}

/// The driver never works on the thread that asks: there the reading
/// thread would wait for what only it can bring (#440).
#[test]
fn the_driver_never_works_on_the_asking_thread() {
    let (done, does) = channel();
    let done = Mutex::new(done);
    let driver = Driver::new(move || {
        let thread = std::thread::current().id();
        done.lock().unwrap().send(thread).unwrap();
    });
    driver.ask();
    let worked_on = does.recv_timeout(Duration::from_secs(5)).expect("it works");
    assert_ne!(worked_on, std::thread::current().id());
}
