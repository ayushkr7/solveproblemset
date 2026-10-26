/**
 * Pure practice-session logic. Every function takes a ProblemSet (plus the
 * current wall-clock time where relevant) and returns a new ProblemSet; nothing
 * here touches storage or the DOM, which keeps the timing rules testable.
 *
 * Timing model
 * ------------
 * - "Elapsed" is active practice time only: accumulated running segments plus
 *   the live segment while running. Paused/stopped intervals never count.
 * - Each solve records `elapsed - lastSolveMark` and moves the mark to `elapsed`,
 *   so the first solve measures from session start and each later solve from
 *   the previous one.
 * - Unchecking the most recent solve rolls the mark back to the previous solve,
 *   so the time spent is carried into the next solve instead of being lost.
 *   Unchecking an older solve only clears that problem; other recorded times
 *   are never rewritten.
 */
import type { ProblemSet, SessionState, SetProblem } from "./types";

export function initialSession(): SessionState {
  return {
    status: "idle",
    accumulatedMs: 0,
    runningSince: null,
    lastSolveMarkMs: 0,
    startedAt: null,
    stoppedAt: null,
  };
}

/** Active elapsed time of the session at wall-clock `now`. */
export function elapsedMs(session: SessionState, now: number): number {
  const live =
    session.status === "running" && session.runningSince !== null
      ? Math.max(0, now - session.runningSince) // clamp: guards against clock moving backwards
      : 0;
  return session.accumulatedMs + live;
}

/** Time since the last solve (or session start): the problem currently being worked on. */
export function currentSplitMs(session: SessionState, now: number): number {
  return Math.max(0, elapsedMs(session, now) - session.lastSolveMarkMs);
}

function touch(set: ProblemSet, now: number): ProblemSet {
  return { ...set, updatedAt: new Date(now).toISOString() };
}

function withSession(set: ProblemSet, session: SessionState, now: number): ProblemSet {
  return touch({ ...set, session }, now);
}

export function start(set: ProblemSet, now: number): ProblemSet {
  if (set.session.status !== "idle") return set;
  return withSession(
    set,
    { ...initialSession(), status: "running", runningSince: now, startedAt: now },
    now,
  );
}

export function pause(set: ProblemSet, now: number): ProblemSet {
  const s = set.session;
  if (s.status !== "running") return set;
  return withSession(
    set,
    { ...s, status: "paused", accumulatedMs: elapsedMs(s, now), runningSince: null },
    now,
  );
}

/** Continue from paused or stopped without touching banked time or progress. */
export function resume(set: ProblemSet, now: number): ProblemSet {
  const s = set.session;
  if (s.status !== "paused" && s.status !== "stopped") return set;
  return withSession(set, { ...s, status: "running", runningSince: now, stoppedAt: null }, now);
}

/** End the session, freezing elapsed time; progress and recorded timings are kept. */
export function stop(set: ProblemSet, now: number): ProblemSet {
  const s = set.session;
  if (s.status !== "running" && s.status !== "paused") return set;
  return withSession(
    set,
    {
      ...s,
      status: "stopped",
      accumulatedMs: elapsedMs(s, now),
      runningSince: null,
      stoppedAt: now,
    },
    now,
  );
}

/**
 * Reset all practice progress for this set. Name, sheet, problems, URLs,
 * difficulties and createdAt are kept as-is.
 */
export function restart(set: ProblemSet, now: number): ProblemSet {
  return touch(
    {
      ...set,
      problems: set.problems.map(resetProblem),
      session: initialSession(),
    },
    now,
  );
}

function resetProblem(p: SetProblem): SetProblem {
  return { ...p, solved: false, timeMs: null, solvedAtElapsedMs: null, solvedAt: null, timeEdited: false };
}

export function setSolved(set: ProblemSet, problemId: string, solved: boolean, now: number): ProblemSet {
  const target = set.problems.find((p) => p.id === problemId);
  if (!target || target.solved === solved) return set;
  return solved ? markSolved(set, target, now) : markUnsolved(set, target, now);
}

function markSolved(set: ProblemSet, target: SetProblem, now: number): ProblemSet {
  const s = set.session;
  // No session yet: record the solve without inventing a duration.
  if (s.status === "idle") {
    return replaceProblem(set, { ...target, solved: true, solvedAt: now, timeMs: null, solvedAtElapsedMs: null, timeEdited: false }, s, now);
  }
  const elapsed = elapsedMs(s, now);
  const duration = Math.max(0, elapsed - s.lastSolveMarkMs);
  return replaceProblem(
    set,
    {
      ...target,
      solved: true,
      solvedAt: now,
      timeMs: duration,
      solvedAtElapsedMs: elapsed,
      timeEdited: false,
    },
    { ...s, lastSolveMarkMs: elapsed },
    now,
  );
}

function markUnsolved(set: ProblemSet, target: SetProblem, now: number): ProblemSet {
  const s = set.session;
  let lastSolveMarkMs = s.lastSolveMarkMs;
  if (target.solvedAtElapsedMs !== null && target.solvedAtElapsedMs === s.lastSolveMarkMs) {
    // Roll the reference back to the latest remaining timed solve (or session start).
    lastSolveMarkMs = set.problems.reduce(
      (max, p) =>
        p.id !== target.id && p.solved && p.solvedAtElapsedMs !== null
          ? Math.max(max, p.solvedAtElapsedMs)
          : max,
      0,
    );
  }
  return replaceProblem(set, resetProblem(target), { ...s, lastSolveMarkMs }, now);
}

/** Manually set a solved problem's recorded time. Does not move timing references. */
export function editTime(set: ProblemSet, problemId: string, minutes: number, now: number): ProblemSet {
  const target = set.problems.find((p) => p.id === problemId);
  if (!target || !target.solved || !Number.isFinite(minutes) || minutes < 0) return set;
  return replaceProblem(
    set,
    { ...target, timeMs: Math.round(minutes * 60_000), timeEdited: true },
    set.session,
    now,
  );
}

function replaceProblem(set: ProblemSet, next: SetProblem, session: SessionState, now: number): ProblemSet {
  return touch(
    { ...set, session, problems: set.problems.map((p) => (p.id === next.id ? next : p)) },
    now,
  );
}

export interface SetStats {
  total: number;
  solved: number;
  remaining: number;
  percent: number;
  recordedMs: number;
  timedCount: number;
  averageMs: number | null;
}

export function getStats(set: ProblemSet): SetStats {
  const total = set.problems.length;
  let solved = 0;
  let recordedMs = 0;
  let timedCount = 0;
  for (const p of set.problems) {
    if (!p.solved) continue;
    solved++;
    if (p.timeMs !== null) {
      recordedMs += p.timeMs;
      timedCount++;
    }
  }
  return {
    total,
    solved,
    remaining: total - solved,
    percent: total === 0 ? 0 : Math.round((solved / total) * 100),
    recordedMs,
    timedCount,
    averageMs: timedCount === 0 ? null : recordedMs / timedCount,
  };
}

/** Whether there is anything for Restart to clear. */
export function hasProgress(set: ProblemSet): boolean {
  return set.session.status !== "idle" || set.problems.some((p) => p.solved);
}
