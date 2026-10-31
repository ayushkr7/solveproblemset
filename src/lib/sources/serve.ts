import type { CatalogProblem } from "../types";
import type { Cached } from "./cache";

/** Body of GET /api/sources/<source>. */
export interface LiveCatalogResponse {
  problems: CatalogProblem[];
  /** ISO time the server last fetched the list upstream. */
  fetchedAt: string;
}

// Each cached list is serialised once, not per request. Compression is left to
// the platform: Cloudflare compresses JSON at the edge, and a body gzipped here
// with `Content-Encoding: gzip` would be gzipped a second time by the Workers
// runtime, which browsers can't parse.
const encoded = new WeakMap<Cached<CatalogProblem[]>, string>();

function encode(cached: Cached<CatalogProblem[]>): string {
  let json = encoded.get(cached);
  if (json === undefined) {
    const body: LiveCatalogResponse = { problems: cached.value, fetchedAt: new Date(cached.fetchedAt).toISOString() };
    json = JSON.stringify(body);
    encoded.set(cached, json);
  }
  return json;
}

/** Route-handler body shared by the live sources. */
export async function serveCatalog(get: () => Promise<Cached<CatalogProblem[]>>, sourceName: string): Promise<Response> {
  let cached: Cached<CatalogProblem[]>;
  try {
    cached = await get();
  } catch (err) {
    console.error(`[sources] ${sourceName} fetch failed:`, err);
    return Response.json({ error: `${sourceName} didn't respond. Try again in a minute.` }, { status: 502 });
  }
  return new Response(encode(cached), {
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" },
  });
}
