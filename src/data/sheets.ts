/**
 * Problem-source registry. To add a sheet: extend `SheetId` in lib/types.ts,
 * add its metadata here and give it a `load` function. A loader may read
 * bundled data (as below) or call a remote API; callers only see a Promise.
 */
import type { CatalogProblem, SheetId } from "@/lib/types";

export interface SheetSource {
  id: SheetId;
  name: string;
  shortName: string;
  author: string;
  description: string;
  homepage: string;
  load: () => Promise<CatalogProblem[]>;
}

const loadBundled = (id: SheetId) => () => import("./catalog").then((m) => m.problemsForSheet(id));

export const SHEETS: readonly SheetSource[] = [
  {
    id: "striver-a2z",
    name: "Striver's A2Z DSA Sheet",
    shortName: "A2Z",
    author: "takeUforward",
    description: "A step-by-step path from fundamentals to advanced DP, graphs and tries.",
    homepage: "https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2",
    load: loadBundled("striver-a2z"),
  },
  {
    id: "striver-180",
    name: "Striver's 180 DSA Sheet",
    shortName: "180",
    author: "takeUforward",
    description: "The interview-critical core: the problems that show up again and again.",
    homepage: "https://takeuforward.org/interviews/strivers-sde-sheet-top-coding-interview-problems",
    load: loadBundled("striver-180"),
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
