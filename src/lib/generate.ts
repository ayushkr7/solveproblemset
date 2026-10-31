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
/** Most problems in a set picked by rating. */
export const RATED_COUNT_MAX = 50;

export interface CreateSetInput {
  name: string;
  sheetId: SheetId | null;
  counts: DifficultyCounts;
}

export type FieldErrors = Partial<
  Record<"name" | "sheetId" | "counts" | "easy" | "medium" | "hard" | "rating" | "count", string>
>;

function validateMeta(name: string, sheetId: SheetId | null): FieldErrors {
  const errors: FieldErrors = {};
  const trimmed = name.trim();
  if (!trimmed) errors.name = "Give your problem set a name.";
  else if (trimmed.length > NAME_MAX) errors.name = `Keep the name under ${NAME_MAX} characters.`;
  if (!sheetId) errors.sheetId = "Choose a problem source.";
  return errors;
}

export function validateInput(input: CreateSetInput, available?: DifficultyCounts): FieldErrors {
  return { ...validateMeta(input.name, input.sheetId), ...validateCounts(input.counts, available) };
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

/** A set picked by rating: `count` problems rated `min`–`max` inclusive. */
export interface RatingRequest {
  min: number;
  max: number;
  count: number;
}

export function validateRatedInput(
  input: { name: string; sheetId: SheetId | null } & RatingRequest,
  available?: number,
): FieldErrors {
  return { ...validateMeta(input.name, input.sheetId), ...validateRating(input, available) };
}

/** Range and count checks, optionally against how many problems the range holds. */
export function validateRating({ min, max, count }: RatingRequest, available?: number): FieldErrors {
  const errors: FieldErrors = {};
  if (min > max) errors.rating = "The lowest rating must not be above the highest.";
  if (!Number.isInteger(count) || count < 1) errors.count = "Enter a whole number, 1 or more.";
  else if (count > RATED_COUNT_MAX) errors.count = `At most ${RATED_COUNT_MAX} problems.`;
  else if (!errors.rating && available !== undefined && count > available) {
    errors.count = `Only ${available} problem${available === 1 ? "" : "s"} rated ${ratingRange(min, max)} available.`;
  }
  return errors;
}

/** "1400" or "1200–1600" */
export function ratingRange(min: number, max: number): string {
  return min === max ? String(min) : `${min}–${max}`;
}

export function inRatingRange(p: Pick<CatalogProblem, "rating">, min: number, max: number): boolean {
  return p.rating !== undefined && p.rating >= min && p.rating <= max;
}

export class NotEnoughRatedError extends Error {
  constructor(min: number, max: number, available: number) {
    super(`Only ${available} problems rated ${ratingRange(min, max)} are available. Lower the count or widen the range.`);
    this.name = "NotEnoughRatedError";
  }
}

/**
 * Pick `count` problems rated `min`–`max`, spread evenly over the ratings in
 * that range (a ladder), lowest rating first. A rating that runs short is
 * topped up from the others.
 */
export function pickByRating(
  catalog: readonly CatalogProblem[],
  { min, max, count }: RatingRequest,
  random: () => number = Math.random,
): CatalogProblem[] {
  const buckets = new Map<number, CatalogProblem[]>();
  for (const p of catalog) {
    if (!inRatingRange(p, min, max)) continue;
    const b = buckets.get(p.rating!);
    if (b) b.push(p);
    else buckets.set(p.rating!, [p]);
  }
  const ratings = [...buckets.keys()].sort((a, b) => a - b);
  const available = ratings.reduce((n, r) => n + buckets.get(r)!.length, 0);
  if (available < count) throw new NotEnoughRatedError(min, max, available);

  const quota = new Map(ratings.map((r) => [r, 0]));
  for (let i = 0; i < count; i++) {
    const r = ratings[Math.floor(((i + 0.5) * ratings.length) / count)]!;
    quota.set(r, quota.get(r)! + 1);
  }
  let short = 0;
  for (const r of ratings) {
    const size = buckets.get(r)!.length;
    if (quota.get(r)! > size) {
      short += quota.get(r)! - size;
      quota.set(r, size);
    }
  }
  while (short > 0) {
    for (const r of ratings) {
      if (short > 0 && quota.get(r)! < buckets.get(r)!.length) {
        quota.set(r, quota.get(r)! + 1);
        short--;
      }
    }
  }

  return ratings
    .flatMap((r) => sample(buckets.get(r)!, quota.get(r)!, random))
    .sort((a, b) => a.rating! - b.rating! || a.order - b.order);
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

const urlKey = (url: string) => url.trim().toLowerCase().replace(/[?#].*$/, "").replace(/\/+$/, "");

/**
 * Matcher for "skip problems already in my other sets". Problems match by id,
 * or by URL: sets made from the older bundled catalog linked straight to LeetCode,
 * so their `url` is compared with a candidate's LeetCode link too.
 */
export function usedProblemMatcher(
  existing: readonly Pick<SetProblem, "id" | "url">[],
): (p: Pick<CatalogProblem, "id" | "url" | "leetCodeUrl">) => boolean {
  const ids = new Set(existing.map((p) => p.id));
  const urls = new Set(existing.map((p) => urlKey(p.url)));
  return (p) => ids.has(p.id) || urls.has(urlKey(p.url)) || (p.leetCodeUrl !== null && urls.has(urlKey(p.leetCodeUrl)));
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
      leetCodeUrl: p.leetCodeUrl,
      difficulty: p.difficulty,
      topic: p.topic,
      order: p.order,
      rating: p.rating ?? null,
      solved: false,
      timeMs: null,
      solvedAtElapsedMs: null,
      solvedAt: null,
      timeEdited: false,
    })),
    session: initialSession(),
  };
}
