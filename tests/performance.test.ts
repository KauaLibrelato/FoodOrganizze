import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { groupByKey } from "../lib/data-helpers.ts";

test("groupByKey groups repeated keys without dropping items", () => {
  const grouped = groupByKey(
    [
      { id: "1", recipeId: "bolo" },
      { id: "2", recipeId: "brownie" },
      { id: "3", recipeId: "bolo" },
    ],
    (item) => item.recipeId,
  );

  assert.deepEqual(grouped.get("bolo")?.map((item) => item.id), ["1", "3"]);
  assert.deepEqual(grouped.get("brownie")?.map((item) => item.id), ["2"]);
});

test("quote export libraries are loaded dynamically after user action", () => {
  const source = readFileSync(new URL("../lib/client/quote-export.ts", import.meta.url), "utf8");

  assert.doesNotMatch(source, /^import\s+html2canvas\s+from\s+["']html2canvas["'];/m);
  assert.doesNotMatch(source, /^import\s+\{\s*jsPDF\s*\}\s+from\s+["']jspdf["'];/m);
  assert.match(source, /import\(["']html2canvas["']\)/);
  assert.match(source, /import\(["']jspdf["']\)/);
});
