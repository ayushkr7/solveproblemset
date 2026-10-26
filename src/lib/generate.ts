/**
 * Problem-set generation: validation, sampling by difficulty, and assembly of
 * a new ProblemSet record.
 */
import { initialSession } from "./timer";
import {
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  DIFFICULTY_RANK,
  SCHEMA_VERSION,
  type CatalogProblem,
  type DifficultyCounts,
  type ProblemSet,
  type SetProblem,
  type SheetId,
} from "./types";

export const NAME_MAX = 60;
export const PER_DIFFICULTY_MAX = 50;

export interface CreateSetInput {
  name: string;
  sheetId: SheetId | null;
  counts: DifficultyCounts;
}

export type FieldErrors = Partial<Record<"name" | "sheetId" | "counts" | "easy" | "medium" | "hard", string>>;

export function validateInput(input: CreateSetInput, available?: DifficultyCounts): FieldErrors {
  const errors: FieldErrors = {};
  const name = input.name.trim();
  if (!name) errors.name = "Give your problem set a name.";
  else if (name.length > NAME_MAX) errors.name = `Keep the name under ${NAME_MAX} characters.`;

  if (!input.sheetId) errors.sheetId = "Choose a problem source.";

  return { ...errors, ...validateCounts(input.counts, available) };
}

/** Per-difficulty count checks, optionally against what the sheet can supply. */
export function validateCounts(counts: DifficultyCounts, available?: DifficultyCounts): FieldErrors {
  const errors: FieldErrors = {};
  for (const d of DIFFICULTIES) {
    const n = counts[d];
    if (!Number.isInteger(n) || n < 0) errors[d] = "Enter a whole number, 0 or more.";
    else if (n > PER_DIFFICULTY_MAX) errors[d] = `At most ${PER_DIFFICULTY_MAX} per difficulty.`;
    else if (available && n > available[d]) {
      errors[d] = `Only ${available[d]} ${DIFFICULTY_LABEL[d].toLowerCase()} problem${available[d] === 1 ? "" : "s"} available.`;
    }
  }
  const total = DIFFICULTIES.reduce((sum, d) => sum + (counts[d] || 0), 0);
  if (total === 0 && !errors.easy && !errors.medium && !errors.hard) {
    errors.counts = "Add at least one problem.";
  }
  return errors;
}

export function countByDifficulty(problems: readonly Pick<CatalogProblem, "difficulty">[]): DifficultyCounts {
  const counts: DifficultyCounts = { easy: 0, medium: 0, hard: 0 };
  for (const p of problems) counts[p.difficulty]++;
  return counts;
}

/** Fisher–Yates sample of `k` items without replacement. */
function sample<T>(items: readonly T[], k: number, random: () => number): T[] {
  const pool = items.slice();
  const n = Math.min(k, pool.length);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(random() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, n);
}

/** Easy → Medium → Hard, then by position in the source sheet. */
export function compareProblems(a: Pick<SetProblem, "difficulty" | "order">, b: Pick<SetProblem, "difficulty" | "order">): number {
  return DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty] || a.order - b.order;
}

export class InsufficientProblemsError extends Error {
  constructor(public readonly shortfall: Partial<DifficultyCounts>) {
    const parts = DIFFICULTIES.filter((d) => shortfall[d]).map(
      (d) => `${shortfall[d]} more ${DIFFICULTY_LABEL[d].toLowerCase()}`,
    );
    super(`Not enough problems in this sheet: need ${parts.join(", ")}. Lower the counts and try again.`);
    this.name = "InsufficientProblemsError";
  }
}

/** Randomly pick the requested number of problems per difficulty. */
export function pickProblems(
  catalog: readonly CatalogProblem[],
  counts: DifficultyCounts,
  random: () => number = Math.random,
): CatalogProblem[] {
  const picked: CatalogProblem[] = [];
  const shortfall: Partial<DifficultyCounts> = {};
  for (const d of DIFFICULTIES) {
    const pool = catalog.filter((p) => p.difficulty === d);
    if (pool.length < counts[d]) shortfall[d] = counts[d] - pool.length;
    picked.push(...sample(pool, counts[d], random));
  }
  if (Object.keys(shortfall).length > 0) throw new InsufficientProblemsError(shortfall);
  return picked.sort(compareProblems);
}

export function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildProblemSet(
  input: { name: string; sheetId: SheetId; counts: DifficultyCounts },
  problems: readonly CatalogProblem[],
  now: number = Date.now(),
): ProblemSet {
  const iso = new Date(now).toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    id: createId(),
    name: input.name.trim(),
    sheetId: input.sheetId,
    createdAt: iso,
    updatedAt: iso,
    requested: { ...input.counts },
    problems: problems.map((p) => ({
      id: p.id,
      title: p.title,
      url: p.url,
      difficulty: p.difficulty,
      topic: p.topic,
      order: p.order,
      solved: false,
      timeMs: null,
      solvedAtElapsedMs: null,
      solvedAt: null,
      timeEdited: false,
    })),
    session: initialSession(),
  };
}
