import { test } from "node:test";
import assert from "node:assert/strict";
import * as t from "../src/lib/timer";
import { buildProblemSet, compareProblems, pickProblems, validateInput, InsufficientProblemsError } from "../src/lib/generate";
import type { CatalogProblem, ProblemSet } from "../src/lib/types";

const MIN = 60_000;

const catalog: CatalogProblem[] = [
  { id: "h1", title: "H1", url: "u", difficulty: "hard", topic: "", order: 0 },
  { id: "e1", title: "E1", url: "u", difficulty: "easy", topic: "", order: 1 },
  { id: "m1", title: "M1", url: "u", difficulty: "medium", topic: "", order: 2 },
  { id: "e2", title: "E2", url: "u", difficulty: "easy", topic: "", order: 3 },
  { id: "m2", title: "M2", url: "u", difficulty: "medium", topic: "", order: 4 },
];

function freshSet(): ProblemSet {
  return buildProblemSet(
    { name: "Test", sheetId: "striver-a2z", counts: { easy: 2, medium: 2, hard: 1 } },
    pickProblems(catalog, { easy: 2, medium: 2, hard: 1 }),
    0,
  );
}

const time = (s: ProblemSet, id: string) => s.problems.find((p) => p.id === id)!.timeMs;

test("problems are ordered Easy → Medium → Hard, then by sheet order", () => {
  const ids = freshSet().problems.map((p) => p.id);
  assert.deepEqual(ids, ["e1", "e2", "m1", "m2", "h1"]);
  assert.ok(compareProblems(catalog[1]!, catalog[3]!) < 0);
});

test("first solve measures from start, later solves from the previous solve", () => {
  let s = t.start(freshSet(), 1000);
  s = t.setSolved(s, "e1", true, 1000 + 5 * MIN);
  s = t.setSolved(s, "e2", true, 1000 + 12 * MIN);
  assert.equal(time(s, "e1"), 5 * MIN);
  assert.equal(time(s, "e2"), 7 * MIN);
});

test("paused time is excluded from durations and elapsed", () => {
  let s = t.start(freshSet(), 0);
  s = t.pause(s, 3 * MIN);
  s = t.resume(s, 30 * MIN); // 27 min break
  s = t.setSolved(s, "e1", true, 35 * MIN);
  assert.equal(time(s, "e1"), 8 * MIN);
  assert.equal(t.elapsedMs(s.session, 35 * MIN), 8 * MIN);
});

test("solving while paused records time up to the pause", () => {
  let s = t.start(freshSet(), 0);
  s = t.pause(s, 4 * MIN);
  s = t.setSolved(s, "e1", true, 50 * MIN);
  assert.equal(time(s, "e1"), 4 * MIN);
});

test("stop freezes elapsed; resume continues without reset", () => {
  let s = t.start(freshSet(), 0);
  s = t.setSolved(s, "e1", true, 2 * MIN);
  s = t.stop(s, 6 * MIN);
  assert.equal(s.session.status, "stopped");
  assert.equal(t.elapsedMs(s.session, 99 * MIN), 6 * MIN);
  s = t.resume(s, 100 * MIN);
  s = t.setSolved(s, "e2", true, 101 * MIN);
  assert.equal(time(s, "e1"), 2 * MIN);
  assert.equal(time(s, "e2"), 5 * MIN); // 4 min before stop + 1 after
});

test("unchecking the latest solve hands its time to the next solve", () => {
  let s = t.start(freshSet(), 0);
  s = t.setSolved(s, "e1", true, 3 * MIN);
  s = t.setSolved(s, "e2", true, 10 * MIN);
  s = t.setSolved(s, "e2", false, 11 * MIN);
  assert.equal(time(s, "e2"), null);
  assert.equal(s.session.lastSolveMarkMs, 3 * MIN);
  s = t.setSolved(s, "m1", true, 15 * MIN);
  assert.equal(time(s, "m1"), 12 * MIN);
  assert.equal(time(s, "e1"), 3 * MIN); // untouched
});

test("unchecking an older solve leaves other times and the reference alone", () => {
  let s = t.start(freshSet(), 0);
  s = t.setSolved(s, "e1", true, 3 * MIN);
  s = t.setSolved(s, "e2", true, 10 * MIN);
  s = t.setSolved(s, "e1", false, 11 * MIN);
  assert.equal(time(s, "e2"), 7 * MIN);
  assert.equal(s.session.lastSolveMarkMs, 10 * MIN);
});

test("solving before Start is recorded without a time", () => {
  const s = t.setSolved(freshSet(), "e1", true, 5 * MIN);
  assert.equal(s.problems.find((p) => p.id === "e1")!.solved, true);
  assert.equal(time(s, "e1"), null);
});

test("restart resets progress but keeps metadata", () => {
  const original = freshSet();
  let s = t.start(original, 0);
  s = t.setSolved(s, "e1", true, 3 * MIN);
  s = t.editTime(s, "e1", 9, 4 * MIN);
  s = t.restart(s, 5 * MIN);
  assert.deepEqual(s.session, t.initialSession());
  assert.ok(s.problems.every((p) => !p.solved && p.timeMs === null && p.solvedAtElapsedMs === null && !p.timeEdited));
  assert.equal(s.id, original.id);
  assert.equal(s.name, original.name);
  assert.equal(s.createdAt, original.createdAt);
  assert.deepEqual(s.problems.map((p) => [p.id, p.url, p.difficulty]), original.problems.map((p) => [p.id, p.url, p.difficulty]));
});

test("editTime changes only the recorded time", () => {
  let s = t.start(freshSet(), 0);
  s = t.setSolved(s, "e1", true, 3 * MIN);
  s = t.editTime(s, "e1", 7.5, 4 * MIN);
  assert.equal(time(s, "e1"), 7.5 * MIN);
  assert.equal(s.session.lastSolveMarkMs, 3 * MIN);
  s = t.setSolved(s, "e2", true, 5 * MIN);
  assert.equal(time(s, "e2"), 2 * MIN);
});

test("elapsed never goes negative if the clock moves backwards", () => {
  const s = t.start(freshSet(), 10 * MIN);
  assert.equal(t.elapsedMs(s.session, 5 * MIN), 0);
});

test("invalid transitions are no-ops", () => {
  const s = freshSet();
  assert.equal(t.pause(s, 1), s);
  assert.equal(t.resume(s, 1), s);
  assert.equal(t.stop(s, 1), s);
  const running = t.start(s, 0);
  assert.equal(t.start(running, 5), running);
});

test("generation validates input and availability", () => {
  const errs = validateInput({ name: "  ", sheetId: null, counts: { easy: 0, medium: 0, hard: 0 } });
  assert.ok(errs.name && errs.sheetId && errs.counts);
  const over = validateInput({ name: "x", sheetId: "striver-a2z", counts: { easy: 3, medium: 0, hard: 0 } }, { easy: 2, medium: 2, hard: 1 });
  assert.ok(over.easy);
  assert.throws(() => pickProblems(catalog, { easy: 3, medium: 0, hard: 0 }), InsufficientProblemsError);
});
