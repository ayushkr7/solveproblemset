/**
 * Workbook data → ProblemSets, with full validation. The workbook is untrusted
 * user input: every value is checked by its actual content (never by cell
 * formatting), and all issues are collected with their row so the user can fix
 * the file in one pass. Validation is all-or-nothing: one invalid row rejects
 * the whole workbook. Nothing is saved here.
 *
 * Reads format 2 (ProblemSets + Problems, linked by SetID) and format 1 (one
 * set per file: ProblemSet + Problems + optional Session), which is mapped onto
 * the same records so both share every rule.
 */
import { NAME_MAX, compareProblems, countByDifficulty, createId } from "../generate";
import { initialSession } from "../timer";
import {
  DIFFICULTIES,
  SCHEMA_VERSION,
  type Difficulty,
  type ProblemSet,
  type SessionState,
  type SetProblem,
  type SheetId,
} from "../types";
import {
  DIFFICULTY_VALUE,
  FORMAT_VERSION,
  MAX_PROBLEMS,
  MAX_SETS,
  PROBLEMS_SHEET,
  PROBLEM_NAME_MAX,
  SETS_SHEET,
  SET_ID_MAX,
  SOURCE_SHEET_LABEL,
  STATUS_VALUE,
  TIMER_STATE_VALUES,
  TIME_MINUTES_MAX,
  RATING_MAX,
  TOPIC_MAX,
  V1_PROBLEMS_SHEET,
  V1_SESSION_SHEET,
  V1_SET_SHEET,
  orList,
  valueKey,
  type Cell,
  type SheetSpec,
  type SheetTable,
  type TimerStateValue,
} from "./schema";

/** A validated set, ready to save. `ref` / `row` locate it in the workbook. */
export interface ImportedSet {
  ref: string;
  row: number;
  set: ProblemSet;
}

export type ImportResult =
  | { ok: true; format: number; sets: ImportedSet[]; warnings: string[] }
  | { ok: false; errors: string[] };

const MAX_REPORTED_ERRORS = 50;

export function importFailure(...errors: string[]): ImportResult {
  return {
    ok: false,
    errors:
      errors.length > MAX_REPORTED_ERRORS
        ? [...errors.slice(0, MAX_REPORTED_ERRORS), `…and ${errors.length - MAX_REPORTED_ERRORS} more issues.`]
        : errors,
  };
}

// ---------------------------------------------------------------------------
// Cell readers

function isBlank(c: Cell): boolean {
  if (c === null) return true;
  if (typeof c === "string") return c.trim() === "";
  if (typeof c === "object" && !(c instanceof Date)) return c.text.trim() === "" && c.href.trim() === "";
  return false;
}

/** Text content, trimmed; `null` for values that aren't text-like (dates, booleans). */
function cellText(c: Cell): string | null {
  if (c === null) return "";
  if (typeof c === "string") return c.trim();
  if (typeof c === "number") return String(c);
  if (typeof c === "object" && !(c instanceof Date)) return c.text.trim();
  return null;
}

const NUMERIC = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;

/** Numbers, or text that is purely a number ("12", " 7.5 "). */
function cellNumber(c: Cell): number | "blank" | "invalid" {
  if (isBlank(c)) return "blank";
  if (typeof c === "number") return Number.isFinite(c) ? c : "invalid";
  const s = typeof c === "string" ? c.trim() : null;
  return s !== null && NUMERIC.test(s) ? Number(s) : "invalid";
}

/** Short, quoted rendering of a cell for error messages. */
function show(c: Cell): string {
  const s =
    c instanceof Date ? (Number.isNaN(c.getTime()) ? "invalid date" : c.toISOString())
    : typeof c === "object" && c !== null ? c.text || c.href
    : String(c);
  return `“${s.length > 40 ? `${s.slice(0, 39)}…` : s}”`;
}

function isHttpUrl(s: string): boolean {
  if (s.length > 2048 || /\s/.test(s)) return false;
  try {
    const u = new URL(s);
    return (u.protocol === "https:" || u.protocol === "http:") && u.hostname.includes(".");
  } catch {
    return false;
  }
}

