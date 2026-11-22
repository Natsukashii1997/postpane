//! Who is told of what the extension reports, and what came before anyone
//! listened (#507): the socket takes connections as soon as the channel
//! starts, while the handoffs listen a moment later, and a turn start the
//! extension re-reports on connecting must not be lost in between.

use std::sync::Mutex;

use serde_json::Value;

use super::Listener;

/// Kept for the listener to come; beyond this the oldest go.
const EARLY_MOST: usize = 64;

#[derive(Default)]
pub(crate) struct Listening(Mutex<(Option<Listener>, Vec<Value>)>);

impl Listening {
    fn lock(&self) -> std::sync::MutexGuard<'_, (Option<Listener>, Vec<Value>)> {
        self.0.lock().unwrap_or_else(|p| p.into_inner())
    }

    /// Told now, or kept until someone listens.
    pub(crate) fn tell(&self, message: &Value) {
        let mut held = self.lock();
        let Some(listener) = held.0.clone() else {
            if held.1.len() == EARLY_MOST {
                held.1.remove(0);
            }
            held.1.push(message.clone());
            return;
        };
        drop(held);
        listener(message);
    }

    /// From now on `listener` is told, after what came before, in order.
    /// The lock is held while those are told, so nothing newer overtakes.
    pub(crate) fn listen(&self, listener: Listener) {
        let mut held = self.lock();
        for message in std::mem::take(&mut held.1) {
            listener(&message);
        }
        held.0 = Some(listener);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::sync::Arc;

    fn heard() -> (Listener, Arc<Mutex<Vec<Value>>>) {
        let got = Arc::new(Mutex::new(Vec::new()));
        let into = got.clone();
        (
            Arc::new(move |m: &Value| into.lock().unwrap().push(m.clone())),
            got,
        )
    }

    #[test]
    fn what_came_before_listening_is_told_first_in_order() {
        let listening = Listening::default();
        listening.tell(&json!({"n": 1}));
        listening.tell(&json!({"n": 2}));
        let (listener, got) = heard();
        listening.listen(listener);
        listening.tell(&json!({"n": 3}));
        let got: Vec<_> = got.lock().unwrap().iter().map(|m| m["n"].clone()).collect();
        assert_eq!(got, [json!(1), json!(2), json!(3)]);
    }

    #[test]
    fn only_the_latest_are_kept_while_no_one_listens() {
        let listening = Listening::default();
        for n in 0..EARLY_MOST + 3 {
            listening.tell(&json!({ "n": n }));
        }
        let (listener, got) = heard();
        listening.listen(listener);
        let got = got.lock().unwrap();
        assert_eq!(got.len(), EARLY_MOST);
        assert_eq!(got[0]["n"], 3);
    }
}
