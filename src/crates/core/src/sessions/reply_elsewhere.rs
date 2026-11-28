//! Cards whose next step is done in another Claude session (owner,
//! 2026-11-28, 「丙」). Such a session has finished; what it asks of the owner
//! belongs to the session it links to. When that session stands on the
//! sidebar as a card already, the words go on that card (`forwardedFrom`)
//! and this one is not shown; otherwise this one points there
//! (`elsewhere`), with no answer to give here.
use agent_hud_agents::transcript::{
    elsewhere::{elsewhere, forwarded_note},
    live::DesktopAsk,
};
use serde_json::{json, Value};
use std::collections::{HashMap, HashSet};

/// A card about to stand: its key, its session, that session's title, and
/// what it asks.
pub(crate) struct Standing<'a> {
    pub key: &'a str,
    pub session: &'a str,
    pub title: &'a str,
    pub ask: &'a DesktopAsk,
}

/// What becomes of one card.
#[derive(Debug, PartialEq, Eq)]
pub(crate) enum Route {
    /// Shown as it is.
    Keep,
    /// Not shown: its words are on the other session's card, or the owner
    /// has spoken in that session since.
    Gone,
    /// Shown as a pointer to the other session; `session` is None when that
    /// session is not on the sidebar any more.
    Point {
        session: Option<String>,
        title: String,
    },
}

/// The other session `ask` sends the owner to, by its desktop tab: only a
/// next step with no answer offered here (a box the session put buttons on
/// stays as it is).
fn link_of(ask: &DesktopAsk) -> Option<agent_hud_agents::transcript::elsewhere::Elsewhere> {
    let kind = ask.kind.as_str();
    if !(kind == "reply" || kind == "next_step") || !ask.options.is_empty() {
        return None;
    }
    elsewhere(&ask.question)
}

/// Each card's route, and the notes each card carries from cards folded into
/// it (by index). `tab_session` finds the session a desktop tab holds;
/// `listed` is each session on the sidebar with when its latest turn
/// started; `forwarded` keeps the keys of cards once folded into another, so
/// they stay away after that card is answered.
pub(crate) fn route(
    cards: &[Standing],
    tab_session: impl Fn(&str) -> Option<String>,
    listed: &HashMap<String, i64>,
    forwarded: &mut HashSet<String>,
) -> (Vec<Route>, HashMap<usize, Vec<Value>>) {
    let links = cards
        .iter()
        .map(|card| {
            let link = link_of(card.ask)?;
            let target = tab_session(&link.tab);
            // A link back to its own session is no other session.
            (target.as_deref() != Some(card.session)).then_some((link, target))
        })
        .collect::<Vec<_>>();
    // The first card each session stands as, not counting pointers.
    let mut first_card = HashMap::new();
    for (index, card) in cards.iter().enumerate() {
        if links[index].is_none() {
            first_card.entry(card.session).or_insert(index);
        }
    }
    let mut notes: HashMap<usize, Vec<Value>> = HashMap::new();
    let routes = cards
        .iter()
        .zip(links)
        .map(|(card, link)| {
            let Some((link, target)) = link else {
                return Route::Keep;
            };
            if let Some(&into) = target.as_deref().and_then(|t| first_card.get(t)) {
                forwarded.insert(card.key.to_owned());
                notes.entry(into).or_default().push(json!({
                    "sessionId": card.session,
                    "title": card.title,
                    "note": forwarded_note(&card.ask.question),
                }));
                return Route::Gone;
            }
            let started = target.as_deref().and_then(|t| listed.get(t));
            if forwarded.contains(card.key) || started.is_some_and(|&at| at > card.ask.at) {
                return Route::Gone;
            }
            Route::Point {
                session: target.filter(|_| started.is_some()),
                title: link.title,
            }
        })
        .collect();
    (routes, notes)
}

#[cfg(test)]
mod tests {
    use super::*;

