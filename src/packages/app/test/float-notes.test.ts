import { test } from "node:test";
import assert from "node:assert/strict";
import { watchFloatNotes } from "../src/lib/float-notes.ts";

/** A host whose answer to "are the notes showing" and whose events the test
 * hands out by hand. */
function host() {
  let answer!: (shown: boolean) => void;
  let heard: ((shown: boolean) => void) | null = null;
  let unlistened = false;
  return {
    bridge: {
      ask: () =>
        new Promise<boolean>((resolve) => {
          answer = resolve;
        }),
      follow: async (handler: (shown: boolean) => void) => {
        heard = handler;
        return () => {
          unlistened = true;
        };
      },
    },
    answer: (shown: boolean) => answer(shown),
    tell: (shown: boolean) => heard?.(shown),
    unlistened: () => unlistened,
  };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

test("a sidebar that reloads while the notes show lights the halo from the host's answer (#224)", async () => {
  const notes = host();
  const seen: boolean[] = [];
  watchFloatNotes(notes.bridge, (shown) => seen.push(shown));
  notes.answer(true);
  await settle();
  assert.deepEqual(seen, [true]);
});

test("notes the host hides on its own (the page's 收起) put the halo out", async () => {
  const notes = host();
  const seen: boolean[] = [];
  watchFloatNotes(notes.bridge, (shown) => seen.push(shown));
  notes.answer(true);
  await settle();
  notes.tell(false);
  assert.deepEqual(seen, [true, false]);
});

test("an answer that comes back after a newer event does not undo it", async () => {
  const notes = host();
  const seen: boolean[] = [];
  watchFloatNotes(notes.bridge, (shown) => seen.push(shown));
  await settle();
  notes.tell(false);
  notes.answer(true);
  await settle();
  assert.deepEqual(seen, [false]);
});

test("stopping the watch stops listening and drops a late answer", async () => {
  const notes = host();
  const seen: boolean[] = [];
  const stop = watchFloatNotes(notes.bridge, (shown) => seen.push(shown));
  await settle();
  stop();
  notes.answer(true);
  await settle();
  assert.equal(notes.unlistened(), true);
  assert.deepEqual(seen, []);
});
