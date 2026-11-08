import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// PricesPane.tsx cannot be imported under node --test (TSX); read the effect
// that loads the price list from its source. Its 30-day token counts come
// from the ledger, so the list is read again whenever the ledger changes
// (`statisticsRevision`), not only when the page opens (#265, upstream
// f3ba40a). `action` is App's stable `act`, so it alone never re-reads.
const source = readFileSync(
  new URL("../src/settings/PricesPane.tsx", import.meta.url),
  "utf8",
);

test("the price list is read again when the ledger changes", () => {
  const effect = source.match(
    /useEffect\(\(\) => \{\s*void load\(\);\s*\}, \[([^\]]*)\]\);/,
  );
  assert.ok(effect, "PricesPane loads its list in an effect");
  const deps = effect[1].split(",").map((dep) => dep.trim());
  assert.ok(deps.includes("snapshot.statisticsRevision"), effect[0]);
});
