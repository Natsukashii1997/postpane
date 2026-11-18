import { test } from "node:test";
import assert from "node:assert/strict";
import {
  noAnswer,
  settled,
  shownAnswer,
  type PanelAnswer,
} from "../src/panel-answers.ts";

test("a section keeps the last answer to its query while the next revision's is asked", () => {
  const base = JSON.stringify(["statistics", { providers: ["antigravity"] }]);
  const key = (revision: number) =>
    JSON.stringify(["statistics", revision, { providers: ["antigravity"] }]);
  const answer = (
    revision: number,
    order: number,
    tokens: number | null,
  ): PanelAnswer<number> => ({
    key: key(revision),
    base,
    order,
    data: tokens,
    error: null,
  });
  assert.deepEqual(
    shownAnswer(noAnswer, key(1), base),
    { data: null, error: null },
    "nothing before the first answer",
  );
  let kept: PanelAnswer<number> = noAnswer;
  kept = settled(kept, answer(1, 1, 500));
  assert.equal(shownAnswer(kept, key(1), base).data, 500);
  // Core moved on twice before revision 2's answer came: revision 1's stays.
  assert.equal(shownAnswer(kept, key(3), base).data, 500);
  // Revision 2's answer comes after revision 3 was asked: it still counts.
  kept = settled(kept, answer(2, 2, 520));
  assert.equal(shownAnswer(kept, key(3), base).data, 520);
  kept = settled(kept, answer(3, 3, 530));
  // A late answer to a query asked earlier does not replace a newer one.
  kept = settled(kept, answer(2, 2, 520));
  assert.equal(shownAnswer(kept, key(3), base).data, 530);
  // Other parameters never show this answer.
  const codex = { providers: ["codex"] };
  assert.equal(
    shownAnswer(
      kept,
      JSON.stringify(["statistics", 3, codex]),
      JSON.stringify(["statistics", codex]),
    ).data,
    null,
  );
  // An error belongs to its own query only.
  kept = settled(kept, {
    ...answer(4, 4, null),
    error: "Statistics could not be read",
  });
  assert.deepEqual(shownAnswer(kept, key(4), base), {
    data: null,
    error: "Statistics could not be read",
  });
  assert.equal(shownAnswer(kept, key(5), base).error, null);
});
