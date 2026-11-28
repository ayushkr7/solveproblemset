import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildCustomSheet,
  deleteCustomSheet,
  getCustomSheets,
  parseCustomSheetRecord,
  saveCustomSheet,
} from "../src/lib/custom-sheets";
import { readDriveCustomSheet } from "../src/lib/drive/transfer";
import { isCodeforcesRow, parseCustomSheet, type CustomSheetResult } from "../src/lib/excel/custom-sheet";
import { CUSTOM_SHEET, MAX_CUSTOM_PROBLEMS, type Cell, type SheetTable } from "../src/lib/excel/schema";
import { readCustomSheetData, readCustomSheetFile } from "../src/lib/excel/transfer";
import { writeXlsx } from "../src/lib/excel/xlsx";
import {
  buildProblemSet,
  compareProblems,
  countByDifficulty,
  inRatingRange,
  pickByRating,
  pickProblems,
  urlKey,
  usedProblemMatcher,
  pickMix,
  validateMix,
} from "../src/lib/generate";

const HEAD = ["LeetCodeURL", "CodeforcesURL", "SNo", "Problem", "Difficulty", "Rating"];
const LC = "https://leetcode.com/problems/";
const CF = "https://codeforces.com/problemset/problem/";

/** A worksheet from rows; rows[0] is the header row. */
const sheet = (rows: Cell[][], name = "Sheet1"): SheetTable => ({
  name,
  rows: rows.map((cells, i) => ({ row: i + 1, cells })),
});

type Over = Partial<Record<"lc" | "cf" | "title" | "difficulty" | "rating", Cell>>;

/** A valid LeetCode row by default. */
const row = (n: number, over: Over = {}): Cell[] => [
  "lc" in over ? over.lc! : `${LC}p${n}/`,
  "cf" in over ? over.cf! : null,
  n,
  "title" in over ? over.title! : `Problem ${n}`,
  "difficulty" in over ? over.difficulty! : "Easy",
  "rating" in over ? over.rating! : null,
];

/** A Codeforces row with a rating and no difficulty. */
const cfRow = (n: number, rating: Cell) => row(n, { lc: null, cf: `${CF}${n}/A`, difficulty: null, rating });

function ok(r: CustomSheetResult) {
  if (!r.ok) assert.fail(`expected success, got: ${r.errors.join(" | ")}`);
  return r.problems;
}

function errors(r: CustomSheetResult): string {
  assert.equal(r.ok, false, "expected the sheet to be rejected");
  return r.ok ? "" : r.errors.join("\n");
}

test("LeetCode rows, Codeforces rows and rows with both, in SNo order", () => {
  const problems = ok(
    parseCustomSheet([
      sheet([
        HEAD,
        [null, `${CF}4/A`, 2, "Watermelon", null, 800],
        [`${LC}two-sum/`, null, 1, "Two Sum", "EASY", null],
        [`${LC}3sum/`, `${CF}1/A`, 3, "Both", " medium ", 1400],
      ]),
    ]),
  );
  assert.deepEqual(
    problems.map((p) => [p.order, p.title, p.url, p.leetCodeUrl, p.difficulty, p.rating]),
    [
      [1, "Two Sum", `${LC}two-sum/`, `${LC}two-sum/`, "easy", undefined],
      [2, "Watermelon", `${CF}4/A`, null, "easy", 800],
      [3, "Both", `${CF}1/A`, `${LC}3sum/`, "medium", 1400],
    ],
  );
  assert.equal(problems[0]!.topic, "");
});

test("the format guide's column order", () => {
  assert.deepEqual(
    CUSTOM_SHEET.columns.map((c) => c.header),
    ["SNo", "Problem", "Difficulty", "Rating", "LeetCodeURL", "CodeforcesURL"],
  );
});

test("every example in the format guide is a valid sheet", () => {
  const rows = CUSTOM_SHEET.example!.map((r) => CUSTOM_SHEET.columns.map((c) => r[c.key] || null));
  const problems = ok(parseCustomSheet([sheet([CUSTOM_SHEET.columns.map((c) => c.header), ...rows])]));
  assert.equal(problems.length, CUSTOM_SHEET.example!.length);
  assert.deepEqual(
    problems.map((p) => p.rating),
    [undefined, undefined, 800, 1000, undefined],
  );
});

