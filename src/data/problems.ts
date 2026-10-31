/**
 * Adapters from the source files (a2zproblemset.ts, striver180problemset.ts,
 * neetcodeBlind75.ts — the source of truth for each sheet) to CatalogProblem.
 * Kept free of data imports so each sheet's file is loaded only when needed.
 */
import type { CatalogProblem, Difficulty } from "../lib/types";
import type { Blind75Problem } from "./neetcodeBlind75";
import type { Striver180Problem } from "./striver180problemset";
import type { A2ZProblem } from "./a2zproblemset";

const DIFFICULTY: Record<"Easy" | "Medium" | "Hard", Difficulty> = { Easy: "easy", Medium: "medium", Hard: "hard" };

/** Path segment after `marker` ("…/dsa/two-sum" → "two-sum"); ids stay stable when the sheet is reordered. */
function slugAfter(url: string, marker: string): string {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  const i = parts.indexOf(marker);
  const slug = i >= 0 ? parts[i + 1] : parts[parts.length - 1];
  if (!slug) throw new Error(`No problem slug in ${url}`);
  return decodeURIComponent(slug);
}

/** Striver sheets: the title links to takeUforward; ids are TUF slugs. */
export function fromStriverSheet(rows: readonly (A2ZProblem | Striver180Problem)[]): CatalogProblem[] {
  return rows.map((r) => ({
    id: slugAfter(r.tufUrl, "dsa"),
    title: r.problem,
    url: r.tufUrl,
    leetCodeUrl: r.leetCodeUrl,
    difficulty: DIFFICULTY[r.difficulty],
    topic: "",
    order: r.sNo,
  }));
}

/** Blind 75: the title links to NeetCode's practice page; ids are LeetCode slugs. */
export function fromBlind75(rows: readonly Blind75Problem[]): CatalogProblem[] {
  return rows.map((r) => ({
    id: slugAfter(r.leetCodeUrl, "problems"),
    title: r.problem,
    url: r.neetCodeUrl,
    leetCodeUrl: r.leetCodeUrl,
    difficulty: DIFFICULTY[r.difficulty],
    topic: "",
    order: r.sNo,
  }));
}
