import { test } from "node:test";
import assert from "node:assert/strict";
import { A2Z_PROBLEMS } from "../src/data/a2zproblemset";
import { NEETCODE_BLIND_75_PROBLEMS } from "../src/data/neetcodeBlind75";
import { fromBlind75, fromStriverSheet } from "../src/data/problems";
import { STRIVER_180_PROBLEMS } from "../src/data/striver180problemset";
import { buildProblemSet, countByDifficulty, pickProblems, usedProblemMatcher } from "../src/lib/generate";
import type { CatalogProblem } from "../src/lib/types";

const SHEETS: [name: string, problems: CatalogProblem[], total: number, counts: [number, number, number], site: string][] = [
  ["Striver A2Z", fromStriverSheet(A2Z_PROBLEMS), 431, [51, 272, 108], "https://takeuforward.org/practice/dsa/"],
  ["Striver 180", fromStriverSheet(STRIVER_180_PROBLEMS), 179, [3, 107, 69], "https://takeuforward.org/practice/dsa/"],
  ["Blind 75", fromBlind75(NEETCODE_BLIND_75_PROBLEMS), 75, [19, 49, 7], "https://neetcode.io/problems/"],
];

for (const [name, problems, total, [easy, medium, hard], site] of SHEETS) {
  test(`${name}: every problem from the source file, in sheet order`, () => {
    assert.equal(problems.length, total);
    assert.deepEqual(countByDifficulty(problems), { easy, medium, hard });
    assert.deepEqual(problems.map((p) => p.order), problems.map((_, i) => i + 1));
    assert.ok(problems.every((p) => p.url.startsWith(site)), "title links to the sheet's own practice page");
    assert.ok(problems.every((p) => p.leetCodeUrl === null || p.leetCodeUrl.startsWith("https://leetcode.com/")));
  });

  test(`${name}: problem ids are unique and non-empty`, () => {
    const ids = problems.map((p) => p.id);
    assert.ok(ids.every((id) => id.length > 0));
    assert.equal(new Set(ids).size, ids.length);
  });
}

test("Blind 75 ids are LeetCode slugs; Striver ids are takeUforward slugs", () => {
  assert.equal(fromBlind75(NEETCODE_BLIND_75_PROBLEMS)[0]!.id, "contains-duplicate");
  assert.equal(fromStriverSheet(STRIVER_180_PROBLEMS)[1]!.id, "kadane's-algorithm");
});

test("used-problem matcher: same id, or an older set's LeetCode link", () => {
  const s180 = fromStriverSheet(STRIVER_180_PROBLEMS);
  const undirected = s180.find((p) => p.title === "Detect a cycle in an undirected graph")!;
  const directed = s180.find((p) => p.title === "Detect a cycle in a directed graph")!;
  assert.equal(undirected.leetCodeUrl, directed.leetCodeUrl, "fixture: two problems share one LeetCode link");

  // A set made today stores the TUF link: only that exact problem counts as used.
  const today = buildProblemSet({ name: "x", sheetId: "striver-180", counts: { easy: 0, medium: 1, hard: 0 } }, [undirected], 0);
  const isUsed = usedProblemMatcher(today.problems);
  assert.ok(isUsed(undirected));
  assert.ok(!isUsed(directed), "sharing a LeetCode link doesn't make another problem used");

  // A set from the old bundled catalog linked straight to LeetCode, with a LeetCode-slug id.
  const legacy = usedProblemMatcher([{ id: "two-sum", url: "https://leetcode.com/problems/two-sum" }]);
  assert.ok(legacy(s180.find((p) => p.title === "Two Sum")!));
  assert.ok(!legacy(s180.find((p) => p.title === "3 Sum")!));
});

test("sets built from a source keep both links", () => {
  const b75 = fromBlind75(NEETCODE_BLIND_75_PROBLEMS);
  const set = buildProblemSet({ name: "x", sheetId: "neetcode-blind75", counts: { easy: 2, medium: 2, hard: 1 } }, pickProblems(b75, { easy: 2, medium: 2, hard: 1 }), 0);
  assert.equal(set.problems.length, 5);
  for (const p of set.problems) {
    assert.match(p.url, /^https:\/\/neetcode\.io\/problems\//);
    assert.match(p.leetCodeUrl ?? "", /^https:\/\/leetcode\.com\/problems\//);
  }
});
