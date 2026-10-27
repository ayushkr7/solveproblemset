import { test } from "node:test";
import assert from "node:assert/strict";
import * as t from "../src/lib/timer";
import { buildProblemSet, pickProblems } from "../src/lib/generate";
import { buildWorkbook, exportFileName } from "../src/lib/excel/export";
import { nameTaken, parseWorkbook, suggestName, type ImportResult, type ImportedSet } from "../src/lib/excel/import";
import { applyPlan, planErrors, planImport } from "../src/lib/excel/plan";
import type { Cell, SheetTable } from "../src/lib/excel/schema";
import { readWorkbookFile } from "../src/lib/excel/transfer";
import { readXlsx, writeXlsx } from "../src/lib/excel/xlsx";
import type { CatalogProblem, ProblemSet } from "../src/lib/types";

const MIN = 60_000;

const catalog: CatalogProblem[] = [
  { id: "h1", title: "H1", url: "https://leetcode.com/problems/h1/", difficulty: "hard", topic: "Graphs", order: 0 },
  { id: "e1", title: "E1", url: "https://leetcode.com/problems/e1/", difficulty: "easy", topic: "Arrays", order: 1 },
  { id: "m1", title: "M1", url: "https://leetcode.com/problems/m1/", difficulty: "medium", topic: "", order: 2 },
  { id: "e2", title: "E2", url: "https://leetcode.com/problems/e2/", difficulty: "easy", topic: "Arrays", order: 3 },
];

function make(name: string, counts: { easy: number; medium: number; hard: number }): ProblemSet {
  return buildProblemSet({ name, sheetId: "striver-180", counts }, pickProblems(catalog, counts), Date.UTC(2026, 9, 1, 9, 30));
}

/** Three sets with different sizes and timer states: running, stopped, never started. */
function library(): ProblemSet[] {
  let a = t.start(make("Week 1", { easy: 2, medium: 1, hard: 1 }), 0);
  a = t.setSolved(a, "e1", true, 5 * MIN);
  a = t.setSolved(a, "h1", true, 12.5 * MIN);
  a = t.editTime(a, "h1", 7.25, 13 * MIN);

  let b = t.start({ ...make("Week 2", { easy: 1, medium: 1, hard: 0 }), sheetId: "striver-a2z" }, 0);
  b = t.setSolved(b, "m1", true, 3 * MIN);
  b = t.stop(b, 4 * MIN);

  const c = t.setSolved(make("Week 3", { easy: 1, medium: 0, hard: 0 }), "e1", true, MIN); // untimed solve
  return [a, b, c];
}

const summary = (s: ProblemSet) => ({
  name: s.name,
  sheetId: s.sheetId,
  createdAt: s.createdAt,
  requested: s.requested,
  problems: s.problems.map((p) => [p.title, p.url, p.difficulty, p.topic, p.solved, p.timeMs]),
});

function ok(r: ImportResult) {
  if (!r.ok) assert.fail(`expected success, got: ${r.errors.join(" | ")}`);
  return r;
}

function errors(r: ImportResult): string {
  assert.equal(r.ok, false, "expected the import to fail");
  return r.ok ? "" : r.errors.join("\n");
}

/** Hand-authored worksheet: rows[0] is the header row. */
function table(name: string, rows: Cell[][]): SheetTable {
  return { name, rows: rows.map((cells, i) => ({ row: i + 1, cells })) };
}

const SET_HEAD = ["SetID", "SetName", "SourceSheet", "CreatedAt"];
const PROB_HEAD = ["SetID", "ProblemName", "ProblemURL", "Difficulty", "Status", "TimeMinutes", "Order"];
const setsSheet = (...rows: Cell[][]) => table("ProblemSets", [SET_HEAD, ...rows]);
const problemsSheet = (...rows: Cell[][]) => table("Problems", [PROB_HEAD, ...rows]);
const SET_A: Cell[] = ["S1", "Arrays", "Striver A2Z", "2026-10-26T09:30:00Z"];
const SET_B: Cell[] = ["S2", "Graphs", "Striver 180", "2026-10-27T09:30:00Z"];
const prob = (setId: Cell, order: Cell, extra: Partial<Record<"name" | "url" | "diff" | "status" | "min", Cell>> = {}): Cell[] => [
  setId,
  extra.name ?? `Problem ${order}`,
  extra.url ?? `https://leetcode.com/problems/p${order}/`,
  extra.diff ?? "Easy",
  extra.status ?? "Solved",
  extra.min ?? 5,
  order,
];

