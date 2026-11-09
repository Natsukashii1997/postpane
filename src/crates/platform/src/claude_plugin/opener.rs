//! Who began a Claude Code session's current turn (#258), read from the end
//! of its transcript in `<Claude's folder>/projects/*/<session>.jsonl`: the
//! person's own words, or words Agent HUD's plugin submitted. A relay counts
//! its rounds on while Claude works on words PostPane sent back, and from one
//! again once the person spoke up.
use super::valid_name;
use agent_hud_agents::claude::transcript::{claude_prompt, interrupted};
use agent_hud_agents::transcript::metering::date_ms;
use serde_json::Value;
use std::{
    fs,
    io::{Read, Seek, SeekFrom},
    path::{Path, PathBuf},
};

/// How much of a transcript's end is read for its turn's first words: a
/// turn longer than this is not told.
const REACH: u64 = 16 * 1024 * 1024;

/// Who began a turn.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Opener {
    /// The person's own words, typed in Claude (`origin.kind` human).
    Person,
    /// Words Agent HUD's plugin submitted, as it was given them.
    Plugin(String),
}

/// Who began `session`'s current turn and when (milliseconds), from the
/// transcript under `claude_config`; None when it cannot be told: no
/// transcript, no first words within reach, or words of someone else (a
/// task notification, a system line).
pub fn current_turn(claude_config: &Path, session: &str) -> Option<(Opener, i64)> {
    if !valid_name(session) {
        return None;
    }
    let file = transcript(claude_config, session)?;
    let tail = tail(&file)?;
    let prompt = tail
        .lines()
        .rev()
        .filter_map(|line| serde_json::from_str::<Value>(line).ok())
        .find(|value| {
            value["isSidechain"] != true && claude_prompt(value) && !interrupted(value)
        })?;
    let at = prompt["timestamp"].as_str().and_then(date_ms)?;
    let origin = &prompt["origin"];
    let opener = match origin["kind"].as_str()? {
        "human" => Opener::Person,
        "plugin" if origin["name"] == "agent-hud" => {
            Opener::Plugin(prompt["pluginPrompt"]["text"].as_str()?.to_owned())
        }
        _ => return None,
    };
    Some((opener, at))
}

/// The session's transcript: Claude Code keeps it in one folder per project.
fn transcript(claude_config: &Path, session: &str) -> Option<PathBuf> {
    let name = format!("{session}.jsonl");
    fs::read_dir(claude_config.join("projects"))
        .ok()?
        .flatten()
        .map(|folder| folder.path().join(&name))
        .find(|path| path.is_file())
}

/// The last `REACH` bytes, from the first whole line in them.
pub fn tail(file: &Path) -> Option<String> {
    let mut reader = fs::File::open(file).ok()?;
    let length = reader.metadata().ok()?.len();
    let start = length.saturating_sub(REACH);
    reader.seek(SeekFrom::Start(start)).ok()?;
    let mut bytes = Vec::new();
    reader.read_to_end(&mut bytes).ok()?;
    let text = String::from_utf8_lossy(&bytes).into_owned();
    if start == 0 {
        return Some(text);
    }
    text.split_once('\n').map(|(_, rest)| rest.to_owned())
}
