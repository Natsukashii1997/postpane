import { test } from "node:test";
import assert from "node:assert/strict";
import { relaysAnswering } from "../src/relays-answering.ts";

const relays = (...phases: string[]) =>
  relaysAnswering({
    handoffs: phases.map((phase, index) => ({ id: `h${index}`, phase })),
  } as never);

test("only relays ChatGPT is answering count as its work", () => {
  assert.equal(relays("working", "ended"), 1);
  assert.equal(relays("delivered", "sending"), 0);
  assert.equal(relays("replied", "returned", "failed"), 0);
  assert.equal(relaysAnswering({} as never), 0);
});
