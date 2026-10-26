"use client";

import { useCallback, useSyncExternalStore } from "react";
import { getListSnapshot, getSetSnapshot, subscribe, type SetSnapshot } from "@/lib/problem-sets";
import type { ProblemSet } from "@/lib/types";

const serverList = (): ProblemSet[] | null => null;

/** All saved sets, newest first. `null` until hydrated on the client. */
export function useProblemSets(): ProblemSet[] | null {
  return useSyncExternalStore<ProblemSet[] | null>(subscribe, getListSnapshot, serverList);
}

/**
 * One saved set. `"loading"` before hydration, `undefined` if it doesn't
 * exist, `null` if it exists but can't be read.
 */
export function useProblemSet(id: string): SetSnapshot | "loading" {
  const get = useCallback(() => getSetSnapshot(id), [id]);
  return useSyncExternalStore<SetSnapshot | "loading">(subscribe, get, () => "loading");
}
