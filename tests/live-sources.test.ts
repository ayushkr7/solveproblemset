import { test } from "node:test";
import assert from "node:assert/strict";
import { NotEnoughRatedError, buildProblemSet, countByDifficulty, pickByRating, validateRating } from "../src/lib/generate";
import { cachedLoader } from "../src/lib/sources/cache";
import {
  CF_QUALITY,
  CF_RATINGS,
  codeforcesCatalog,
  isRegularRound,
  ratingDifficulty,
  type CfContest,
  type CfProblem,
  type CfProblemStatistics,
} from "../src/lib/sources/codeforces";
import { leetCodeCatalog, type LcQuestion } from "../src/lib/sources/leetcode";
import type { CatalogProblem } from "../src/lib/types";

// --- Codeforces -------------------------------------------------------------

const MODERN = CF_QUALITY.sinceEpochSeconds + 86_400;
const contest = (id: number, name: string, start = MODERN): CfContest => ({ id, name, phase: "FINISHED", startTimeSeconds: start });

test("Codeforces: regular rated rounds only", () => {
  for (const name of [
    "Codeforces Round 1000 (Div. 2)",
    "Educational Codeforces Round 170 (Rated for Div. 2)",
    "Codeforces Global Round 27",
    "CodeTON Round 9 (Div. 1 + Div. 2, Rated, Prizes!)",
    "Good Bye 2024: 2025 is NEAR",
    "Hello 2025",
    "Pinely Round 4 (Div. 1 + Div. 2)",
    "Refact.ai Match 1 (Codeforces Round 985)",
  ]) assert.ok(isRegularRound(name), name);
  for (const name of [
    "April Fools Day Contest 2024",
    "Kotlin Heroes: Episode 11",
    "2024-2025 ICPC, NERC, Northern Eurasia Onsite (Unrated, Online Mirror, ICPC Rules, Teams Preferred)",
    "Testing Round 1001",
    "Microsoft Q# Coding Contest - Summer 2020",
    "Unknown Language Round 1",
  ]) assert.ok(!isRegularRound(name), name);
});

test("Codeforces: rating → difficulty tier", () => {
  assert.deepEqual([800, 1100, 1200, 1700, 1800, 3500].map(ratingDifficulty), ["easy", "easy", "medium", "medium", "hard", "hard"]);
  assert.equal(CF_RATINGS[0], 800);
  assert.equal(CF_RATINGS.at(-1), 3500);
  assert.equal(CF_RATINGS.length, 28);
});

test("Codeforces: catalog keeps rated problems from regular modern rounds, minus the least-solved quarter", () => {
  const contests = [
    contest(2000, "Codeforces Round 970 (Div. 2)"),
    contest(1999, "Educational Codeforces Round 168 (Rated for Div. 2)"),
    contest(500, "Codeforces Round 285 (Div. 2)", CF_QUALITY.sinceEpochSeconds - 1), // too old
    contest(1998, "April Fools Day Contest 2024"),
    { ...contest(2001, "Codeforces Round 971 (Div. 4)"), phase: "BEFORE" },
  ];
  const p = (contestId: number, index: string, rating: number | undefined, tags: string[] = ["greedy"], type = "PROGRAMMING"): CfProblem => ({
    contestId, index, name: `P ${contestId}${index}`, type, rating, tags,
  });
  const problems: CfProblem[] = [
    p(2000, "A", 800, ["math", "greedy", "brute force", "sortings"]),
    p(2000, "B", 800),
    p(1999, "A", 800),
    p(1999, "B", 800), // least solved at 800 → dropped
    p(2000, "C", 1300),
    p(2000, "D", undefined), // unrated
    p(2000, "E", 1500, ["*special", "dp"]),
    p(2000, "F", 1500, ["dp"], "QUESTION"),
    p(500, "A", 800), // old contest
    p(1998, "A", 800), // April Fools
    p(2001, "A", 800), // unfinished contest
  ];
  const solved: Record<string, number> = { "2000A": 5000, "2000B": 4000, "1999A": 3000, "1999B": 100, "2000C": 900 };
  const stats: CfProblemStatistics[] = problems.map((x) => ({ contestId: x.contestId, index: x.index, solvedCount: solved[`${x.contestId}${x.index}`] ?? 9999 }));

  const catalog = codeforcesCatalog({ problems, problemStatistics: stats }, contests);
  assert.deepEqual(catalog.map((c) => c.id), ["cf-2000A", "cf-2000B", "cf-1999A", "cf-2000C"], "rating, then newest contest first");
  assert.deepEqual(catalog.map((c) => c.order), [1, 2, 3, 4]);
  const first = catalog[0]!;
  assert.equal(first.url, "https://codeforces.com/problemset/problem/2000/A");
  assert.equal(first.rating, 800);
  assert.equal(first.difficulty, "easy");
  assert.equal(first.topic, "math, greedy, brute force", "at most three tags");
  assert.equal(first.leetCodeUrl, null);
  assert.equal(catalog[3]!.difficulty, "medium");
});

