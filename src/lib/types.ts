/**
 * Domain model. Everything persisted to localStorage is described here, so the
 * shape of saved data is explicit and versioned (see SCHEMA_VERSION).
 */

export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTIES: readonly Difficulty[] = ["easy", "medium", "hard"] as const;

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export const DIFFICULTY_RANK: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

/** Identifier of a problem source. Add new sheets in `src/data/sheets.ts`. */
export type SheetId = "striver-a2z" | "striver-180";

/** A problem as it exists in a source sheet (read-only catalog data). */
export interface CatalogProblem {
  id: string;
  title: string;
  url: string;
  difficulty: Difficulty;
  topic: string;
  /** Position within the source sheet; used for stable ordering. */
  order: number;
}

export interface DifficultyCounts {
  easy: number;
  medium: number;
  hard: number;
}

/** A problem inside a user's problem set, with its practice progress. */
export interface SetProblem {
  id: string;
  title: string;
  url: string;
  difficulty: Difficulty;
  topic: string;
  order: number;
  solved: boolean;
  /** Recorded solve duration in ms of *active* practice time. `null` = no time recorded. */
  timeMs: number | null;
  /**
   * Session-elapsed timestamp (ms of active time) at which the problem was solved.
   * This is the timing reference used for the next problem's duration.
   * `null` when unsolved or solved while no session was running ("untimed").
   */
  solvedAtElapsedMs: number | null;
  /** Wall-clock epoch ms when it was marked solved. */
  solvedAt: number | null;
  /** True when the user manually edited the recorded time. */
  timeEdited: boolean;
}

export type TimerStatus = "idle" | "running" | "paused" | "stopped";

/**
 * Timer state. Elapsed time is `accumulatedMs` plus, while running, the live
 * segment `now - runningSince`. Paused / stopped time is never accumulated,
 * which is what excludes it from every recorded duration.
 */
export interface SessionState {
  status: TimerStatus;
  /** Active time banked from completed running segments. */
  accumulatedMs: number;
  /** Epoch ms at which the current running segment began; `null` unless running. */
  runningSince: number | null;
  /** Session-elapsed ms at the most recent solve (0 = session start). */
  lastSolveMarkMs: number;
  /** Epoch ms of the first Start of this session. */
  startedAt: number | null;
  /** Epoch ms of the last Stop. */
  stoppedAt: number | null;
}

export const SCHEMA_VERSION = 1;

export interface ProblemSet {
  schemaVersion: typeof SCHEMA_VERSION;
  id: string;
  name: string;
  sheetId: SheetId;
  /** ISO timestamp. Never changes, including on Restart. */
  createdAt: string;
  /** ISO timestamp of the last modification. */
  updatedAt: string;
  requested: DifficultyCounts;
  problems: SetProblem[];
  session: SessionState;
}
