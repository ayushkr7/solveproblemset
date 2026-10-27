/**
 * Excel (.xlsx) interchange format for problem sets. This one definition drives
 * export, import validation and the in-app format guide, so they can't drift.
 *
 * Version 2 holds any number of sets in two normalised worksheets: one row per
 * set in `ProblemSets`, one row per problem in `Problems`, linked by `SetID`.
 * Version 1 (one set per file) is still accepted on import; see import.ts.
 *
 * To evolve the format: bump FORMAT_VERSION, add or change columns here, and
 * keep import.ts reading older versions. New columns should be optional so
 * earlier files stay importable.
 */
import { DIFFICULTY_LABEL, type Difficulty, type SheetId } from "../types";

export const FORMAT_VERSION = 2;

export const XLSX_EXTENSION = ".xlsx";
export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_SETS = 200;
export const MAX_PROBLEMS = 500;
export const SET_ID_MAX = 64;
export const PROBLEM_NAME_MAX = 200;
export const TOPIC_MAX = 80;
/** Same ceiling as the manual time editor in the problem table. */
export const TIME_MINUTES_MAX = 10_000;

// ---------------------------------------------------------------------------
// Accepted values

/** Spreadsheet label per source sheet. Typed by SheetId, so a new sheet must add one. */
export const SOURCE_SHEET_LABEL: Record<SheetId, string> = {
  "striver-a2z": "Striver A2Z",
  "striver-180": "Striver 180",
};

export const DIFFICULTY_VALUE: Record<Difficulty, string> = DIFFICULTY_LABEL;

export const STATUS_VALUE = { solved: "Solved", unsolved: "Unsolved" } as const;

export type TimerStateValue = "NotStarted" | "Paused" | "Stopped";
export const TIMER_STATE_VALUES: readonly TimerStateValue[] = ["NotStarted", "Paused", "Stopped"];

/** Loose key for matching accepted values: case, spaces, `-` and `_` are ignored. */
export function valueKey(s: string): string {
  return s.toLowerCase().replace(/[\s_-]+/g, "");
}

/** "A, B or C" */
export function orList(values: readonly string[]): string {
  return values.length <= 1 ? values.join("") : `${values.slice(0, -1).join(", ")} or ${values[values.length - 1]}`;
}

// ---------------------------------------------------------------------------
// Worksheets & columns

export interface ColumnSpec<K extends string = string> {
  key: K;
  /** Exact header text expected in row 1. */
  header: string;
  /** Column must be present, and every row needs a value. */
  required: boolean;
  /** Accepted values / type, as shown in the format guide. */
  format: string;
  width: number;
  numFmt?: string;
}

export interface SheetSpec<K extends string = string> {
  name: string;
  description: string;
  columns: readonly ColumnSpec<K>[];
  /** Sample rows for the format guide. */
  example?: readonly Record<K, string>[];
}

const SET_ID_COLUMN = {
  key: "setId",
  header: "SetID",
  required: true,
  width: 9,
} as const;

export const SETS_SHEET: SheetSpec<"setId" | "name" | "source" | "createdAt" | "elapsed" | "state" | "version"> = {
  name: "ProblemSets",
  description: "One row per problem set: its details and practice-timer progress.",
  columns: [
    {
      ...SET_ID_COLUMN,
      format: `Your own short label, e.g. S1 or 1 — up to ${SET_ID_MAX} characters, unique in this sheet (not case-sensitive).`,
    },
    { key: "name", header: "SetName", required: true, format: "Text, 1–60 characters.", width: 32 },
    {
      key: "source",
      header: "SourceSheet",
      required: true,
      format: `${orList(Object.values(SOURCE_SHEET_LABEL))}.`,
      width: 16,
    },
    {
      key: "createdAt",
      header: "CreatedAt",
      required: true,
      format: "ISO 8601 date-time, e.g. 2026-10-26T09:30:00Z.",
      width: 26,
    },
    {
      key: "elapsed",
      header: "ElapsedSeconds",
      required: false,
      format: "Active practice time in seconds, 0 or more. Blank means 0.",
      width: 16,
      numFmt: "0",
    },
    {
      key: "state",
      header: "TimerState",
      required: false,
      format: `${orList(TIMER_STATE_VALUES)}. Blank means NotStarted when no time is recorded, otherwise Paused.`,
      width: 14,
    },
    {
      key: "version",
      header: "FormatVersion",
      required: false,
      format: `Format version of the file: ${FORMAT_VERSION}. Exports fill it in; blank means ${FORMAT_VERSION}.`,
      width: 15,
    },
  ],
  example: [
    { setId: "S1", name: "Arrays warm-up", source: "Striver A2Z", createdAt: "2026-10-20T08:00:00Z", elapsed: "1830", state: "Paused", version: "2" },
    { setId: "S2", name: "Graphs — week 1", source: "Striver 180", createdAt: "2026-10-26T09:30:00Z", elapsed: "0", state: "NotStarted", version: "2" },
  ],
};