test("ids come from the link, so they survive reordering and are unique", () => {
  const a = ok(parseCustomSheet([sheet([HEAD, row(1), row(2)])]));
  const b = ok(parseCustomSheet([sheet([HEAD, row(9, { lc: `${LC}p2/`, title: "Renamed" }), row(1)])]));
  assert.equal(a[1]!.id, b[1]!.id);
  assert.notEqual(a[0]!.id, a[1]!.id);
});

test("headers: any capitals, spacing or punctuation; any column order; extras ignored", () => {
  const problems = ok(
    parseCustomSheet([
      sheet([
        ["Notes", "rating", "code forces url", "S. No.", "PROBLEM", "difficulty", "LeetCode URL"],
        ["skip me", 1200, `${CF}1/A`, 1, "Two Sum", "Easy", `${LC}two-sum/`],
      ]),
    ]),
  );
  assert.deepEqual(
    [problems[0]!.title, problems[0]!.url, problems[0]!.leetCodeUrl, problems[0]!.rating],
    ["Two Sum", `${CF}1/A`, `${LC}two-sum/`, 1200],
  );
});

test("only one link column, and only one of Difficulty and Rating, is enough", () => {
  ok(
    parseCustomSheet([
      sheet([
        ["LeetCodeURL", "SNo", "Problem", "Difficulty"],
        [`${LC}a/`, 1, "A", "Easy"],
      ]),
    ]),
  );
  const rated = ok(
    parseCustomSheet([
      sheet([
        ["CodeforcesURL", "SNo", "Problem", "Rating"],
        [`${CF}1/A`, 1, "A", 1900],
      ]),
    ]),
  );
  assert.deepEqual([rated[0]!.url, rated[0]!.leetCodeUrl, rated[0]!.difficulty], [`${CF}1/A`, null, "hard"]);
});

test("reads the first worksheet, whatever it is called", () => {
  const problems = ok(parseCustomSheet([sheet([HEAD, row(1)], "My list"), sheet([["nothing"], ["here"]], "Notes")]));
  assert.equal(problems.length, 1);
  assert.match(errors(parseCustomSheet([sheet([["nothing"]], "Notes"), sheet([HEAD, row(1)], "Problems")])), /^Notes:/);
});

test("cells: numbers stored as text, link cells, blank rows", () => {
  const problems = ok(
    parseCustomSheet([
      sheet([
        HEAD,
        [
          { text: "Solve", href: `${LC}a/` },
          null,
          " 2 ",
          { text: "Two Sum", href: "https://example.com/ignored" },
          "Easy",
          " 1500 ",
        ],
        [null, null, null, null, null, null],
        row(3),
      ]),
    ]),
  );
  assert.deepEqual(
    problems.map((p) => [p.order, p.title, p.url, p.rating]),
    [
      [2, "Two Sum", `${LC}a/`, 1500],
      [3, "Problem 3", `${LC}p3/`, undefined],
    ],
  );
});

test("structure problems are explained once, not on every row", () => {
  assert.match(errors(parseCustomSheet([])), /no worksheets/);
  assert.match(
    errors(parseCustomSheet([sheet([])])),
    /Sheet1: row 1 must contain the column headers \(SNo, Problem, Difficulty, Rating, LeetCodeURL, CodeforcesURL\)/,
  );
  assert.match(
    errors(
      parseCustomSheet([
        sheet([
          ["Name", "Difficulty"],
          ["x", "Easy"],
        ]),
      ]),
    ),
    /missing required columns “SNo”, “Problem” in row 1/,
  );
  assert.equal(
    errors(
      parseCustomSheet([
        sheet([
          ["SNo", "Problem", "Difficulty"],
          [1, "a", "Easy"],
          [2, "b", "Easy"],
        ]),
      ]),
    ),
    "Sheet1: add a LeetCodeURL or CodeforcesURL column.",
  );
  assert.equal(
    errors(
      parseCustomSheet([
        sheet([
          ["LeetCodeURL", "SNo", "Problem"],
          [`${LC}a/`, 1, "a"],
          [`${LC}b/`, 2, "b"],
        ]),
      ]),
    ),
    "Sheet1: add a Difficulty or Rating column.",
  );
  assert.match(errors(parseCustomSheet([sheet([[...HEAD, "S No"]])])), /the column “S No” appears more than once/);
  assert.match(errors(parseCustomSheet([sheet([HEAD])])), /there are no problems/);
});

