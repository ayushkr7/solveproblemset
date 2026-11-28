/**
 * Custom problem sheets: CRUD over localStorage plus a small external store, so
 * components re-render on local writes and on writes from other tabs. Each
 * sheet lives under its own key (`solve-problemset:sheet:<id>`).
 */
import { createId } from "./generate";
import { STORAGE_KEYS, keysWithPrefix, readRaw, removeRaw, writeRaw } from "./storage";
import { DIFFICULTIES, SCHEMA_VERSION, type CatalogProblem, type CustomSheet } from "./types";

// Saved data is untrusted (hand edits, old versions).
function parseProblem(v: unknown): CatalogProblem | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.title !== "string" || typeof o.url !== "string") return null;
  if (!DIFFICULTIES.includes(o.difficulty as CatalogProblem["difficulty"])) return null;
  return {
    id: o.id,
    title: o.title,
    url: o.url,
    leetCodeUrl: typeof o.leetCodeUrl === "string" ? o.leetCodeUrl : null,
    difficulty: o.difficulty as CatalogProblem["difficulty"],
    topic: "",
    order: typeof o.order === "number" ? o.order : 0,
    ...(typeof o.rating === "number" ? { rating: o.rating } : {}),
  };
}

export function parseCustomSheetRecord(raw: string | null): CustomSheet | null {
  if (!raw) return null;
  let o: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    o = parsed as Record<string, unknown>;
  } catch {
    return null;
  }
  if (typeof o.id !== "string" || typeof o.name !== "string" || !Array.isArray(o.problems)) return null;
  const problems = o.problems.map(parseProblem).filter((p): p is CatalogProblem => p !== null);
  if (problems.length === 0) return null;
  return {
    schemaVersion: SCHEMA_VERSION,
    id: o.id,
    name: o.name,
    fileName: typeof o.fileName === "string" ? o.fileName : "",
    addedAt: typeof o.addedAt === "string" ? o.addedAt : new Date(0).toISOString(),
    problems,
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
  if (e.key === null || e.key.startsWith(STORAGE_KEYS.customSheetPrefix)) emit();
}

export function subscribeCustomSheets(listener: Listener): () => void {
  if (listeners.size === 0 && typeof window !== "undefined") window.addEventListener("storage", onStorageEvent);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== "undefined") window.removeEventListener("storage", onStorageEvent);
  };
}

let snapshot: { version: number; value: CustomSheet[] } | null = null;

/** Every saved sheet, oldest first, so a new one appears last. Stable until something changes. */
export function getCustomSheets(): CustomSheet[] {
  if (snapshot?.version === version) return snapshot.value;
  const value = keysWithPrefix(STORAGE_KEYS.customSheetPrefix)
    .map((k) => parseCustomSheetRecord(readRaw(k)))
    .filter((s): s is CustomSheet => s !== null)
    .sort((a, b) => a.addedAt.localeCompare(b.addedAt));
  snapshot = { version, value };
  return value;
}

// ---------------------------------------------------------------------------
// Mutations - saving throws StorageWriteError on failure.

export function buildCustomSheet(
  input: { name: string; fileName: string; problems: CatalogProblem[] },
  now: number = Date.now(),
): CustomSheet {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: createId(),
    name: input.name.trim(),
    fileName: input.fileName,
    addedAt: new Date(now).toISOString(),
    problems: input.problems,
  };
}

export function saveCustomSheet(sheet: CustomSheet): void {
  writeRaw(STORAGE_KEYS.customSheet(sheet.id), JSON.stringify(sheet));
  emit();
}

export function deleteCustomSheet(id: string): void {
  removeRaw(STORAGE_KEYS.customSheet(id));
  emit();
}
