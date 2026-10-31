/**
 * Problem-set repository: CRUD over localStorage plus a tiny external store so
 * React components (via useSyncExternalStore) re-render on local writes and on
 * writes from other tabs.
 *
 * Each set lives under its own key (`solve-problemset:set:<id>`), so sets are fully
 * independent: writing or deleting one never rewrites another.
 */
import { initialSession } from "./timer";
import {
  DIFFICULTIES,
  SCHEMA_VERSION,
  type ProblemSet,
  type SessionState,
  type SetProblem,
  type TimerStatus,
} from "./types";
import { STORAGE_KEYS, keysWithPrefix, readRaw, removeRaw, writeRaw } from "./storage";
import { isSheetId } from "@/data/sheets";

// ---------------------------------------------------------------------------
// Parsing / validation — saved data is untrusted (hand edits, old versions).

const STATUSES: readonly TimerStatus[] = ["idle", "running", "paused", "stopped"];

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function numOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function parseSession(v: unknown): SessionState {
  if (!v || typeof v !== "object") return initialSession();
  const o = v as Record<string, unknown>;
  const status = STATUSES.includes(o.status as TimerStatus) ? (o.status as TimerStatus) : "idle";
  const runningSince = numOrNull(o.runningSince);
  return {
    // A "running" session without a start reference cannot be resumed accurately.
    status: status === "running" && runningSince === null ? "paused" : status,
    accumulatedMs: Math.max(0, num(o.accumulatedMs, 0)),
    runningSince: status === "running" ? runningSince : null,
    lastSolveMarkMs: Math.max(0, num(o.lastSolveMarkMs, 0)),
    startedAt: numOrNull(o.startedAt),
    stoppedAt: numOrNull(o.stoppedAt),
  };
}

function parseProblem(v: unknown, index: number): SetProblem | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.title !== "string" || typeof o.url !== "string") return null;
  if (!DIFFICULTIES.includes(o.difficulty as SetProblem["difficulty"])) return null;
  const solved = o.solved === true;
  return {
    id: o.id,
    title: o.title,
    url: o.url,
    leetCodeUrl: typeof o.leetCodeUrl === "string" ? o.leetCodeUrl : null,
    difficulty: o.difficulty as SetProblem["difficulty"],
    topic: typeof o.topic === "string" ? o.topic : "",
    rating: typeof o.rating === "number" && Number.isFinite(o.rating) ? o.rating : null,
    order: num(o.order, index),
    solved,
    timeMs: solved ? numOrNull(o.timeMs) : null,
    solvedAtElapsedMs: solved ? numOrNull(o.solvedAtElapsedMs) : null,
    solvedAt: solved ? numOrNull(o.solvedAt) : null,
    timeEdited: solved && o.timeEdited === true,
  };
}

export function parseProblemSet(raw: string | null): ProblemSet | null {
  if (!raw) return null;
  let o: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    o = parsed as Record<string, unknown>;
  } catch {
    return null;
  }
  if (typeof o.id !== "string" || typeof o.name !== "string" || !isSheetId(o.sheetId)) return null;
  if (!Array.isArray(o.problems)) return null;
  const problems = o.problems.map(parseProblem).filter((p): p is SetProblem => p !== null);
  const req = (o.requested ?? {}) as Record<string, unknown>;
  const createdAt = typeof o.createdAt === "string" ? o.createdAt : new Date(0).toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    id: o.id,
    name: o.name,
    sheetId: o.sheetId,
    createdAt,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : createdAt,
    requested: { easy: num(req.easy, 0), medium: num(req.medium, 0), hard: num(req.hard, 0) },
    problems,
    session: parseSession(o.session),
  };
}

// ---------------------------------------------------------------------------
// External store

type Listener = () => void;
const listeners = new Set<Listener>();
let version = 0;

function emit() {
  version++;
  listeners.forEach((l) => l());
}

function onStorageEvent(e: StorageEvent) {
  if (e.key === null || e.key.startsWith(STORAGE_KEYS.setPrefix)) emit();
}

export function subscribe(listener: Listener): () => void {
  if (listeners.size === 0 && typeof window !== "undefined") {
    window.addEventListener("storage", onStorageEvent);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("storage", onStorageEvent);
    }
  };
}

// Parsed sets are cached by their raw JSON, so unchanged sets keep the same
// object identity across store versions (required by useSyncExternalStore).
const parsedCache = new Map<string, { raw: string; value: ProblemSet | null }>();

function readSet(id: string): ProblemSet | null {
  const raw = readRaw(STORAGE_KEYS.set(id));
  if (raw === null) {
    parsedCache.delete(id);
    return null;
  }
  const cached = parsedCache.get(id);
  if (cached && cached.raw === raw) return cached.value;
  const value = parseProblemSet(raw);
  parsedCache.set(id, { raw, value });
  return value;
}

/** Snapshot for one set: `undefined` = not found, `null` = present but unreadable. */
export type SetSnapshot = ProblemSet | null | undefined;

const setSnapshots = new Map<string, { version: number; value: SetSnapshot }>();

export function getSetSnapshot(id: string): SetSnapshot {
  const cached = setSnapshots.get(id);
  if (cached && cached.version === version) return cached.value;
  const exists = readRaw(STORAGE_KEYS.set(id)) !== null;
  const value = exists ? readSet(id) : undefined;
  setSnapshots.set(id, { version, value });
  return value;
}

let listSnapshot: { version: number; value: ProblemSet[] } | null = null;

export function getListSnapshot(): ProblemSet[] {
  if (listSnapshot && listSnapshot.version === version) return listSnapshot.value;
  const sets = keysWithPrefix(STORAGE_KEYS.setPrefix)
    .map((k) => readSet(k.slice(STORAGE_KEYS.setPrefix.length)))
    .filter((s): s is ProblemSet => s !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  // Keep identity if nothing visible changed.
  const prev = listSnapshot?.value;
  const same = prev && prev.length === sets.length && prev.every((s, i) => s === sets[i]);
  listSnapshot = { version, value: same ? prev : sets };
  return listSnapshot.value;
}

// ---------------------------------------------------------------------------
// Mutations — all throw StorageWriteError on failure.

export function saveSet(set: ProblemSet): void {
  writeRaw(STORAGE_KEYS.set(set.id), JSON.stringify(set));
  emit();
}

/**
 * Save several *new* sets as one unit (bulk import). If any write fails, the
 * ones already written are removed again, so storage is never left partially
 * imported. Existing sets are never touched: an id already in use is refused.
 */
export function saveNewSets(sets: readonly ProblemSet[]): void {
  const written: string[] = [];
  try {
    for (const set of sets) {
      const key = STORAGE_KEYS.set(set.id);
      if (readRaw(key) !== null) throw new Error(`A set with id ${set.id} already exists`);
      writeRaw(key, JSON.stringify(set));
      written.push(key);
    }
  } catch (err) {
    written.forEach(removeRaw);
    throw err;
  }
  if (written.length > 0) emit();
}

/**
 * Apply `updater` to the latest stored version of a set. Reading fresh from
 * storage (rather than a React snapshot) avoids clobbering a concurrent write.
 */
export function updateSet(id: string, updater: (set: ProblemSet) => ProblemSet): ProblemSet | null {
  const current = parseProblemSet(readRaw(STORAGE_KEYS.set(id)));
  if (!current) return null;
  const next = updater(current);
  if (next !== current) saveSet(next);
  return next;
}

export function deleteSet(id: string): void {
  removeRaw(STORAGE_KEYS.set(id));
  parsedCache.delete(id);
  emit();
}
