# Shared format fixtures

Regression cases for the text this app writes: token and money formats, countdowns, quota text, model, plan and window names, session titles. The native Swift app, agent-hud-native-open at commit `014524c`, computed every `expected` value when this code was ported from it. PostPane no longer tracks that app (its parity ledger and the Swift oracle were removed in #389), so these cases now only keep the formats from changing by accident. The folder keeps its name because the tests read it by path.

## Layout

- `contracts/<name>.json` — one contract per file: the function family, which side of this app implements it (`owner`: `rust` or `ts`), the Swift source it came from, and its cases. Each case has a `name`, the Swift function (`fn`), its `args`, and `expected` per language (`en`, `zh`).
- `decisions.json`:
  - `improvements` — cases where this app intentionally writes something else, with its value (`next`, or `{en, zh}`) and the `reason`. An improvement equal to the `expected` value fails the run.
  - `gaps` — cases known not to match yet, keyed `contract/case` or `contract/case/language`. Empty today. A gap that starts passing fails the run until it is removed.

## Running

```sh
pnpm run test:ts                         # TypeScript-owned contracts, with the packages' tests
cargo test -p agent-hud-core --test parity   # Rust-owned contracts
```

Both are part of `pnpm test` and need nothing but this repository.

## Adding or changing cases

- A format changes on purpose: leave `expected` as it is and record the new value and the reason under `improvements` in `decisions.json`.
- A new case: write its `name`, `fn`, `args` and the `expected` this app should produce, in both languages.