test("every invalid row is reported with its row, and nothing is returned", () => {
  const message = errors(
    parseCustomSheet([
      sheet([
        HEAD,
        [`${LC}1/`, null, 0, "ok", "Easy", null],
        [`${LC}2/`, null, 2.5, "ok", "Easy", null],
        [`${LC}3/`, null, null, "ok", "Easy", null],
        row(4, { title: null }),
        row(5, { title: "x".repeat(201) }),
        row(6, { title: true }),
        row(7, { difficulty: "Brutal" }),
        row(8, { difficulty: null }),
        row(9, { lc: null }),
        row(10, { lc: "not a link" }),
        row(11, { lc: null, cf: "nope" }),
      ]),
    ]),
  );
  for (const expected of [
    /row 2: SNo “0” must be a whole number/,
    /row 3: SNo “2.5” must be a whole number/,
    /row 4: SNo is required/,
    /row 5: Problem is required/,
    /row 6: Problem is longer than 200/,
    /row 7: Problem must be text/,
    /row 8: Difficulty “Brutal” isn't valid. Use Easy, Medium or Hard/,
    /row 9: add a Difficulty - LeetCode problems are picked by difficulty/,
    /row 10: add a LeetCodeURL or a CodeforcesURL/,
    /row 11: LeetCodeURL “not a link” isn't a valid web address/,
    /row 12: CodeforcesURL “nope” isn't a valid web address/,
  ]) {
    assert.match(message, expected);
  }
});

test("a rating with no difficulty sets the tier; a given difficulty wins", () => {
  const rows = [1100, 1200, 1700, 1800].map((r, i) => cfRow(i + 1, r));
  assert.deepEqual(
    ok(parseCustomSheet([sheet([HEAD, ...rows])])).map((p) => p.difficulty),
    ["easy", "medium", "medium", "hard"],
  );
  const given = ok(parseCustomSheet([sheet([HEAD, row(1, { difficulty: "Hard", rating: 800 })])]));
  assert.deepEqual([given[0]!.difficulty, given[0]!.rating], ["hard", 800]);
});

test("ratings must be whole numbers from 800 to 3500", () => {
  assert.deepEqual(
    ok(parseCustomSheet([sheet([HEAD, cfRow(1, 800), cfRow(2, 3500), cfRow(3, "1400")])])).map((p) => p.rating),
    [800, 3500, 1400],
  );
  for (const bad of [799, 3501, 1450.5, -800, "hard", true]) {
    assert.match(
      errors(parseCustomSheet([sheet([HEAD, row(1, { rating: bad })])])),
      /row 2: Rating “.+” must be a whole number from 800 to 3500, or blank/,
    );
  }
});

