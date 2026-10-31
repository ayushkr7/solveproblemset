/**
 * Codeforces source: the official public API (https://codeforces.com/apiHelp),
 * narrowed to problems worth practising. The API allows one call per 2 seconds,
 * so the server fetches it rarely and caches the result (see cache.ts).
 */
import type { CatalogProblem, Difficulty } from "../types";

export const CODEFORCES_API = "https://codeforces.com/api";

export const CF_RATING_MIN = 800;
export const CF_RATING_MAX = 3500;
export const CF_RATING_STEP = 100;
/** 800, 900, … 3500 */
export const CF_RATINGS: readonly number[] = Array.from(
  { length: (CF_RATING_MAX - CF_RATING_MIN) / CF_RATING_STEP + 1 },
  (_, i) => CF_RATING_MIN + i * CF_RATING_STEP,
);

/**
 * What "high quality" means here:
 * - rated, and from a regular rated round (no April Fools, Kotlin Heroes,
 *   unrated mirrors, language rounds…), held since 2016 so statements and
 *   tests follow the modern standard;
 * - not in the bottom quarter by solve count among such problems of the same
 *   rating. Solve counts differ ~50× between ratings, so they're only compared
 *   within one rating.
 */
export const CF_QUALITY = {
  sinceEpochSeconds: Date.UTC(2016, 0, 1) / 1000,
  minSolvedPercentile: 0.25,
} as const;

const REGULAR_ROUND = /codeforces round|educational codeforces|global round|codeton|good bye|hello 20\d\d|pinely|\bdiv\. ?[1-4]\b/i;
const IRREGULAR_ROUND = /unrated|april fools|kotlin|testing round|q#|language round|mirror/i;

export function isRegularRound(name: string): boolean {
  return REGULAR_ROUND.test(name) && !IRREGULAR_ROUND.test(name);
}

/** Codeforces rating → the app's three tiers. */
export function ratingDifficulty(rating: number): Difficulty {
  return rating < 1200 ? "easy" : rating < 1800 ? "medium" : "hard";
}

export function codeforcesUrl(contestId: number, index: string): string {
  return `https://codeforces.com/problemset/problem/${contestId}/${index}`;
}

// --- API shapes (only the fields used) ------------------------------------

export interface CfProblem {
  contestId?: number;
  index: string;
  name: string;
  type: string;
  rating?: number;
  tags: string[];
}

export interface CfProblemStatistics {
  contestId?: number;
  index: string;
  solvedCount: number;
}

export interface CfContest {
  id: number;
  name: string;
  phase: string;
  startTimeSeconds?: number;
}

export interface CfProblemset {
  problems: CfProblem[];
  problemStatistics: CfProblemStatistics[];
}

// --------------------------------------------------------------------------

/** Smallest value kept when the lowest fraction `p` of an ascending-sorted list is dropped. */
function keepFrom(sorted: readonly number[], p: number): number {
  return sorted[Math.floor(p * sorted.length)] ?? 0;
}

/** The practice-worthy problems, ordered by rating then newest contest first. */
export function codeforcesCatalog(problemset: CfProblemset, contests: readonly CfContest[]): CatalogProblem[] {
  const regular = new Set(
    contests
      .filter(
        (c) =>
          c.phase === "FINISHED" &&
          (c.startTimeSeconds ?? 0) >= CF_QUALITY.sinceEpochSeconds &&
          isRegularRound(c.name),
      )
      .map((c) => c.id),
  );
  const solved = new Map(problemset.problemStatistics.map((s) => [`${s.contestId}/${s.index}`, s.solvedCount]));

  const eligible = problemset.problems.flatMap((p) => {
    const { contestId, rating } = p;
    if (contestId === undefined || !regular.has(contestId)) return [];
    if (p.type !== "PROGRAMMING" || typeof rating !== "number" || rating < CF_RATING_MIN || rating > CF_RATING_MAX) return [];
    if (!Array.isArray(p.tags) || p.tags.includes("*special") || typeof p.name !== "string" || !p.name) return [];
    return [{ p, contestId, rating, solved: solved.get(`${contestId}/${p.index}`) ?? 0 }];
  });

  const floorByRating = new Map<number, number>();
  for (const r of CF_RATINGS) {
    const counts = eligible.filter((e) => e.rating === r).map((e) => e.solved).sort((a, b) => a - b);
    floorByRating.set(r, keepFrom(counts, CF_QUALITY.minSolvedPercentile));
  }

  return eligible
    .filter((e) => e.solved > 0 && e.solved >= (floorByRating.get(e.rating) ?? 0))
    .sort((a, b) => a.rating - b.rating || b.contestId - a.contestId || a.p.index.localeCompare(b.p.index))
    .map(({ p, contestId, rating }, i) => ({
      id: `cf-${contestId}${p.index}`,
      title: p.name,
      url: codeforcesUrl(contestId, p.index),
      leetCodeUrl: null,
      difficulty: ratingDifficulty(rating),
      topic: p.tags.slice(0, 3).join(", "),
      order: i + 1,
      rating,
    }));
}

// --- Fetching (server only) -----------------------------------------------

const CALL_GAP_MS = 2_100;

async function call<T>(method: string): Promise<T> {
  const res = await fetch(`${CODEFORCES_API}/${method}`, { cache: "no-store", signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Codeforces ${method}: HTTP ${res.status}`);
  const body = (await res.json()) as { status?: string; comment?: string; result?: T };
  if (body.status !== "OK" || body.result === undefined) throw new Error(`Codeforces ${method}: ${body.comment ?? "bad response"}`);
  return body.result;
}

/** Two API calls, spaced to respect the documented rate limit. */
export async function fetchCodeforcesCatalog(): Promise<CatalogProblem[]> {
  const problemset = await call<CfProblemset>("problemset.problems");
  await new Promise((r) => setTimeout(r, CALL_GAP_MS));
  const contests = await call<CfContest[]>("contest.list?gym=false");
  return codeforcesCatalog(problemset, contests);
}
