//! Secrets out of diagnostic text before it is shown. What a client, a proxy
//! or a wrapper script writes when it fails may carry a credential: a Bearer
//! token, an Authorization header, an API key or a URL's token parameter.
//! The words around it stay as written; only the secret becomes `***`.

const HIDDEN: &str = "***";
/// URL parameters whose value is a secret, besides any `*_token`, `*_key`,
/// `*_secret` or `*_password`.
const PARAMETERS: [&str; 7] = [
    "token",
    "key",
    "secret",
    "password",
    "access_token",
    "api_key",
    "apikey",
];
/// The shortest run after `sk-` taken for an API key, so words such as
/// `sk-learn` stay.
const SHORTEST_KEY: usize = 16;
/// The shortest run after `Bearer ` taken for a token, so prose such as
/// "Bearer token rejected" stays readable.
const SHORTEST_BEARER: usize = 8;

/// `text` with every secret it carries replaced by `***`.
pub fn secrets(text: &str) -> String {
    let bytes = text.as_bytes();
    let mut out = String::with_capacity(text.len());
    let (mut copied, mut at) = (0, 0);
    while at < bytes.len() {
        let secret = if matches!(bytes[at], b'?' | b'&') {
            parameter(bytes, at)
        } else if word_start(bytes, at) {
            bearer(bytes, at)
                .or_else(|| authorization(bytes, at))
                .or_else(|| key(bytes, at))
        } else {
            None
        };
        match secret {
            // Every bound is next to an ASCII byte, so a char boundary.
            Some((start, end)) => {
                out.push_str(&text[copied..start]);
                out.push_str(HIDDEN);
                (copied, at) = (end, end);
            }
            None => at += 1,
        }
    }
    out.push_str(&text[copied..]);
    out
}

fn word_start(bytes: &[u8], at: usize) -> bool {
    at == 0 || !(bytes[at - 1].is_ascii_alphanumeric() || bytes[at - 1] == b'_')
}
fn starts_with_word(bytes: &[u8], at: usize, word: &str) -> bool {
    bytes
        .get(at..at + word.len())
        .is_some_and(|found| found.eq_ignore_ascii_case(word.as_bytes()))
}
fn run(bytes: &[u8], from: usize, take: impl Fn(u8) -> bool) -> usize {
    from + bytes[from..].iter().take_while(|byte| take(**byte)).count()
}
/// `Bearer <token>`: the token's span.
fn bearer(bytes: &[u8], at: usize) -> Option<(usize, usize)> {
    if !starts_with_word(bytes, at, "bearer") {
        return None;
    }
    let start = run(bytes, at + 6, |byte| matches!(byte, b' ' | b'\t'));
    let end = run(bytes, start, |byte| {
        byte.is_ascii_alphanumeric() || b"-._~+/=".contains(&byte)
    });
    (start > at + 6 && end - start >= SHORTEST_BEARER).then_some((start, end))
}
/// `Authorization: <value>` (a header, or a JSON or form field): the value's
/// span, to the end of its line, string or field.
fn authorization(bytes: &[u8], at: usize) -> Option<(usize, usize)> {
    if !starts_with_word(bytes, at, "authorization") {
        return None;
    }
    let quotes = |byte| matches!(byte, b'"' | b'\'');
    let spaces = |byte| matches!(byte, b' ' | b'\t');
    let mut next = run(bytes, at + 13, quotes);
    next = run(bytes, next, spaces);
    if !matches!(bytes.get(next), Some(b':' | b'=')) {
        return None;
    }
    next = run(bytes, next + 1, spaces);
    let start = next + usize::from(bytes.get(next).copied().is_some_and(quotes));
    let end = run(bytes, start, |byte| !b"\r\n\"',}&".contains(&byte));
    (end > start).then_some((start, end))
}
/// `sk-...`, `sk-ant-...`: the whole key's span.
fn key(bytes: &[u8], at: usize) -> Option<(usize, usize)> {
    if bytes.get(at..at + 3) != Some(b"sk-") {
        return None;
    }
    let end = run(bytes, at + 3, |byte| {
        byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_')
    });
    (end - (at + 3) >= SHORTEST_KEY).then_some((at, end))
}
/// `?name=value` or `&name=value` with a secret's name: the value's span.
fn parameter(bytes: &[u8], at: usize) -> Option<(usize, usize)> {
    let name_end = run(bytes, at + 1, |byte| {
        byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-' | b'.')
    });
    if bytes.get(name_end) != Some(&b'=') {
        return None;
    }
    let name = String::from_utf8_lossy(&bytes[at + 1..name_end]).to_ascii_lowercase();
    let secret = PARAMETERS.contains(&name.as_str())
        || ["_token", "_key", "_secret", "_password"]
            .iter()
            .any(|tail| name.ends_with(tail));
    if !secret {
        return None;
    }
    let start = name_end + 1;
    let end = run(bytes, start, |byte| {
        !byte.is_ascii_whitespace() && !b"&#\"'<>)],;".contains(&byte)
    });
    (end > start).then_some((start, end))
}