// --- LeetCode ---------------------------------------------------------------

const q = (n: number, over: Partial<LcQuestion> = {}): LcQuestion => ({
  questionFrontendId: String(n),
  title: `Q${n}`,
  titleSlug: `q-${n}`,
  difficulty: "Medium",
  isPaidOnly: false,
  likes: 2000,
  dislikes: 100,
  topicTags: [{ name: "Array" }, { name: "Hash Table" }, { name: "Sorting" }, { name: "Greedy" }],
  ...over,
});

test("LeetCode: free, well-liked problems only, in LeetCode's numbering", () => {
  const catalog = leetCodeCatalog([
    q(10),
    q(2, { difficulty: "Easy" }),
    q(3, { isPaidOnly: true }),
    q(4, { likes: 499, dislikes: 0 }), // too few likes
    q(5, { likes: 1000, dislikes: 251 }), // 79.9% positive
    q(6, { likes: 1000, dislikes: 250, difficulty: "Hard" }), // exactly 80%
    q(7, { titleSlug: "q-10" }), // duplicate slug
    q(8, { titleSlug: "../evil" }),
    q(9, { difficulty: "Unknown" }),
  ]);
  assert.deepEqual(catalog.map((c) => c.id), ["q-2", "q-6", "q-10"]);
  assert.deepEqual(countByDifficulty(catalog), { easy: 1, medium: 1, hard: 1 });
  const p = catalog[0]!;
  assert.equal(p.url, "https://leetcode.com/problems/q-2/");
  assert.equal(p.leetCodeUrl, p.url, "the title already links to LeetCode, so the extra link isn't shown twice");
  assert.equal(p.topic, "Array, Hash Table, Sorting");
  assert.equal(p.rating, undefined);
});

// --- Picking by rating ------------------------------------------------------

function rated(perRating: Record<number, number>): CatalogProblem[] {
  let order = 0;
  return Object.entries(perRating).flatMap(([r, n]) =>
    Array.from({ length: n }, (_, i) => ({
      id: `${r}-${i}`, title: `${r}-${i}`, url: `https://codeforces.com/problemset/problem/1/${r}${i}`, leetCodeUrl: null,
      difficulty: ratingDifficulty(Number(r)), topic: "", order: ++order, rating: Number(r),
    })),
  );
}
const ratingsOf = (ps: CatalogProblem[]) => ps.map((p) => p.rating);

test("pickByRating spreads the count evenly over the range, lowest first", () => {
  const pool = rated({ 1100: 20, 1200: 20, 1300: 20, 1400: 20, 1500: 20, 1600: 20, 1700: 20 });
  assert.deepEqual(ratingsOf(pickByRating(pool, { min: 1200, max: 1600, count: 10 })), [1200, 1200, 1300, 1300, 1400, 1400, 1500, 1500, 1600, 1600]);
  assert.deepEqual(ratingsOf(pickByRating(pool, { min: 1200, max: 1600, count: 3 })), [1200, 1400, 1600], "fewer problems than ratings: evenly spaced");
  assert.deepEqual(ratingsOf(pickByRating(pool, { min: 1400, max: 1400, count: 4 })), [1400, 1400, 1400, 1400]);
  const seven = pickByRating(pool, { min: 1200, max: 1600, count: 7 });
  assert.equal(new Set(seven.map((p) => p.id)).size, 7, "no repeats");
});