test("export → .xlsx → import round-trips several sets, each with its own problems and timer", async () => {
  const sets = library();
  const now = 20 * MIN;
  const bytes = await writeXlsx(buildWorkbook(sets, now));
  assert.equal(String.fromCharCode(...bytes.slice(0, 2)), "PK", "a real zip-based .xlsx, not CSV");

  const tables = await readXlsx(bytes.buffer);
  assert.deepEqual(tables.map((s) => s.name), ["ProblemSets", "Problems"], "two normalised worksheets");

  const r = ok(await readWorkbookFile(new File([bytes], exportFileName(sets, now, true)), now));
  assert.equal(r.format, 2);
  assert.deepEqual(r.sets.map((s) => s.ref), ["S1", "S2", "S3"]);
  assert.deepEqual(r.sets.map((s) => summary(s.set)), sets.map(summary));
  for (const { set } of r.sets) assert.ok(!sets.some((s) => s.id === set.id), "fresh internal ids");

  const [a, b, c] = r.sets.map((s) => s.set.session);
  assert.equal(a!.status, "paused"); // was running → paused at export time
  assert.equal(t.elapsedMs(a!, now + 99 * MIN), 20 * MIN);
  assert.equal(b!.status, "stopped");
  assert.equal(b!.accumulatedMs, 4 * MIN);
  assert.deepEqual(c, t.initialSession());
  assert.ok(r.sets.every(({ set }) => set.session.runningSince === null), "never running after import");

  // The restored session keeps working with the existing timer logic.
  let s = t.resume(r.sets[0]!.set, now);
  s = t.setSolved(s, s.problems[1]!.id, true, now + 3 * MIN);
  assert.equal(s.problems[1]!.timeMs, 3 * MIN);
});

test("exporting does not modify the sets", () => {
  const sets = library();
  const before = structuredClone(sets);
  buildWorkbook(sets, 99 * MIN);
  assert.deepEqual(sets, before);
});

test("a re-export of imported sets produces the same sheet data", async () => {
  const now = 20 * MIN;
  const first = buildWorkbook(library(), now);
  const again = ok(parseWorkbook(await readXlsx((await writeXlsx(first)).buffer), now));
  const second = buildWorkbook(again.sets.map((s) => s.set), now);
  assert.deepEqual(second.sheets.map((s) => s.rows), first.sheets.map((s) => s.rows));
});

test("hand-made files: interleaved rows, loose SetIDs, optional timer columns", () => {
  const r = ok(
    parseWorkbook([
      table("ProblemSets", [
        [...SET_HEAD, "ElapsedSeconds", "TimerState"],
        [...SET_A, 90, null],
        [7, "Numbers", "striver-180", "2026-10-27", null, null],
      ]),
      problemsSheet(
        prob("s1", 2, { diff: "MEDIUM", status: "unsolved", min: "4" }),
        prob("7", 1),
        prob(" S1 ", 1, { url: { text: "link", href: "https://leetcode.com/problems/two-sum/" }, min: "0" }),
        [null, null, null, null, null, null, null],
      ),
    ]),
  );
  const [arrays, numbers] = r.sets;
  assert.deepEqual(arrays!.set.problems.map((p) => [p.order, p.difficulty, p.solved, p.timeMs, p.url]), [
    [1, "easy", true, null, "https://leetcode.com/problems/two-sum/"], // 0 minutes → untimed
    [2, "medium", false, null, "https://leetcode.com/problems/p2/"], // time ignored when unsolved
  ]);
  assert.equal(numbers!.set.problems.length, 1);
  assert.equal(numbers!.set.sheetId, "striver-180");
  assert.equal(arrays!.set.session.status, "paused"); // blank state + time → Paused
  assert.equal(arrays!.set.session.accumulatedMs, 90_000);
  assert.deepEqual(numbers!.set.session, t.initialSession());
  assert.match(r.warnings.join("\n"), /TimerState is blank, so the timer was imported as Paused/);
  assert.match(r.warnings.join("\n"), /TimeMinutes was ignored for 1 Unsolved problem \(row 2\)/);
});

