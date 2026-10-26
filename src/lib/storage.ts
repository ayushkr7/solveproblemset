/**
 * Thin, failure-tolerant wrapper around localStorage. Reads never throw (private
 * mode, disabled storage); writes surface a typed error so callers can show it.
 */

export const STORAGE_PREFIX = "blueprint-dsa";

export const STORAGE_KEYS = {
  theme: `${STORAGE_PREFIX}:theme`,
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

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
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