test("pickByRating tops up a short rating from the others; too few overall is an error", () => {
  const pool = [...rated({ 800: 1, 900: 10 }), { ...rated({ 1000: 1 })[0]!, rating: undefined }];
  assert.deepEqual(ratingsOf(pickByRating(pool, { min: 800, max: 900, count: 6 })), [800, 900, 900, 900, 900, 900]);
  assert.throws(() => pickByRating(pool, { min: 800, max: 900, count: 12 }), NotEnoughRatedError);
  assert.throws(() => pickByRating(pool, { min: 1000, max: 1000, count: 1 }), /Only 0 problems rated 1000/, "unrated problems never match");
});

test("validateRating", () => {
  assert.deepEqual(validateRating({ min: 800, max: 1200, count: 5 }, 100), {});
  assert.match(validateRating({ min: 1300, max: 1200, count: 5 }).rating ?? "", /lowest rating/);
  assert.match(validateRating({ min: 800, max: 800, count: 0 }).count ?? "", /1 or more/);
  assert.match(validateRating({ min: 800, max: 800, count: 2.5 }).count ?? "", /whole number/);
  assert.match(validateRating({ min: 800, max: 800, count: 51 }).count ?? "", /At most 50/);
  assert.equal(validateRating({ min: 1200, max: 1600, count: 9 }, 8).count, "Only 8 problems rated 1200–1600 available.");
});

test("sets built from Codeforces keep each problem's rating", () => {
  const picked = pickByRating(rated({ 800: 3, 1900: 3 }), { min: 800, max: 1900, count: 2 });
  const set = buildProblemSet({ name: "CF", sheetId: "codeforces", counts: countByDifficulty(picked) }, picked, 0);
  assert.deepEqual(set.problems.map((p) => [p.rating, p.difficulty]), [[800, "easy"], [1900, "hard"]]);
  assert.deepEqual(set.requested, { easy: 1, medium: 0, hard: 1 });
  const lc = buildProblemSet({ name: "LC", sheetId: "leetcode", counts: { easy: 1, medium: 0, hard: 0 } }, leetCodeCatalog([q(1, { difficulty: "Easy" })]), 0);
  assert.equal(lc.problems[0]!.rating, null);
});

// --- Server cache -----------------------------------------------------------

test("cachedLoader: fresh hits, stale-while-revalidate, failures keep the last good list", async () => {
  let t = 0;
  let calls = 0;
  let fail = false;
  const get = cachedLoader(
    async () => {
      calls++;
      if (fail) throw new Error("down");
      return calls;
    },
    { ttlMs: 100, retryMs: 50, now: () => t },
  );
  const tick = () => new Promise((r) => setImmediate(r));

  await assert.rejects(cachedLoader(async () => { throw new Error("down"); }, { ttlMs: 1 })(), /down/, "nothing cached yet: the error surfaces");

  const [a, b] = await Promise.all([get(), get()]);
  assert.equal(a.value, 1);
  assert.equal(b.value, 1);
  assert.equal(calls, 1, "concurrent first requests share one upstream fetch");

  t = 99;
  assert.equal((await get()).value, 1);
  assert.equal(calls, 1, "fresh: no refetch");

  t = 150;
  assert.equal((await get()).value, 1, "stale: the last list is served at once…");
  await tick();
  assert.equal(calls, 2, "…while one refresh runs");
  assert.equal((await get()).value, 2);

  t = 300;
  fail = true;
  assert.equal((await get()).value, 2);
  await tick();
  assert.equal(calls, 3);
  t = 320;
  assert.equal((await get()).value, 2, "refresh failed: still served");
  await tick();
  assert.equal(calls, 3, "and not retried before retryMs");
  t = 360;
  fail = false;
  await get();
  await tick();
  assert.equal(calls, 4);
  assert.equal((await get()).value, 4);
});
