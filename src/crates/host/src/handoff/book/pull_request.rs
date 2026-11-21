//! Which pull request a review names, moved out of book.rs (then handoffs.rs) for the
//! 300-line ratchet (#280).

/// The first pull request `text` links to, as 「owner/repo#n」 (#217).
pub fn pull_request(text: &str) -> Option<String> {
    text.match_indices("github.com/").find_map(|(at, found)| {
        let mut parts = text[at + found.len()..].split('/');
        let owner = parts.next()?;
        let repo = parts.next()?;
        if parts.next()? != "pull" {
            return None;
        }
        let number = parts
            .next()?
            .chars()
            .take_while(char::is_ascii_digit)
            .collect::<String>();
        let fine = |part: &str| {
            !part.is_empty()
                && part
                    .chars()
                    .all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.'))
        };
        (fine(owner) && fine(repo) && !number.is_empty()).then(|| {
            format!(
                "{}/{}#{number}",
                owner.to_ascii_lowercase(),
                repo.to_ascii_lowercase()
            )
        })
    })
}
