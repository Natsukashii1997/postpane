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
    ) -> Result<Option<String>, String> {
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
            Err("ChatGPT 插件没能完成：timeout".into())
        }
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

/// An answer whose last lines do not hold comes in over the channel, and
/// PostPane asks ChatGPT to mend them: the extension's word that the ask
/// went in is right behind the answer on the same reading thread, and is
/// heard. Driven on the reading thread itself, the ask waited out its own
/// word and was booked as never known to have gone in (#440).
#[test]
fn an_ask_to_mend_hears_that_it_went_in() {
    let (_temp, desk) = desk();
    let handoff = opened(&desk, &Fake::default());
    // The answer as the page shows it, under the words this test sent.
    let answer = turn("complete", NO_VERDICT);
    let desk = Arc::new(desk);
    let (says, said) = channel::<Value>();
    let (over, sendings): (_, Receiver<(String, bool)>) = channel();
    let wired = Arc::new(Wired {
        says: Mutex::new(says.clone()),
        waiting: Mutex::new(None),
        over: Mutex::new(over),
    });
    let hear = hearing(
        {
            let desk = desk.clone();
            move |message| desk.observe(message, 10)
        },
        {
            let (desk, wired) = (desk.clone(), wired.clone());
            move || desk.drive(&*wired, 10)
        },
        || {},
    );
    // The channel's reading thread, as `Shared::inbound`: one thing after
    // another, word of words sent to who waits for it and to the listener.
    let reading = std::thread::spawn({
        let wired = wired.clone();
        move || {
            while let Ok(message) = said.recv() {
                if message.is_null() {
                    break;
                }
                if message["type"] == "sent" {
                    wired.word();
                }
                hear(&message);
            }
        }
    });
    says.send(answer).unwrap();
    let (text, came) = sendings
        .recv_timeout(Duration::from_secs(5))
        .expect("the ask to mend was sent");
    settled(&desk);
    says.send(Value::Null).unwrap();
    reading.join().unwrap();
    assert!(text.contains("驿窗自动发送"), "{text}");
    assert!(came, "word that it went in was heard while it waited");
    let now = desk.lock().get(&handoff.id).cloned().unwrap();
    assert!(!now.unsure(), "known to have gone in: {:?}", now.halt);
    assert!(now.auto, "the round trip goes on: {:?}", now.halt);
    assert!(
        now.steps.iter().all(|step| step.kind != StepKind::Fail),
        "nothing failed"
    );
}

/// Asked while it drives, the driver drives once more after, however often
/// it was asked: nothing booked meanwhile is left undriven, and askings do
/// not pile up.
#[test]
fn asked_while_it_drives_the_driver_drives_once_more() {
    let (entered, enters) = channel();
    let (go, goes) = channel::<()>();
    let driver = Driver::start(move || {
        entered.send(()).unwrap();
        goes.recv().unwrap();
    });
    let soon = Duration::from_secs(5);
    driver.ask();
    enters.recv_timeout(soon).expect("it drives");
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
