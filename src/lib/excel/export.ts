/**
 * ProblemSets → workbook data in the standard format. Pure: sets are only
 * read, never modified, so exporting can't disturb a running session.
 */
import { compareProblems } from "../generate";
import { elapsedMs } from "../timer";
import type { ProblemSet, TimerStatus } from "../types";
import {
  DIFFICULTY_VALUE,
  FORMAT_VERSION,
  PROBLEMS_SHEET,
  SETS_SHEET,
  SOURCE_SHEET_LABEL,
  STATUS_VALUE,
  XLSX_EXTENSION,
  type Cell,
  type SheetOut,
  type SheetSpec,
  type TimerStateValue,
  type WorkbookOut,
} from "./schema";

/** A running timer is exported as Paused at the moment of export. */
const TIMER_STATE: Record<TimerStatus, TimerStateValue> = {
  idle: "NotStarted",
  running: "Paused",
  paused: "Paused",
  stopped: "Stopped",
};

function sheet<K extends string>(spec: SheetSpec<K>, rows: Record<K, Cell>[]): SheetOut {
  return { spec, rows };
}

/** Sets keep the given order; their SetIDs are S1…Sn in that order. */
export function buildWorkbook(sets: readonly ProblemSet[], now: number): WorkbookOut {
  const refs = sets.map((_, i) => `S${i + 1}`);

  const setRows = sets.map((set, i) => {
    const state = TIMER_STATE[set.session.status];
    const elapsed = state === "NotStarted" ? 0 : elapsedMs(set.session, now);
    return {
      setId: refs[i]!,
      name: set.name,
      source: SOURCE_SHEET_LABEL[set.sheetId],
      createdAt: set.createdAt,
      elapsed: elapsed / 1000,
      state,
      version: FORMAT_VERSION,
    };
  });

  const problemRows = sets.flatMap((set, i) =>
    // Display order (Easy → Medium → Hard, then sheet order); Order numbers it 1..n per set.
    [...set.problems].sort(compareProblems).map((p, j) => ({
      setId: refs[i]!,
      title: p.title,
      url: { text: p.url, href: p.url },
      difficulty: DIFFICULTY_VALUE[p.difficulty],
      status: p.solved ? STATUS_VALUE.solved : STATUS_VALUE.unsolved,
      // Unrounded so a re-import restores the exact duration; numFmt rounds the display.
      minutes: p.solved && p.timeMs !== null ? p.timeMs / 60_000 : 0,
      order: j + 1,
      topic: p.topic || null,
    })),
  );

  return {
    created: new Date(now),
    sheets: [sheet(SETS_SHEET, setRows), sheet(PROBLEMS_SHEET, problemRows)],
  };
}

function localDate(now: number): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * - everything:  "DSA_All_Problem_Sets_2026-10-27.xlsx"
 * - one set:     "Graphs_week_1_2026-10-27.xlsx"
 * - several:     "DSA_3_Problem_Sets_2026-10-27.xlsx"
 */
export function exportFileName(sets: readonly Pick<ProblemSet, "name">[], now: number, all = false): string {
  let base: string;
  if (all) base = "DSA_All_Problem_Sets";
  else if (sets.length === 1) {
    base =
      sets[0]!.name
        .replace(/[^\p{L}\p{N}]+/gu, "_")
        .slice(0, 48)
        .replace(/^_+|_+$/g, "") || "DSA_Practice_Set";
  } else base = `DSA_${sets.length}_Problem_Sets`;
  return `${base}_${localDate(now)}${XLSX_EXTENSION}`;
}
