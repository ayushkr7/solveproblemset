/**
 * Problem-source registry. To add a source: extend `SheetId` in lib/types.ts,
 * add its metadata here and give it a `load` function. Bundled sheets read
 * their data file; live sources call this app's /api/sources/<id> route, which
 * fetches upstream on the server (lib/sources/). Callers only see a Promise.
 */
import type { LiveCatalogResponse } from "@/lib/sources/serve";
import type { CatalogProblem, SheetId } from "@/lib/types";
import { fromBlind75, fromStriverSheet } from "./problems";

export interface SheetSource {
  id: SheetId;
  name: string;
  shortName: string;
  author: string;
  description: string;
  homepage: string;
  /** `sheet`: a fixed list bundled with the app. `live`: fetched from the site and filtered for quality. */
  kind: "sheet" | "live";
  /** How a set's problems are chosen: per Easy/Medium/Hard counts, or by a rating range. */
  selectBy: "difficulty" | "rating";
  load: () => Promise<CatalogProblem[]>;
}

async function loadLive(id: SheetId): Promise<CatalogProblem[]> {
  const res = await fetch(`/api/sources/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return ((await res.json()) as LiveCatalogResponse).problems;
}

// Each sheet's data file is a separate chunk, fetched only when that sheet is used.
export const SHEETS: readonly SheetSource[] = [
  {
    id: "leetcode",
    name: "LeetCode",
    shortName: "LC",
    author: "leetcode.com",
    description: "Free, well-liked problems fetched live: 500+ likes and at least 80% positive votes.",
    homepage: "https://leetcode.com/problemset/",
    kind: "live",
    selectBy: "difficulty",
    load: () => loadLive("leetcode"),
  },
  {
    id: "codeforces",
    name: "Codeforces",
    shortName: "CF",
    author: "codeforces.com",
    description: "Problems from rated rounds since 2016, fetched live and picked by rating.",
    homepage: "https://codeforces.com/problemset",
    kind: "live",
    selectBy: "rating",
    load: () => loadLive("codeforces"),
  },
  {
    id: "striver-a2z",
    name: "Striver's A2Z DSA Sheet",
    shortName: "A2Z",
    author: "takeUforward",
    description: "A step-by-step path from fundamentals to advanced DP, graphs and tries.",
    homepage: "https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2",
    kind: "sheet",
    selectBy: "difficulty",
    load: () => import("./a2zproblemset").then((m) => fromStriverSheet(m.A2Z_PROBLEMS)),
  },
  {
    id: "striver-180",
    name: "Striver's 180 DSA Sheet",
    shortName: "180",
    author: "takeUforward",
    description: "The interview-critical core: the problems that show up again and again.",
    homepage: "https://takeuforward.org/interviews/strivers-sde-sheet-top-coding-interview-problems",
    kind: "sheet",
    selectBy: "difficulty",
    load: () => import("./striver180problemset").then((m) => fromStriverSheet(m.STRIVER_180_PROBLEMS)),
  },
  {
    id: "neetcode-blind75",
    name: "NeetCode's Blind 75",
    shortName: "B75",
    author: "NeetCode",
    description: "The classic 75 interview problems, one or two for every core pattern.",
    homepage: "https://neetcode.io/practice",
    kind: "sheet",
    selectBy: "difficulty",
    load: () => import("./neetcodeBlind75").then((m) => fromBlind75(m.NEETCODE_BLIND_75_PROBLEMS)),
  },
];

export function isSheetId(v: unknown): v is SheetId {
  return SHEETS.some((s) => s.id === v);
}

export function getSheet(id: SheetId): SheetSource {
  const sheet = SHEETS.find((s) => s.id === id);
  if (!sheet) throw new Error(`Unknown sheet: ${id}`);
  return sheet;
}

export class SheetLoadError extends Error {
  constructor(sheetName: string, cause?: unknown) {
    super(`Couldn't load problems from ${sheetName}. Check your connection and try again.`);
    this.name = "SheetLoadError";
    if (cause) (this as { cause?: unknown }).cause = cause;
  }
}

const cache = new Map<SheetId, Promise<CatalogProblem[]>>();

/** Load a sheet's problems. Results are memoised; failures are not, so a retry re-fetches. */
export function fetchSheetProblems(id: SheetId): Promise<CatalogProblem[]> {
  const hit = cache.get(id);
  if (hit) return hit;
  const sheet = getSheet(id);
  const p = sheet.load().then(
    (problems) => {
      if (!Array.isArray(problems) || problems.length === 0) throw new SheetLoadError(sheet.name);
      return problems;
    },
    (err: unknown) => {
      throw new SheetLoadError(sheet.name, err);
    },
  );
  cache.set(id, p);
  p.catch(() => cache.delete(id));
  return p;
}
