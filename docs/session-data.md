# Local session data

The broadcast snapshot is the HUD projection, not the history database. Its
`sessionScope: "recent"` includes sessions that are running/waiting or have
presentation activity within 24 hours. `totals`, provider session counts and
interval statistics still cover their complete canonical facts; they are not
recomputed from that smaller array.

The mounted Sessions page queries the same runtime with `sessions`:

```json
{ "scope": "recent", "offset": 0, "limit": 100, "rootsOnly": true }
```

`recent` lists seven days or sessions in flight; `active` lists 24 hours or
sessions in flight; explicit `all` includes retained indexed history. `source`
and `project` are exact filters; an omitted project means all, while `null`
selects unassigned sessions. Search matches the recorded ID, title, source,
model or project path. `parentId` selects direct children and overrides
`rootsOnly`. Sources/projects are facets of the scope and relationship filter,
before the source, project and search filters. Pages are ordered by presentation time
descending, then source, ID and path; limits default to 100 and cap at 200.

`turnBars: true` (the Sessions page) adds to each row what its card draws:
`turnCount`, `turnBars` (the newest 64 turns' new tokens by kind, the
sub-agents' part apart, the compacted turns; 15-minute periods for a log that
marks no prompts), `contextTokens` and `contextFill`. They come from the same
ledger breakdown as `session_detail` and are kept per session until one of its
logs, sub-agents' included, is read further, so a page of unchanged sessions
queries nothing again. Other lists (the HUD, MCP) leave them out.

`Session.updatedAt` is that presentation time: the latest authoritative source
event or active-child event, with the file's recorded update used only when no
authoritative event exists. Scope membership, ordering and non-running day
groups use this time. Raw checkpoint timestamps remain separate for ingestion
and duplicate resolution; this presentation rule does not change token accounting.

The response has `kind: "sessions"`, `revision`, `generatedAt`, `items`, `total`,
`nextOffset`, `sources` and `projects`. A changed revision restarts pagination
at offset zero; clients never combine pages from different revisions.
`sessionsRevision` changes for session facts, canonical selection and rolling
scope boundaries, independently of the snapshot clock. Hidden Sessions windows
stop querying and retain their last display. Partially loaded list summaries
are labelled as covering loaded sessions.

## Claude Code processes that have gone (#251)

Claude Code registers each live process in `sessions/<pid>.json` under its
config home: its pid, when it started (`procStart`, UTC) and the session it
runs. It removes the file as it exits cleanly; a process killed outright
(`kill -9`, a crash) leaves the file behind. Every look (3 s) and collection
pass reads the registry, a file again only when it changed, and asks the
platform layer whether each pid still runs the process that started when the
file says (macOS: signal 0 and the process's start time; Linux: signal 0;
Windows: every process counts as running).

A Claude session a file named whose process has gone (the file left, or its
pid no longer runs) is idle, with no requests or attention, unless something
happened in it after the process went. A session no file ever named keeps the
transcript's 30 minutes: a terminal session may not register before its first
reply, so the absence of a file is no sign of an ended session.

A permission hook (`PostPane --permission-hook`) waiting on the HUD stops
waiting once the process that ran it is gone (launchd took it in), so its
card leaves the sidebar within a second instead of the approval wait.

`session_detail {id}` loads only the requested parser checkpoint and returns
its session, recorded usage entries, parent and children, including relationships
outside the HUD projection. With the usage ledger it also returns `sessionUsage`,
the same breakdown as agent-hud-native-open's `SessionUsage` for a host to publish:
every model and each model's 15-minute periods by agent id, the sub-agents' part
and the kept turns, with times in milliseconds and money as exact decimal
strings. For a requested `turn`, `turnCalls` lists that turn's calls
(each with the `log` it was recorded in) and `agents`: the sub-agents with calls
in it, each with its log, name and type (Claude Code's `agent-*.meta.json`
beside the log, else the log's title), the log that started it, when it began
and was last heard from, and whether it still runs. The session page draws them
as the turn's sub-agent timeline. Existing content stays visible while that session's
facts refresh; unrelated snapshots do not re-read a cold detail. These queries
use committed local facts and do not start collection or provider requests.
Local MCP exposes the same queries as `hud_sessions` and `hud_session`. Synthetic
responses are available only after explicit `--demo`; failures never activate
sample data.

## Claude cloud sessions

Sessions that run on Anthropic's servers leave no transcript on this computer.
The `claude-cloud` account reader (`src/crates/agents/src/claude/cloud.rs`)
lists them every 60 s from `api.anthropic.com/v1/sessions` with Claude Code's
own sign-in (the `Claude Code-credentials` keychain item, read through
`/usr/bin/security`) and the `ccr-byoc-2025-07-29` beta header. Only
`environment_kind: anthropic_cloud` sessions that are `running`, or whose
`status_bucket` is `blocked` (waiting on the user), come back; a session this
computer runs with Remote Control is listed as `bridge` and is read from its
transcript instead. They reach the snapshot as `Reading.live_sessions` →
`AccountProjection.live_sessions`, are added to `sessions` (and found by
`session_detail`) only while the reading is good, and are never written to the
usage ledger, so Statistics does not list them. Their rows carry
`client: "claude-cloud"` and a `claude-cloud-session` navigation target that
opens `https://claude.ai/code/<id>`.