test("SetID links are validated: duplicates, unknown ids, empty sets, per-set Order", () => {
  const msg = errors(
    parseWorkbook([
      setsSheet(SET_A, SET_B, ["s1", "Dup", "Striver 180", "2026-10-27"], ["S3", "Empty", "Striver 180", "2026-10-27"]),
      problemsSheet(prob("S1", 1), prob("S2", 1), prob("S1", 1), prob("S9", 1), prob(null, 2)),
    ]),
  );
  for (const expected of [
    "ProblemSets, row 4: SetID “s1” is already used in row 2",
    "ProblemSets, row 5: set “S3” has no problems",
    "Problems, row 4: Order 1 is already used in row 2 for SetID “S1”",
    "Problems, row 5: SetID “S9” doesn't match any set in ProblemSets",
    "Problems, row 6: SetID is required",
  ]) {
    assert.ok(msg.includes(expected), `missing: ${expected}\n---\n${msg}`);
  }
  assert.ok(!msg.includes("row 3: Order"), "the same Order in different sets is fine");
});

test("each invalid problem value is reported with its row", () => {
  const msg = errors(
    parseWorkbook([
      setsSheet(SET_A),
      problemsSheet(
        prob("S1", 1, { url: "not a url", diff: "Expert", status: "Done", min: -1 }),
        prob("S1", 2, { min: "ten" }),
        prob("S1", 2.5, { name: "", url: "javascript:alert(1)" }),
        prob("S1", null),
      ),
    ]),
  );
  for (const expected of [
    "row 2: ProblemURL “not a url” isn't a valid web address",
    "row 2: Difficulty “Expert” isn't valid",
    "row 2: Status “Done” isn't valid",
    "row 2: TimeMinutes can't be negative",
    "row 3: TimeMinutes “ten” must be a number",
    "row 4: ProblemName is required",
    "row 4: ProblemURL “javascript:alert(1)”",
    "row 4: Order “2.5” must be a whole number",
    "row 5: Order is required",
  ]) {
    assert.ok(msg.includes(expected), `missing: ${expected}\n---\n${msg}`);
  }
});

