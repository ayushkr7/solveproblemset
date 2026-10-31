/**
 * Server-side memo for upstream problem lists. Fresh results are served from
 * memory; once stale, the last good result is still served while one refresh
 * runs in the background, so a slow or failing upstream never blocks a user
 * who already had data. Failed refreshes are retried at most every `retryMs`.
 */
export interface Cached<T> {
  value: T;
  fetchedAt: number;
}

export interface CacheOptions {
  ttlMs: number;
  retryMs?: number;
  now?: () => number;
}

export function cachedLoader<T>(load: () => Promise<T>, { ttlMs, retryMs = 60_000, now = Date.now }: CacheOptions): () => Promise<Cached<T>> {
  let cached: Cached<T> | null = null;
  let inflight: Promise<Cached<T>> | null = null;
  let failedAt = -Infinity;

  const refresh = (): Promise<Cached<T>> =>
    (inflight ??= load()
      .then(
        (value) => (cached = { value, fetchedAt: now() }),
        (err: unknown) => {
          failedAt = now();
          throw err;
        },
      )
      .finally(() => {
        inflight = null;
      }));

  return async () => {
    const t = now();
    if (cached && t - cached.fetchedAt < ttlMs) return cached;
    if (!cached) return refresh();
    if (t - failedAt >= retryMs) refresh().catch(() => {});
    return cached;
  };
}