/** A hyperlink cell counts by its visible text if that is a URL, else by its target. */
function cellUrl(c: Cell): string | null {
  if (c !== null && typeof c === "object" && !(c instanceof Date)) {
    const text = c.text.trim();
    if (isHttpUrl(text)) return text;
    const href = c.href.trim();
    return isHttpUrl(href) ? href : null;
  }
  const s = cellText(c);
  return s && isHttpUrl(s) ? s : null;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?)?(?:Z|[+-]\d{2}:?\d{2})?$/i;

/** ISO 8601 text (or a real date value) → canonical ISO string. */
function cellIsoDate(c: Cell): string | null {
  if (c instanceof Date) return Number.isNaN(c.getTime()) ? null : c.toISOString();
  const s = typeof c === "string" ? c.trim() : null;
  const m = s ? ISO_DATE.exec(s) : null;
  if (!s || !m) return null;
  const [, y, mo, d, h = "0", mi = "0", sec = "0"] = m;
  const month = Number(mo);
  const day = Number(d);
  const daysInMonth = new Date(Date.UTC(Number(y), month, 0)).getUTCDate();
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth) return null;
  if (Number(h) > 23 || Number(mi) > 59 || Number(sec) > 59) return null;
  // Normalise to the form every engine parses: "T" separator, "+05:30" offsets.
  const t = Date.parse(s.replace(" ", "T").replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

function lookup<T extends string>(c: Cell, values: Record<T, string>): T | null {
  const s = cellText(c);
  if (!s) return null;
  const key = valueKey(s);
  return (Object.keys(values) as T[]).find((k) => valueKey(values[k]) === key || valueKey(k) === key) ?? null;
}

// ---------------------------------------------------------------------------
// Worksheet reading

interface Rec<K extends string> {
  row: number;
  get: (key: K) => Cell;
  /** Where a column's value lives, for messages: "Problems, row 7". */
  at: (key: K) => string;
}

const hasSheet = (tables: readonly SheetTable[], name: string) => tables.some((t) => t.name.trim() === name);

/**
 * Locate a worksheet and map its row-1 headers to the spec's columns.
 * Returns the non-blank data rows, or `null` when the sheet is absent or its
 * headers are unusable (an error is recorded unless an optional sheet is absent).
 */
function readSheet<K extends string>(
  tables: readonly SheetTable[],
  spec: SheetSpec<K>,
  errors: string[],
  required: boolean,
): Rec<K>[] | null {
  const table = tables.find((t) => t.name.trim() === spec.name);
  if (!table) {
    if (required) {
      const similar = tables.find((t) => valueKey(t.name) === valueKey(spec.name));
      errors.push(
        similar
          ? `Rename the worksheet “${similar.name}” to “${spec.name}” — worksheet names must match exactly.`
          : `Missing the “${spec.name}” worksheet. Found: ${tables.map((t) => `“${t.name}”`).join(", ")}.`,
      );
    }
    return null;
  }

  const header = table.rows[0]?.row === 1 ? table.rows[0] : undefined;
  if (!header || header.cells.every(isBlank)) {
    errors.push(`${spec.name}: row 1 must contain the column headers (${spec.columns.map((c) => c.header).join(", ")}).`);
    return null;
  }

  const found = new Map<string, number>();
  header.cells.forEach((c, i) => {
    const h = cellText(c);
    if (!h) return;
    if (found.has(h)) errors.push(`${spec.name}: the column “${h}” appears more than once in row 1.`);
    else found.set(h, i);
  });

  const missing = spec.columns.filter((c) => c.required && !found.has(c.header));
  if (missing.length > 0) {
    const names = missing.map((c) => {
      const near = [...found.keys()].find((h) => valueKey(h) === valueKey(c.header));
      return near ? `“${c.header}” (found “${near}” — check the spelling)` : `“${c.header}”`;
    });
    errors.push(`${spec.name}: missing required column${missing.length > 1 ? "s" : ""} ${names.join(", ")} in row 1.`);
    return null;
  }

  const index = new Map<K, number>();
  for (const c of spec.columns) {
    const i = found.get(c.header);
    if (i !== undefined) index.set(c.key, i);
  }
  return table.rows
    .filter((r) => r.row > 1)
    .map((r) => ({
      row: r.row,
      get: (key: K) => {
        const i = index.get(key);
        return i === undefined ? null : (r.cells[i] ?? null);
      },
      at: () => `${spec.name}, row ${r.row}`,
    }))
    // Rows with nothing in the schema's columns (spacing, notes elsewhere) are skipped.
    .filter((rec) => !spec.columns.every((c) => isBlank(rec.get(c.key))));
}

/** The single data row of a one-row sheet (format 1's ProblemSet and Session). */
function singleRow<K extends string>(rows: Rec<K>[], spec: SheetSpec<K>, errors: string[]): Rec<K> | null {
  if (rows.length > 1) {
    errors.push(
      `${spec.name}: found ${rows.length} rows of data (rows ${rows.map((r) => r.row).join(", ")}). ` +
        `Keep exactly one row, directly below the headers.`,
    );
    return null;
  }
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Row parsing

type SetKey = (typeof SETS_SHEET.columns)[number]["key"];
type ProblemKey = (typeof PROBLEMS_SHEET.columns)[number]["key"];

interface SetFields {
  name: string;
  sheetId: SheetId;
  createdAt: string;
  session: SessionState;
}

const refKey = (ref: string) => ref.toLowerCase();

function parseRef(rec: Rec<"setId">, errors: string[]): string | null {
  const cell = rec.get("setId");
  const ref = cellText(cell);
  const at = rec.at("setId");
  if (ref === null) errors.push(`${at}: SetID must be text or a number, not ${show(cell)}.`);
  else if (!ref) errors.push(`${at}: SetID is required.`);
  else if (ref.length > SET_ID_MAX) errors.push(`${at}: SetID is longer than ${SET_ID_MAX} characters.`);
  else return ref;
  return null;
}

/** FormatVersion is checked once for the whole sheet, not per row. */
function checkVersion(recs: Rec<SetKey>[], errors: string[]): boolean {
  for (const rec of recs) {
    const cell = rec.get("version");
    const v = cellNumber(cell);
    if (v === "blank") continue;
    if (v === "invalid" || !Number.isInteger(v) || v < 1) {
      errors.push(`${rec.at("version")}: FormatVersion ${show(cell)} must be a whole number such as ${FORMAT_VERSION}.`);
      return false;
    }
    if (v > FORMAT_VERSION) {
      errors.push(
        `This file uses format version ${v}, which is newer than this app supports (version ${FORMAT_VERSION}). ` +
          `Update the app, or export the sets again from a matching version.`,
      );
      return false;
    }
  }
  return true;
}

const TIMER_STATE_KEY = Object.fromEntries(TIMER_STATE_VALUES.map((v) => [v, v])) as Record<TimerStateValue, TimerStateValue>;

function parseSetFields(rec: Rec<SetKey>, now: number, errors: string[], warnings: string[]): SetFields | null {
  const before = errors.length;

  const nameCell = rec.get("name");
  const name = cellText(nameCell);
  if (name === null) errors.push(`${rec.at("name")}: SetName must be text, not ${show(nameCell)}.`);
  else if (!name) errors.push(`${rec.at("name")}: SetName is required.`);
  else if (name.length > NAME_MAX) errors.push(`${rec.at("name")}: SetName is ${name.length} characters; keep it to ${NAME_MAX} or fewer.`);

  const sourceCell = rec.get("source");
  const sheetId = lookup(sourceCell, SOURCE_SHEET_LABEL);
  if (!sheetId) {
    const accepted = orList(Object.values(SOURCE_SHEET_LABEL));
    errors.push(
      isBlank(sourceCell)
        ? `${rec.at("source")}: SourceSheet is required. Use ${accepted}.`
        : `${rec.at("source")}: SourceSheet ${show(sourceCell)} isn't recognised. Use ${accepted}.`,
    );
  }

  const createdCell = rec.get("createdAt");
  const createdAt = cellIsoDate(createdCell);
  if (!createdAt) {
    errors.push(
      isBlank(createdCell)
        ? `${rec.at("createdAt")}: CreatedAt is required, e.g. 2026-10-26T09:30:00Z.`
        : `${rec.at("createdAt")}: CreatedAt ${show(createdCell)} isn't an ISO 8601 date-time. Use a format like 2026-10-26T09:30:00Z.`,
    );
  }

  const session = parseSession(rec, now, errors, warnings);
  return errors.length === before && name && sheetId && createdAt && session ? { name, sheetId, createdAt, session } : null;
}

function parseSession(rec: Rec<SetKey>, now: number, errors: string[], warnings: string[]): SessionState | null {
  const elapsedCell = rec.get("elapsed");
  const seconds = cellNumber(elapsedCell);
  let ok = true;
  if (seconds === "invalid") {
    errors.push(`${rec.at("elapsed")}: ElapsedSeconds ${show(elapsedCell)} must be a number.`);
    ok = false;
  } else if (seconds !== "blank" && seconds < 0) {
    errors.push(`${rec.at("elapsed")}: ElapsedSeconds can't be negative.`);
    ok = false;
  }

  const stateCell = rec.get("state");
  const given = isBlank(stateCell) ? null : lookup(stateCell, TIMER_STATE_KEY);
  if (!isBlank(stateCell) && !given) {
    errors.push(`${rec.at("state")}: TimerState ${show(stateCell)} isn't valid. Use ${orList(TIMER_STATE_VALUES)}.`);
    ok = false;
  }
  if (!ok) return null;

  const accumulatedMs = typeof seconds === "number" ? Math.round(seconds * 1000) : 0;
  let state = given;
  if (!state) {
    state = accumulatedMs > 0 ? "Paused" : "NotStarted";
    if (accumulatedMs > 0) warnings.push(`${rec.at("state")}: TimerState is blank, so the timer was imported as Paused.`);
  }
  if (state === "NotStarted") {
    if (accumulatedMs > 0) {
      errors.push(`${rec.at("state")}: a NotStarted timer must have ElapsedSeconds = 0. Use Paused or Stopped to keep the time.`);
      return null;
    }
    return initialSession();
  }
  // Never running after import. Time spent on the in-progress problem isn't in
  // the file, so the next solve is measured from here.
  return {
    ...initialSession(),
    status: state === "Paused" ? "paused" : "stopped",
    accumulatedMs,
    lastSolveMarkMs: accumulatedMs,
    stoppedAt: state === "Stopped" ? now : null,
  };
}

interface ProblemFields {
  problem: SetProblem;
  /** Solved status was Unsolved but a time was given (ignored). */
  ignoredTime: boolean;
}

function parseProblem(rec: Rec<ProblemKey>, errors: string[]): ProblemFields | null {
  const before = errors.length;

  const titleCell = rec.get("title");
  const title = cellText(titleCell);
  if (title === null) errors.push(`${rec.at("title")}: ProblemName must be text, not ${show(titleCell)}.`);
  else if (!title) errors.push(`${rec.at("title")}: ProblemName is required.`);
  else if (title.length > PROBLEM_NAME_MAX) errors.push(`${rec.at("title")}: ProblemName is longer than ${PROBLEM_NAME_MAX} characters.`);

  const urlCell = rec.get("url");
  const url = cellUrl(urlCell);
  if (!url) {
    errors.push(
      isBlank(urlCell)
        ? `${rec.at("url")}: ProblemURL is required.`
        : `${rec.at("url")}: ProblemURL ${show(urlCell)} isn't a valid web address. Use a full link starting with https://.`,
    );
  }

  const leetCodeCell = rec.get("leetCodeUrl");
  const leetCodeUrl = isBlank(leetCodeCell) ? null : cellUrl(leetCodeCell);
  if (!isBlank(leetCodeCell) && !leetCodeUrl) {
    errors.push(
      `${rec.at("leetCodeUrl")}: LeetCodeURL ${show(leetCodeCell)} isn't a valid web address. Use a full link starting with https://, or leave it blank.`,
    );
  }

  const diffCell = rec.get("difficulty");
  const difficulty = lookup<Difficulty>(diffCell, DIFFICULTY_VALUE);
  if (!difficulty) {
    errors.push(
      `${rec.at("difficulty")}: Difficulty ${isBlank(diffCell) ? "is required" : `${show(diffCell)} isn't valid`}. ` +
        `Use ${orList(DIFFICULTIES.map((d) => DIFFICULTY_VALUE[d]))}.`,
    );
  }

  const statusCell = rec.get("status");
  const status = lookup(statusCell, STATUS_VALUE);
  if (!status) {
    errors.push(
      `${rec.at("status")}: Status ${isBlank(statusCell) ? "is required" : `${show(statusCell)} isn't valid`}. ` +
        `Use ${orList(Object.values(STATUS_VALUE))}.`,
    );
  }

  const minutesCell = rec.get("minutes");
  const minutes = cellNumber(minutesCell);
  if (minutes === "blank") errors.push(`${rec.at("minutes")}: TimeMinutes is required. Use 0 if no time was recorded.`);
  else if (minutes === "invalid") errors.push(`${rec.at("minutes")}: TimeMinutes ${show(minutesCell)} must be a number, e.g. 12.5.`);
  else if (minutes < 0) errors.push(`${rec.at("minutes")}: TimeMinutes can't be negative.`);
  else if (minutes > TIME_MINUTES_MAX) errors.push(`${rec.at("minutes")}: TimeMinutes can be at most ${TIME_MINUTES_MAX}.`);

  const orderCell = rec.get("order");
  const order = cellNumber(orderCell);
  if (order === "blank") errors.push(`${rec.at("order")}: Order is required.`);
  else if (order === "invalid" || !Number.isSafeInteger(order) || order < 1) {
    errors.push(`${rec.at("order")}: Order ${show(orderCell)} must be a whole number of 1 or more.`);
  }

  const topicCell = rec.get("topic");
  const topic = cellText(topicCell);
  if (topic === null) errors.push(`${rec.at("topic")}: Topic must be text, not ${show(topicCell)}.`);
  else if (topic.length > TOPIC_MAX) errors.push(`${rec.at("topic")}: Topic is longer than ${TOPIC_MAX} characters.`);

  const ratingCell = rec.get("rating");
  const rating = cellNumber(ratingCell);
  if (rating !== "blank" && (rating === "invalid" || !Number.isSafeInteger(rating) || rating < 1 || rating > RATING_MAX)) {
    errors.push(`${rec.at("rating")}: Rating ${show(ratingCell)} must be a whole number from 1 to ${RATING_MAX}, or blank.`);
  }

  if (errors.length > before) return null;
  const solved = status === "solved";
  const ms = Math.round((minutes as number) * 60_000);
  return {
    ignoredTime: !solved && ms > 0,
    problem: {
      id: createId(),
      title: title!,
      url: url!,
      leetCodeUrl,
      difficulty: difficulty!,
      topic: topic ?? "",
      order: order as number,
      rating: rating === "blank" ? null : (rating as number),
      solved,
      // 0 means "no time recorded" in the file → the app's "untimed".
      timeMs: solved && ms > 0 ? ms : null,
      // Unknown session positions: imported solves never move the timing reference.
      solvedAtElapsedMs: null,
      solvedAt: null,
      timeEdited: false,
    },
  };
}

/** "rows 4, 9 and 12" (shortened past a handful). */
function rowList(rows: number[]): string {
  const shown = rows.slice(0, 8).map(String);
  if (rows.length > 8) shown.push(`${rows.length - 8} more`);
  const list = shown.length > 1 ? `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}` : shown[0];
  return `row${rows.length > 1 ? "s" : ""} ${list}`;
}

// ---------------------------------------------------------------------------
// Workbook assembly

function assemble(
  setRecs: Rec<SetKey>[],
  problemRecs: Rec<ProblemKey>[],
  format: number,
  now: number,
): ImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (setRecs.length === 0) {
    return importFailure(`${SETS_SHEET.name}: there are no problem sets. Add one row per set below the headers.`);
  }
  if (setRecs.length > MAX_SETS) {
    return importFailure(`${SETS_SHEET.name}: found ${setRecs.length} sets; one file can hold at most ${MAX_SETS}.`);
  }
  if (!checkVersion(setRecs, errors)) return importFailure(...errors);

  // Sets: SetIDs must be unique; ids are registered even when other fields are
  // invalid, so problems pointing at them don't produce follow-on errors.
  const byRef = new Map<string, number>();
  const fields = setRecs.map((rec, i) => {
    const ref = parseRef(rec, errors);
    if (ref) {
      const prev = byRef.get(refKey(ref));
      if (prev !== undefined) {
        errors.push(
          `${rec.at("setId")}: SetID “${ref}” is already used in row ${setRecs[prev]!.row}. Each set needs its own SetID.`,
        );
      } else {
        byRef.set(refKey(ref), i);
      }
    }
    return { ref, data: parseSetFields(rec, now, errors, warnings) };
  });

  // Problems, grouped by their set.
  const groups = setRecs.map(() => [] as SetProblem[]);
  const referenced = setRecs.map(() => 0);
  const orders = setRecs.map(() => new Map<number, number>());
  const ignoredTimeRows: number[] = [];

  for (const rec of problemRecs) {
    const ref = parseRef(rec, errors);
    const target = ref === null ? undefined : byRef.get(refKey(ref));
    if (ref !== null && target === undefined) {
      errors.push(`${rec.at("setId")}: SetID “${ref}” doesn't match any set in ${SETS_SHEET.name}.`);
    }
    if (target !== undefined) referenced[target]!++;

    const before = errors.length;
    const parsed = parseProblem(rec, errors);
    if (parsed && target !== undefined) {
      const seen = orders[target]!;
      const prevRow = seen.get(parsed.problem.order);
      if (prevRow !== undefined) {
        errors.push(
          `${rec.at("order")}: Order ${parsed.problem.order} is already used in row ${prevRow} for SetID “${ref}”. ` +
            `Each problem in a set needs its own Order.`,
        );
      } else {
        seen.set(parsed.problem.order, rec.row);
      }
    }
    if (parsed && target !== undefined && errors.length === before) {
      groups[target]!.push(parsed.problem);
      if (parsed.ignoredTime) ignoredTimeRows.push(rec.row);
    }
  }

  fields.forEach(({ ref }, i) => {
    if (ref === null || byRef.get(refKey(ref)) !== i) return;
    const rec = setRecs[i]!;
    if (referenced[i] === 0) {
      errors.push(`${rec.at("setId")}: set “${ref}” has no problems. Add its problems to the ${PROBLEMS_SHEET.name} sheet with SetID ${ref}.`);
    } else if (referenced[i]! > MAX_PROBLEMS) {
      errors.push(`${rec.at("setId")}: set “${ref}” has ${referenced[i]} problems; a set can hold at most ${MAX_PROBLEMS}.`);
    }
  });

  if (errors.length > 0) return importFailure(...errors);

  if (ignoredTimeRows.length > 0) {
    warnings.push(
      `${PROBLEMS_SHEET.name}: TimeMinutes was ignored for ${ignoredTimeRows.length} Unsolved problem${ignoredTimeRows.length > 1 ? "s" : ""} (${rowList(ignoredTimeRows)}).`,
    );
  }

  const iso = new Date(now).toISOString();
  return {
    ok: true,
    format,
    warnings,
    sets: fields.map(({ ref, data }, i) => {
      const problems = groups[i]!.sort(compareProblems);
      return {
        ref: ref!,
        row: setRecs[i]!.row,
        set: {
          schemaVersion: SCHEMA_VERSION,
          // Always a fresh id: workbook SetIDs only link rows inside the file.
          id: createId(),
          name: data!.name,
          sheetId: data!.sheetId,
          createdAt: data!.createdAt,
          updatedAt: iso,
          requested: countByDifficulty(problems),
          problems,
          session: data!.session,
        },
      };
    }),
  };
}

/** Format 1: one set, its timer in an optional Session sheet. Mapped onto format-2 records. */
function parseV1(tables: readonly SheetTable[], now: number): ImportResult {
  const errors: string[] = [];
  const setRows = readSheet(tables, V1_SET_SHEET, errors, true);
  const problemRows = readSheet(tables, V1_PROBLEMS_SHEET, errors, true);
  const sessionRows = readSheet(tables, V1_SESSION_SHEET, errors, false);
  if (errors.length > 0 || !setRows || !problemRows) return importFailure(...errors);

  if (setRows.length === 0) return importFailure(`${V1_SET_SHEET.name}: add the set's details in row 2, below the headers.`);
  const setRec = singleRow(setRows, V1_SET_SHEET, errors);
  const sessionRec = sessionRows ? singleRow(sessionRows, V1_SESSION_SHEET, errors) : null;
  if (!setRec || errors.length > 0) return importFailure(...errors);
  if (problemRows.length === 0) {
    return importFailure(`${V1_PROBLEMS_SHEET.name}: there are no problems. Add at least one row below the headers.`);
  }

  const REF = "1";
  const set: Rec<SetKey> = {
    row: setRec.row,
    get: (k) =>
      k === "setId" ? REF
      : k === "elapsed" || k === "state" ? (sessionRec?.get(k) ?? null)
      : k === "version" ? null
      : setRec.get(k),
    at: (k) => (k === "elapsed" || k === "state") && sessionRec ? sessionRec.at(k) : setRec.at("name"),
  };
  const problems: Rec<ProblemKey>[] = problemRows.map((rec) => ({
    row: rec.row,
    get: (k) => (k === "setId" ? REF : rec.get(k)),
    at: (k) => (k === "setId" ? rec.at("title") : rec.at(k)),
  }));
  return assemble([set], problems, 1, now);
}

/** Validate a workbook and build new ProblemSets from it, each with a fresh id. */
export function parseWorkbook(tables: readonly SheetTable[], now: number = Date.now()): ImportResult {
  if (tables.length === 0) return importFailure("This workbook has no worksheets.");
  if (!hasSheet(tables, SETS_SHEET.name) && hasSheet(tables, V1_SET_SHEET.name)) return parseV1(tables, now);

  const errors: string[] = [];
  const setRecs = readSheet(tables, SETS_SHEET, errors, true);
  const problemRecs = readSheet(tables, PROBLEMS_SHEET, errors, true);
  if (errors.length > 0 || !setRecs || !problemRecs) return importFailure(...errors);
  return assemble(setRecs, problemRecs, FORMAT_VERSION, now);
}

// ---------------------------------------------------------------------------
// Names

const nameKey = (name: string) => name.trim().toLocaleLowerCase();

export function nameTaken(name: string, sets: readonly Pick<ProblemSet, "name">[]): boolean {
  const key = nameKey(name);
  return sets.some((s) => nameKey(s.name) === key);
}

/** "Arrays" → "Arrays (2)", "Arrays (3)", … — the first name not in use, within NAME_MAX. */
export function suggestName(name: string, sets: readonly Pick<ProblemSet, "name">[]): string {
  const base = name.trim().replace(/\s\(\d+\)$/, "");
  for (let n = 2; ; n++) {
    const suffix = ` (${n})`;
    const candidate = `${base.slice(0, NAME_MAX - suffix.length).trimEnd()}${suffix}`;
    if (!nameTaken(candidate, sets)) return candidate;
  }
}