test("only web links are accepted, so a sheet can't plant a script link", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,hi", "file:///etc/passwd", "ftp://example.com/a"]) {
    assert.match(errors(parseCustomSheet([sheet([HEAD, row(1, { lc: url })])])), /isn't a valid web address/);
    assert.match(errors(parseCustomSheet([sheet([HEAD, row(1, { cf: url })])])), /isn't a valid web address/);
  }
  const hidden: Cell = { text: "Solve", href: "javascript:alert(1)" };
  assert.match(errors(parseCustomSheet([sheet([HEAD, row(1, { lc: hidden })])])), /isn't a valid web address/);
});

test("SNo and each problem's link must be unique", () => {
  assert.match(
    errors(parseCustomSheet([sheet([HEAD, row(1), [`${LC}b/`, null, 1, "b", "Easy", null]])])),
    /row 3: SNo 1 is already used in row 2/,
  );
  assert.match(
    errors(parseCustomSheet([sheet([HEAD, row(1, { lc: `${LC}a/` }), row(2, { lc: `${LC}A` })])])),
    /row 3: this LeetCodeURL is already used in row 2/,
  );
  assert.match(
    errors(
      parseCustomSheet([
        sheet([HEAD, row(1, { cf: `${CF}1/A`, rating: 900 }), row(2, { cf: `${CF}1/A`, rating: 900 })]),
      ]),
    ),
    /row 3: this CodeforcesURL is already used in row 2/,
  );

  // Two Codeforces problems may share one LeetCode equivalent, as sheets like A2Z do.
  ok(
    parseCustomSheet([
      sheet([
        HEAD,
        row(1, { lc: `${LC}a/`, cf: `${CF}1/A`, rating: 900 }),
        row(2, { lc: `${LC}a/`, cf: `${CF}2/A`, rating: 900 }),
      ]),
    ]),
  );
  // Links that differ only by query are different problems (POJ-style ids).
  ok(
    parseCustomSheet([
      sheet([HEAD, row(1, { lc: "http://poj.org/problem?id=1000" }), row(2, { lc: "http://poj.org/problem?id=1001" })]),
    ]),
  );
});

test("a sheet can hold at most MAX_CUSTOM_PROBLEMS problems", () => {
  const rows = (n: number) => Array.from({ length: n }, (_, i) => row(i + 1));
  assert.equal(ok(parseCustomSheet([sheet([HEAD, ...rows(MAX_CUSTOM_PROBLEMS)])])).length, MAX_CUSTOM_PROBLEMS);
  assert.match(
    errors(parseCustomSheet([sheet([HEAD, ...rows(MAX_CUSTOM_PROBLEMS + 1)])])),
    /found 2,001 problems; a custom sheet can hold at most 2,000/,
  );
});

// --- Real files ---------------------------------------------------------------

const workbook = (rows: Record<string, Cell>[]) =>
  writeXlsx({ created: new Date(0), sheets: [{ spec: CUSTOM_SHEET, rows }] });

test("a real .xlsx file, from this device", async () => {
  const bytes = await workbook([
    {
      leetCodeUrl: { text: "Open", href: `${LC}two-sum/` },
      codeforcesUrl: null,
      sNo: 1,
      title: "Two Sum",
      difficulty: "Easy",
      rating: null,
    },
    { leetCodeUrl: null, codeforcesUrl: `${CF}4/A`, sNo: 2, title: "Watermelon", difficulty: null, rating: 800 },
  ]);
  const problems = ok(await readCustomSheetFile(new File([bytes], "mine.xlsx")));
  assert.deepEqual(
    problems.map((p) => [p.title, p.url, p.difficulty, p.rating]),
    [
      ["Two Sum", `${LC}two-sum/`, "easy", undefined],
      ["Watermelon", `${CF}4/A`, "easy", 800],
    ],
  );
});

test("the same file checks as every other import", async () => {
  assert.match(errors(await readCustomSheetFile(new File(["a,b"], "mine.csv"))), /\.csv files aren't supported/);
  assert.match(errors(await readCustomSheetFile(new File([], "mine.xlsx"))), /The file is empty/);
  assert.match(
    errors(await readCustomSheetData(new TextEncoder().encode("not a zip").buffer as ArrayBuffer)),
    /isn't a valid Excel workbook/,
  );
});

test("Google Drive: a file over the size limit is refused before signing in or downloading", async () => {
  const picked = { id: "f1", name: "big.xlsx", mimeType: "x", sizeBytes: 6 * 1024 * 1024 };
  assert.match(errors(await readDriveCustomSheet(picked)), /the limit is 5 MB/);
});

// --- Saved sheets -------------------------------------------------------------

class MemoryStorage {
  map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

test("sheets persist with their ratings, oldest first, and removing one leaves the rest", () => {
  const ls = new MemoryStorage();
  (globalThis as { window?: unknown }).window = { localStorage: ls };

  const problems = ok(
    parseCustomSheet([sheet([HEAD, row(1), cfRow(2, 1500), row(3, { lc: `${LC}x/`, cf: `${CF}9/A`, rating: 1700 })])]),
  );
  const older = buildCustomSheet({ name: "  Older  ", fileName: "a.xlsx", problems }, 1000);
  const newer = buildCustomSheet({ name: "Newer", fileName: "b.xlsx", problems }, 2000);
  saveCustomSheet(newer);
  saveCustomSheet(older);

  const list = getCustomSheets();
  assert.deepEqual(
    list.map((s) => s.name),
    ["Older", "Newer"],
  );
  assert.deepEqual(list[0]!.problems, problems, "problems survive the trip through storage");
  assert.equal(list[0]!.problems[1]!.rating, 1500);
  assert.equal(getCustomSheets(), list, "the snapshot is stable until something changes");

  deleteCustomSheet(older.id);
  assert.deepEqual(
    getCustomSheets().map((s) => s.name),
    ["Newer"],
  );
  assert.deepEqual([...ls.map.keys()], [`solve-problemset:sheet:${newer.id}`]);
});

test("damaged saved sheets are dropped, not crashed on", () => {
  assert.equal(parseCustomSheetRecord(null), null);
  assert.equal(parseCustomSheetRecord("{not json"), null);
  assert.equal(parseCustomSheetRecord("null"), null);
  assert.equal(parseCustomSheetRecord('{"id":"a","name":"n"}'), null);
  assert.equal(parseCustomSheetRecord('{"id":"a","name":"n","problems":[{"id":"x"}]}'), null, "no usable problems");
  const kept = parseCustomSheetRecord(
    '{"id":"a","name":"n","problems":[{"id":"x"},{"id":"y","title":"Y","url":"https://e.com/y","difficulty":"easy","rating":"high"}]}',
  );
  assert.deepEqual(
    kept?.problems.map((p) => [p.id, p.rating]),
    [["y", undefined]],
  );
});

// --- Sets from a custom sheet -------------------------------------------------

test("a set remembers its custom sheet; other sets don't get one", () => {
  const problems = ok(parseCustomSheet([sheet([HEAD, row(1), row(2), row(3, { difficulty: "Medium" })])]));
  const counts = { easy: 1, medium: 1, hard: 0 };
  const set = buildProblemSet(
    { name: "Mine", sheetId: "custom", customSheetName: "Graphs", counts },
    pickProblems(problems, counts),
    0,
  );
  assert.equal(set.sheetId, "custom");
  assert.equal(set.customSheetName, "Graphs");
  assert.deepEqual(countByDifficulty(set.problems), { easy: 1, medium: 1, hard: 0 });
  assert.equal(buildProblemSet({ name: "x", sheetId: "leetcode", counts }, [], 0).customSheetName, null);
});

test("a sheet with ratings can be filtered by range; unrated rows are left out", () => {
  const problems = ok(
    parseCustomSheet([
      sheet([HEAD, row(1), cfRow(2, 1000), cfRow(3, 1300), cfRow(4, 1500), cfRow(5, 1600), cfRow(6, 2100)]),
    ]),
  );
  assert.equal(problems.filter((p) => inRatingRange(p, 1300, 1600)).length, 3);
  assert.equal(problems.filter((p) => inRatingRange(p, 800, 3500)).length, 5, "the unrated row never matches a range");

  const picked = pickByRating(problems, { min: 1300, max: 1600, count: 3 });
  assert.deepEqual(
    picked.map((p) => p.rating),
    [1300, 1500, 1600],
  );
  const set = buildProblemSet(
    { name: "x", sheetId: "custom", customSheetName: "CF", counts: countByDifficulty(picked) },
    picked,
    0,
  );
  assert.deepEqual(
    set.problems.map((p) => [p.rating, p.difficulty]),
    [
      [1300, "medium"],
      [1500, "medium"],
      [1600, "medium"],
    ],
  );
  assert.throws(() => pickByRating(problems, { min: 1300, max: 1600, count: 4 }), /Only 3 problems rated 1300–1600/);
});

test("a set picked by rating runs lowest first, whatever the sheet's SNo order", () => {
  const problems = ok(parseCustomSheet([sheet([HEAD, cfRow(1, 1600), cfRow(2, 1300), cfRow(3, 1500)])]));
  const picked = pickByRating(problems, { min: 1300, max: 1600, count: 3 });
  const set = buildProblemSet({ name: "x", sheetId: "custom", counts: countByDifficulty(picked) }, picked, 0);
  assert.deepEqual(
    [...set.problems].sort(compareProblems).map((p) => p.rating),
    [1300, 1500, 1600],
  );
});

test("'Only new problems' knows a sheet's used problems, including after re-adding the file", () => {
  const first = ok(parseCustomSheet([sheet([HEAD, row(1), row(2)])]));
  const set = buildProblemSet(
    { name: "x", sheetId: "custom", counts: { easy: 1, medium: 0, hard: 0 } },
    [first[0]!],
    0,
  );
  const again = ok(parseCustomSheet([sheet([HEAD, row(2), row(5, { lc: `${LC}p1/`, title: "Moved" })])]));
  const isUsed = usedProblemMatcher(set.problems);
  assert.deepEqual(
    again.map((p) => [p.title, isUsed(p)]),
    [
      ["Problem 2", false],
      ["Moved", true],
    ],
  );
});

test("urlKey ignores fragments, trailing slashes and case, but not the query", () => {
  assert.equal(urlKey(" https://Example.com/a/#notes "), "https://example.com/a");
  assert.notEqual(urlKey("http://poj.org/problem?id=1"), urlKey("http://poj.org/problem?id=2"));
});

// --- LeetCode by difficulty, Codeforces by rating -----------------------------

test("each platform needs what it's picked by: LeetCode a Difficulty, Codeforces a Rating", () => {
  assert.match(
    errors(parseCustomSheet([sheet([HEAD, row(1, { lc: null, cf: `${CF}1/A`, difficulty: "Easy" })])])),
    /row 2: add a Rating - Codeforces problems are picked by rating/,
  );
  assert.match(
    errors(parseCustomSheet([sheet([HEAD, row(1, { difficulty: null, rating: 1200 })])])),
    /row 2: add a Difficulty - LeetCode problems are picked by difficulty/,
  );
  // A row with both links is a Codeforces problem: a Rating is enough.
  ok(parseCustomSheet([sheet([HEAD, row(1, { cf: `${CF}1/A`, difficulty: null, rating: 1200 })])]));
});

test("rows are told apart by platform; a row with both links counts as Codeforces", () => {
  const problems = ok(
    parseCustomSheet([sheet([HEAD, row(1), cfRow(2, 1000), row(3, { cf: `${CF}3/A`, rating: 1300 })])]),
  );
  assert.deepEqual(problems.map(isCodeforcesRow), [false, true, true]);
});

test("one set from a mixed sheet: LeetCode by difficulty plus Codeforces by rating", () => {
  const problems = ok(
    parseCustomSheet([
      sheet([
        HEAD,
        row(1),
        row(2, { difficulty: "Medium" }),
        row(3, { difficulty: "Medium" }),
        cfRow(4, 1000),
        cfRow(5, 1300),
        cfRow(6, 1500),
        cfRow(7, 2100),
      ]),
    ]),
  );
  const lc = problems.filter((p) => !isCodeforcesRow(p));
  const cf = problems.filter(isCodeforcesRow);
  const picked = pickMix(lc, { easy: 1, medium: 1, hard: 0 }, cf, { min: 1200, max: 1600, count: 2 });
  assert.equal(picked.length, 4);
  assert.deepEqual(
    picked.map((p) => (isCodeforcesRow(p) ? `CF ${p.rating}` : `LC ${p.difficulty}`)),
    ["LC easy", "LC medium", "CF 1300", "CF 1500"],
  );
  assert.deepEqual(
    picked.map((p) => p.order),
    [1, 2, 3, 4],
  );
  const set = buildProblemSet(
    { name: "Mixed", sheetId: "custom", customSheetName: "Mine", counts: countByDifficulty(picked) },
    picked,
    0,
  );
  // Within each difficulty, LeetCode problems come first, then Codeforces by rating.
  assert.deepEqual(
    [...set.problems].sort(compareProblems).map((p) => p.title),
    ["Problem 1", "Problem 2", "Problem 5", "Problem 6"],
  );
  assert.equal(pickMix(lc, { easy: 1, medium: 0, hard: 0 }, cf, { min: 800, max: 3500, count: 0 }).length, 1);
  assert.equal(pickMix(lc, { easy: 0, medium: 0, hard: 0 }, cf, { min: 800, max: 3500, count: 2 }).length, 2);
});

test("a mixed set may take none from one side, but not from both", () => {
  const none = { easy: 0, medium: 0, hard: 0 };
  const range = (count: number) => ({ min: 1200, max: 1600, count });
  assert.deepEqual(validateMix({ easy: 1, medium: 0, hard: 0 }, range(0), undefined, 0), {});
  assert.deepEqual(validateMix(none, range(2), undefined, 5), {});
  assert.equal(validateMix(none, range(0)).counts, "Add at least one problem.");
  assert.equal(validateMix(none, range(-1)).count, "Enter a whole number, 0 or more.");
  assert.equal(validateMix(none, range(6), undefined, 3).count, "Only 3 problems rated 1200–1600 available.");
  assert.match(
    validateMix({ easy: 4, medium: 0, hard: 0 }, range(1), { easy: 2, medium: 0, hard: 0 }, 5).easy ?? "",
    /Only 2 easy/,
  );
  assert.match(validateMix(none, { min: 1600, max: 1200, count: 0 }).rating ?? "", /lowest rating/);
});
