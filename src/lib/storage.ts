/**
 * Thin, failure-tolerant wrapper around localStorage. Reads never throw (private
 * mode, disabled storage); writes surface a typed error so callers can show it.
 */

export const STORAGE_PREFIX = "solve-problemset";
/** Prefix used while the app was called Blueprint DSA. Its keys are moved to STORAGE_PREFIX on first access. */
export const LEGACY_STORAGE_PREFIX = "blueprint-dsa";

export const STORAGE_KEYS = {
  theme: `${STORAGE_PREFIX}:theme`,
  legacyTheme: `${LEGACY_STORAGE_PREFIX}:theme`,
  setPrefix: `${STORAGE_PREFIX}:set:`,
  set: (id: string) => `${STORAGE_PREFIX}:set:${id}`,
} as const;

export class StorageWriteError extends Error {
  constructor(public readonly reason: "quota" | "unavailable", cause?: unknown) {
    super(
      reason === "quota"
        ? "Browser storage is full. Delete an old problem set and try again."
        : "Browser storage is unavailable. Progress cannot be saved in this browser mode.",
    );
    this.name = "StorageWriteError";
    if (cause) (this as { cause?: unknown }).cause = cause;
  }
}

let migrated = false;

/**
 * Move data saved under the old app name (`blueprint-dsa:*`) to the current
 * keys, once per page load. A key is only removed after its copy is written,
 * and an existing new key is never overwritten. If storage is full, the rest
 * stay where they are and are retried on the next load.
 */
function migrateLegacyKeys(s: Storage): void {
  migrated = true;
  try {
    const legacy: string[] = [];
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k?.startsWith(`${LEGACY_STORAGE_PREFIX}:`)) legacy.push(k);
    }
    for (const old of legacy) {
      const value = s.getItem(old);
      const next = STORAGE_PREFIX + old.slice(LEGACY_STORAGE_PREFIX.length);
      if (value !== null && s.getItem(next) === null) s.setItem(next, value);
      s.removeItem(old);
    }
  } catch {
    /* unavailable or full: try again next page load */
  }
}

function storage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    const s = window.localStorage;
    if (!migrated) migrateLegacyKeys(s);
    return s;
  } catch {
    return null;
  }
}

export function readRaw(key: string): string | null {
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeRaw(key: string, value: string): void {
  const s = storage();
  if (!s) throw new StorageWriteError("unavailable");
  try {
    s.setItem(key, value);
  } catch (err) {
    const quota =
      err instanceof DOMException &&
      (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED");
    throw new StorageWriteError(quota ? "quota" : "unavailable", err);
  }
}

export function removeRaw(key: string): void {
  try {
    storage()?.removeItem(key);
  } catch {
    /* nothing to clean up */
  }
}

export function keysWithPrefix(prefix: string): string[] {
  const s = storage();
  if (!s) return [];
  const keys: string[] = [];
  try {
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k?.startsWith(prefix)) keys.push(k);
    }
  } catch {
    /* treat as empty */
  }
  return keys;
}
