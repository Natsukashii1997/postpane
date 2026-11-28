//! A next step done in another Claude session (owner, 2026-11-28, 「丙」):
//! 「到[规则更新｜…](#local_…)回话」. The session that says it has finished; the
//! card belongs to the session it links to, so the sidebar puts its words on
//! that session's card, or points the owner there, instead of asking for an
//! answer here.

/// The other session a next step sends the owner to: its desktop tab id
/// (`local_…`) and the title the link shows.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Elsewhere {
    pub tab: String,
    pub title: String,
}

/// Each session link in `text`: `[title](#local_…)`, where it starts and ends.
fn links(text: &str) -> Vec<(usize, usize, Elsewhere)> {
    let mut found = Vec::new();
    let mut from = 0;
    while let Some(at) = text[from..].find("](#local_").map(|at| from + at) {
        let id_start = at + "](#".len();
        let id_end = text[id_start..]
            .find(|c: char| !(c.is_ascii_alphanumeric() || c == '-' || c == '_'))
            .map_or(text.len(), |end| id_start + end);
        let open = text[from..at].rfind('[').map(|open| from + open);
        match (open, text[id_end..].starts_with(')')) {
            (Some(open), true) if id_end > id_start + "local_".len() => {
                let title = text[open + 1..at].trim().to_owned();
                found.push((
                    open,
                    id_end + 1,
                    Elsewhere {
                        tab: text[id_start..id_end].to_owned(),
                        title,
                    },
                ));
                from = id_end + 1;
            }
            _ => from = id_start,
        }
    }
    found
}

/// The other session `next` sends the owner to: its first session link.
pub fn elsewhere(next: &str) -> Option<Elsewhere> {
    links(next).into_iter().next().map(|(_, _, link)| link)
}

/// `text` with each session link shown as 「title」, not as its markup.
pub fn plain_links(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    let mut last = 0;
    for (start, end, link) in links(text) {
        out.push_str(&text[last..start]);
        out.push('「');
        out.push_str(&link.title);
        out.push('」');
        last = end;
    }
    out.push_str(&text[last..]);
    out
}

/// What the other session's card shows of `next`: its words without the
/// first sentence that only says where to go (「到「X」回话。」), which that
/// card already is; the whole step when nothing else is left.
pub fn forwarded_note(next: &str) -> String {
    let plain = plain_links(next);
    let Some(link) = elsewhere(next) else {
        return plain;
    };
    if let Some((first, rest)) = plain.split_once('。') {
        let rest = rest.trim();
        if first.contains(&format!("「{}」", link.title)) && !rest.is_empty() {
            return rest.to_owned();
        }
    }
    plain
}

#[cfg(test)]
mod tests {
    use super::*;

    const NEXT: &str = "到[规则更新｜卡兹克 CLAUDE.md 采纳项复评与落地](#local_6b5ed248-b52b-4bf5-b998-a0ee501dc773)回话。推荐回\"只合并\"，先不装机。想一步到位就回\"合并并装\"。";

    #[test]
    fn a_next_step_names_the_session_it_links_to() {
        let link = elsewhere(NEXT).unwrap();
        assert_eq!(link.tab, "local_6b5ed248-b52b-4bf5-b998-a0ee501dc773");
        assert_eq!(link.title, "规则更新｜卡兹克 CLAUDE.md 采纳项复评与落地");
        assert_eq!(elsewhere("回『合并』。"), None);
        // A web link or a link to a file is not a session.
        assert_eq!(elsewhere("看 [PR](https://github.com/x/y/pull/1)。"), None);
        assert_eq!(elsewhere("[坏](#local_)"), None);
    }

    #[test]
    fn a_session_link_is_shown_as_its_title() {
        assert!(plain_links(NEXT)
            .starts_with("到「规则更新｜卡兹克 CLAUDE.md 采纳项复评与落地」回话。"));
        assert!(!plain_links(NEXT).contains("#local_"));
        assert_eq!(plain_links("回『合并』。"), "回『合并』。");
        assert_eq!(
            plain_links("[甲](#local_a1)和[乙](#local_b2)"),
            "「甲」和「乙」"
        );
    }

    #[test]
    fn the_note_leaves_out_where_to_go() {
        assert_eq!(
            forwarded_note(NEXT),
            "推荐回\"只合并\"，先不装机。想一步到位就回\"合并并装\"。"
        );
        // Nothing else said: the whole step stays.
        assert_eq!(forwarded_note("到[甲](#local_a1)回话。"), "到「甲」回话。");
        // The link not in the first sentence: nothing is cut.
        assert_eq!(
            forwarded_note("先看 PR。再到[甲](#local_a1)回话。"),
            "先看 PR。再到「甲」回话。"
        );
    }
}