export const PROBLEMS_SHEET: SheetSpec<"setId" | "title" | "url" | "difficulty" | "status" | "minutes" | "order" | "topic"> = {
  name: "Problems",
  description: "One row per problem. SetID says which set the problem belongs to.",
  columns: [
    { ...SET_ID_COLUMN, format: "Must match a SetID in the ProblemSets sheet." },
    { key: "title", header: "ProblemName", required: true, format: `Text, up to ${PROBLEM_NAME_MAX} characters.`, width: 40 },
    {
      key: "url",
      header: "ProblemURL",
      required: true,
      format: "Full web address starting with https:// or http://.",
      width: 54,
    },
    {
      key: "difficulty",
      header: "Difficulty",
      required: true,
      format: `${orList(Object.values(DIFFICULTY_VALUE))}.`,
      width: 12,
    },
    {
      key: "status",
      header: "Status",
      required: true,
      format: `${orList(Object.values(STATUS_VALUE))}.`,
      width: 12,
    },
    {
      key: "minutes",
      header: "TimeMinutes",
      required: true,
      format: `Number from 0 to ${TIME_MINUTES_MAX.toLocaleString("en-US")}; decimals allowed. Use 0 when no time was recorded. Ignored for Unsolved problems.`,
      width: 13,
      numFmt: "0.00",
    },
    {
      key: "order",
      header: "Order",
      required: true,
      format: "Whole number from 1, unique within its set. Sets the sequence within each difficulty.",
      width: 8,
      numFmt: "0",
    },
    { key: "topic", header: "Topic", required: false, format: `Text, up to ${TOPIC_MAX} characters.`, width: 26 },
  ],
  example: [
    { setId: "S1", title: "Two Sum", url: "https://leetcode.com/problems/two-sum/", difficulty: "Easy", status: "Solved", minutes: "12.5", order: "1", topic: "Arrays" },
    { setId: "S1", title: "3Sum", url: "https://leetcode.com/problems/3sum/", difficulty: "Medium", status: "Unsolved", minutes: "0", order: "2", topic: "Arrays" },
    { setId: "S2", title: "Number of Islands", url: "https://leetcode.com/problems/number-of-islands/", difficulty: "Medium", status: "Unsolved", minutes: "0", order: "1", topic: "Graphs" },
    { setId: "S1", title: "Trapping Rain Water", url: "https://leetcode.com/problems/trapping-rain-water/", difficulty: "Hard", status: "Solved", minutes: "41", order: "3", topic: "Arrays" },
    { setId: "S2", title: "Course Schedule", url: "https://leetcode.com/problems/course-schedule/", difficulty: "Medium", status: "Unsolved", minutes: "0", order: "2", topic: "Graphs" },
  ],
};

export const WORKBOOK_SPEC: readonly SheetSpec[] = [SETS_SHEET, PROBLEMS_SHEET];

// ---------------------------------------------------------------------------
// Version 1 (one set per file) — import only.

export const V1_SET_SHEET: SheetSpec<"name" | "source" | "createdAt"> = {
  name: "ProblemSet",
  description: "",
  columns: SETS_SHEET.columns.filter(
    (c): c is ColumnSpec<"name" | "source" | "createdAt"> => c.key === "name" || c.key === "source" || c.key === "createdAt",
  ),
};

export const V1_PROBLEMS_SHEET: SheetSpec<Exclude<(typeof PROBLEMS_SHEET.columns)[number]["key"], "setId">> = {
  name: "Problems",
  description: "",
  columns: PROBLEMS_SHEET.columns.filter(
    (c): c is ColumnSpec<Exclude<(typeof PROBLEMS_SHEET.columns)[number]["key"], "setId">> => c.key !== "setId",
  ),
};

export const V1_SESSION_SHEET: SheetSpec<"elapsed" | "state"> = {
  name: "Session",
  description: "",
  columns: SETS_SHEET.columns
    .filter((c): c is ColumnSpec<"elapsed" | "state"> => c.key === "elapsed" || c.key === "state")
    .map((c) => ({ ...c, required: true })),
};

// ---------------------------------------------------------------------------
// Library-neutral workbook data, exchanged with the xlsx adapter (xlsx.ts).

export interface Hyperlink {
  text: string;
  href: string;
}

export type Cell = string | number | boolean | Date | Hyperlink | null;

export interface SheetRow {
  /** 1-based row number in the worksheet. */
  row: number;
  /** 0-based by column. */
  cells: Cell[];
}

export interface SheetTable {
  name: string;
  /** Only rows that exist in the file, in ascending order. */
  rows: SheetRow[];
}

export interface SheetOut {
  spec: SheetSpec;
  rows: Record<string, Cell>[];
}

export interface WorkbookOut {
  created: Date;
  sheets: SheetOut[];
}