    const NEXT: &str = "到[规则更新](#local_rules)回话。推荐回\"只合并\"。";

    fn ask(kind: &str, question: &str, at: i64) -> DesktopAsk {
        DesktopAsk {
            id: format!("{kind}:{at}"),
            response: None,
            kind: kind.into(),
            question: question.into(),
            recap: None,
            options: Vec::new(),
            at,
            offset: None,
        }
    }

    fn tabs(tab: &str) -> Option<String> {
        (tab == "local_rules").then(|| "rules-session".to_owned())
    }

    #[test]
    fn a_step_for_a_session_with_a_card_goes_onto_that_card() {
        let source = ask("reply", NEXT, 100);
        let target = ask("next_step", "回『合并并装』或『只合并』。", 90);
        let cards = [
            Standing {
                key: "a",
                session: "multi",
                title: "多模型协同",
                ask: &source,
            },
            Standing {
                key: "b",
                session: "rules-session",
                title: "规则更新",
                ask: &target,
            },
        ];
        let listed = HashMap::from([("multi".into(), 50), ("rules-session".into(), 40)]);
        let mut forwarded = HashSet::new();
        let (routes, notes) = route(&cards, tabs, &listed, &mut forwarded);
        assert_eq!(routes, [Route::Gone, Route::Keep]);
        assert_eq!(notes[&1][0]["sessionId"], "multi");
        assert_eq!(notes[&1][0]["note"], "推荐回\"只合并\"。");
        assert!(forwarded.contains("a"));
        // That card answered and gone, this one stays away.
        let (routes, notes) = route(&cards[..1], tabs, &listed, &mut forwarded);
        assert_eq!(routes, [Route::Gone]);
        assert!(notes.is_empty());
    }

    #[test]
    fn a_step_for_a_session_without_a_card_points_there() {
        let source = ask("reply", NEXT, 100);
        let cards = [Standing {
            key: "a",
            session: "multi",
            title: "多模型协同",
            ask: &source,
        }];
        let mut listed = HashMap::from([("multi".into(), 50), ("rules-session".into(), 40)]);
        let (routes, _) = route(&cards, tabs, &listed, &mut HashSet::new());
        assert_eq!(
            routes,
            [Route::Point {
                session: Some("rules-session".into()),
                title: "规则更新".into()
            }]
        );
        // The owner has spoken there since: put away.
        listed.insert("rules-session".into(), 120);
        assert_eq!(
            route(&cards, tabs, &listed, &mut HashSet::new()).0,
            [Route::Gone]
        );
        // That session not on the sidebar, or its tab unknown: gone from here.
        listed.remove("rules-session");
        assert_eq!(
            route(&cards, tabs, &listed, &mut HashSet::new()).0,
            [Route::Point {
                session: None,
                title: "规则更新".into()
            }]
        );
        assert_eq!(
            route(&cards, |_| None, &listed, &mut HashSet::new()).0,
            [Route::Point {
                session: None,
                title: "规则更新".into()
            }]
        );
    }

    #[test]
    fn other_cards_stay_as_they_are() {
        let plain = ask("reply", "回『合并』。", 100);
        let mut buttons = ask("next_step", NEXT, 100);
        buttons
            .options
            .push(agent_hud_agents::transcript::live::DesktopAskOption {
                label: "只合并".into(),
                message: None,
            });
        let own = ask("reply", "到[规则更新](#local_rules)回话。", 100);
        let cards = [
            Standing {
                key: "a",
                session: "multi",
                title: "",
                ask: &plain,
            },
            Standing {
                key: "b",
                session: "multi",
                title: "",
                ask: &buttons,
            },
            Standing {
                key: "c",
                session: "rules-session",
                title: "",
                ask: &own,
            },
        ];
        let (routes, notes) = route(&cards, tabs, &HashMap::new(), &mut HashSet::new());
        assert_eq!(routes, [Route::Keep, Route::Keep, Route::Keep]);
        assert!(notes.is_empty());
    }
}