test("structure problems: missing sheets, columns, rows", () => {
  assert.match(errors(parseWorkbook([])), /no worksheets/);
  assert.match(errors(parseWorkbook([setsSheet(SET_A)])), /Missing the “Problems” worksheet/);
  assert.match(errors(parseWorkbook([{ ...setsSheet(SET_A), name: "problemsets" }, problemsSheet(prob("S1", 1))])), /Rename the worksheet “problemsets”/);
  assert.match(
    errors(parseWorkbook([table("ProblemSets", [["SetID", "setname", "SourceSheet"], SET_A]), problemsSheet(prob("S1", 1))])),
    /missing required columns “SetName” \(found “setname”.*“CreatedAt”/,
  );
  assert.match(errors(parseWorkbook([setsSheet(), problemsSheet()])), /there are no problem sets/);
});

test("set metadata and timer validation", () => {
  const one = (row: Cell[], head = [...SET_HEAD, "ElapsedSeconds", "TimerState", "FormatVersion"]) =>
    parseWorkbook([table("ProblemSets", [head, row]), problemsSheet(prob("S1", 1))]);
  const base = SET_A.slice(1);
  assert.match(errors(one(["S1", "X", "Neetcode", "2026-10-26"])), /SourceSheet “Neetcode” isn't recognised/);
  assert.match(errors(one(["S1", "X", "Striver 180", "26/10/2026"])), /CreatedAt “26\/10\/2026” isn't an ISO 8601/);
  assert.match(errors(one(["S1", "X", "Striver 180", "2026-02-30"])), /isn't an ISO 8601/);
  assert.match(errors(one(["S1", "x".repeat(61), "Striver 180", "2026-10-26"])), /keep it to 60/);
  assert.match(errors(one(["S1", ...base, 0, 0, 3])), /format version 3, which is newer/);
  assert.match(errors(one(["S1", ...base, 10, "NotStarted"])), /NotStarted timer must have ElapsedSeconds = 0/);
  assert.match(errors(one(["S1", ...base, 5, "Running"])), /TimerState “Running” isn't valid/);
  assert.match(errors(one(["S1", ...base, -5, "Paused"])), /ElapsedSeconds can't be negative/);
  const set = ok(one(["S1", "X", "striver-a2z", "2026-10-26T15:00:00+0530", 90.5, "stopped", "2"])).sets[0]!.set;
  assert.equal(set.createdAt, "2026-10-26T09:30:00.000Z");
  assert.equal(set.session.status, "stopped");
  assert.equal(set.session.accumulatedMs, 90_500);
  assert.equal(ok(one(["S1", ...base, 0, "Not Started"])).sets[0]!.set.session.status, "idle");
});

test("format 1 (single-set) files still import", () => {
  const v1 = (session?: Cell[]) =>
    parseWorkbook([
      table("ProblemSet", [["SetName", "SourceSheet", "CreatedAt", "FormatVersion"], ["Old set", "Striver 180", "2026-10-26T09:30:00Z", 1]]),
      table("Problems", [PROB_HEAD.slice(1), prob("x", 1).slice(1), prob("x", 2, { status: "Unsolved", min: 0 }).slice(1)]),
      ...(session ? [table("Session", [["ElapsedSeconds", "TimerState"], session])] : []),
    ]);
  const r = ok(v1([120, "Paused"]));
  assert.equal(r.format, 1);
  assert.equal(r.sets.length, 1);
  assert.equal(r.sets[0]!.set.name, "Old set");
  assert.equal(r.sets[0]!.set.problems.length, 2);
  assert.equal(r.sets[0]!.set.session.accumulatedMs, 120_000);
  assert.deepEqual(ok(v1()).sets[0]!.set.session, t.initialSession());
  assert.match(errors(v1([30, "NotStarted"])), /^Session, row 2: a NotStarted timer/);
});

test("file checks: type, content, legacy workbooks", async () => {
  assert.match(errors(await readWorkbookFile(new File(["a,b"], "set.csv"))), /\.csv files aren't supported/);
  assert.match(errors(await readWorkbookFile(new File(["a,b\n1,2"], "set.xlsx"))), /isn't a valid Excel workbook/);
  const ole = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0]);
  assert.match(errors(await readWorkbookFile(new File([ole], "set.xlsx"))), /older \.xls/);
  const brokenZip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]);
  assert.match(errors(await readWorkbookFile(new File([brokenZip], "set.xlsx"))), /couldn't be opened/);
});

test("import plan: name conflicts with saved sets and within the file", () => {
  const imported = (...names: string[]): ImportedSet[] =>
    names.map((name, i) => ({ ref: `S${i + 1}`, row: i + 2, set: { ...make(name, { easy: 1, medium: 0, hard: 0 }), id: `new-${i}` } }));
  const existing = [{ name: "Arrays" }, { name: "Arrays (2)" }];
  const plan = planImport(imported("Arrays", "Graphs", "graphs", "Trees"), existing);

  assert.deepEqual(
    plan.map((p) => [p.conflict?.kind ?? null, p.action, p.rename]),
    [
      ["existing", "rename", "Arrays (3)"],
      [null, "import", "Graphs"],
      ["file", "rename", "graphs (2)"],
      [null, "import", "Trees"],
    ],
  );
  assert.equal(planErrors(plan, existing).size, 0, "suggested names are free");

  // Importing a clashing name as-is, or two identical final names, is blocked.
  const bad = plan.map((p, i) => (i === 0 ? { ...p, action: "import" as const } : i === 2 ? { ...p, rename: "GRAPHS" } : p));
  const errs = planErrors(bad, existing);
  assert.match(errs.get(0)!, /already have a set named “Arrays”/);
  assert.match(errs.get(2)!, /Another set in this import is also named “GRAPHS”/);

  const outcome = applyPlan(plan.map((p, i) => (i === 3 ? { ...p, action: "skip" as const } : p)));
  assert.deepEqual([outcome.imported, outcome.renamed, outcome.skipped], [3, 2, 1]);
  assert.deepEqual(outcome.sets.map((s) => s.name), ["Arrays (3)", "Graphs", "graphs (2)"]);
  assert.deepEqual(outcome.sets.map((s) => s.id), ["new-0", "new-1", "new-2"]);
});

test("name helpers", () => {
  const sets = [{ name: "Arrays" }, { name: "arrays (2)" }];
  assert.ok(nameTaken("  ARRAYS ", sets));
  assert.equal(suggestName("Arrays", sets), "Arrays (3)");
  assert.equal(suggestName("x".repeat(60), [{ name: "x".repeat(60) }]).length, 60);
});

test("export file names", () => {
  const now = new Date(2026, 9, 27, 12).getTime();
  assert.equal(exportFileName([{ name: "a" }, { name: "b" }], now, true), "DSA_All_Problem_Sets_2026-10-27.xlsx");
  assert.equal(exportFileName([{ name: "a" }, { name: "b" }, { name: "c" }], now), "DSA_3_Problem_Sets_2026-10-27.xlsx");
  assert.equal(exportFileName([{ name: "Graphs — week 1!" }], now), "Graphs_week_1_2026-10-27.xlsx");
  assert.equal(exportFileName([{ name: "???" }], now), "DSA_Practice_Set_2026-10-27.xlsx");
});