#[cfg(test)]
mod tests {
    use super::secrets;

    #[test]
    fn bearer_tokens_are_hidden_and_the_words_around_them_stay() {
        assert_eq!(
            secrets("401 from proxy: Bearer eyJhbGciOiJIUzI1NiJ9.e30.c2lnbmF0dXJl rejected"),
            "401 from proxy: Bearer *** rejected"
        );
        assert_eq!(
            secrets("bearer\tabcdefgh12345678"),
            "bearer\t***",
            "any case, any blank"
        );
        assert_eq!(
            secrets("Bearer token rejected"),
            "Bearer token rejected",
            "prose is not a token"
        );
    }

    #[test]
    fn authorization_values_are_hidden_to_the_end_of_their_field() {
        assert_eq!(
            secrets("sent Authorization: Basic dXNlcjpwYXNz\nthen 403"),
            "sent Authorization: ***\nthen 403"
        );
        assert_eq!(
            secrets(r#"{"authorization": "Bearer abc", "status": 401}"#),
            r#"{"authorization": "***", "status": 401}"#
        );
        assert_eq!(
            secrets("authorization failed"),
            "authorization failed",
            "the word alone is not a header"
        );
    }

    #[test]
    fn api_keys_are_hidden_whole() {
        assert_eq!(
            secrets("invalid x-api-key sk-ant-api03-AbCdEf0123456789_xyz-Q (401)"),
            "invalid x-api-key *** (401)"
        );
        assert_eq!(
            secrets("OPENAI_API_KEY=sk-proj-0123456789abcdefABCDEF"),
            "OPENAI_API_KEY=***"
        );
        assert_eq!(secrets("needs sk-learn"), "needs sk-learn");
        assert_eq!(
            secrets("task-0123456789abcdefgh"),
            "task-0123456789abcdefgh"
        );
    }

    #[test]
    fn secret_url_parameters_keep_their_name_and_lose_their_value() {
        assert_eq!(
            secrets("GET https://api.example.com/v1/usage?account=me&access_token=abc123&API_KEY=zzz#top failed"),
            "GET https://api.example.com/v1/usage?account=me&access_token=***&API_KEY=***#top failed"
        );
        assert_eq!(
            secrets("(see https://x.test/cb?code=1&token=t0k3n&secret=s&password=p&refresh_token=r&client_secret=c)"),
            "(see https://x.test/cb?code=1&token=***&secret=***&password=***&refresh_token=***&client_secret=***)"
        );
        assert_eq!(secrets("https://x.test/?token="), "https://x.test/?token=");
        assert_eq!(
            secrets("https://x.test/?monkey=1"),
            "https://x.test/?monkey=1"
        );
    }

    #[test]
    fn text_without_secrets_stays_as_written() {
        for text in [
            "boom",
            "",
            "引擎没有在 40 秒内返回用量",
            "Claude Code 引擎查询失败：令牌 sk-ant-api03-AbCdEf0123456789 已失效",
        ] {
            let expected = text.replace("sk-ant-api03-AbCdEf0123456789", "***");
            assert_eq!(secrets(text), expected);
        }
    }
}
