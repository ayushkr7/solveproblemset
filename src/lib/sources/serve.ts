import { gzipSync } from "node:zlib";
import type { CatalogProblem } from "../types";
import type { Cached } from "./cache";

/** Body of GET /api/sources/<source>. */
export interface LiveCatalogResponse {
  problems: CatalogProblem[];
  /** ISO time the server last fetched the list upstream. */
  fetchedAt: string;
}

// `next start` doesn't compress route-handler responses, and the Codeforces list
// is ~1 MB of JSON (~10× smaller gzipped), so each cached list is encoded once here.
const encoded = new WeakMap<Cached<CatalogProblem[]>, { json: Buffer; gzip: Buffer }>();

function encode(cached: Cached<CatalogProblem[]>) {
  let e = encoded.get(cached);
  if (!e) {
    const body: LiveCatalogResponse = { problems: cached.value, fetchedAt: new Date(cached.fetchedAt).toISOString() };
    const json = Buffer.from(JSON.stringify(body));
    e = { json, gzip: gzipSync(json) };
    encoded.set(cached, e);
  }
  return e;
}

/** Route-handler body shared by the live sources. */
export async function serveCatalog(
  request: Request,
  get: () => Promise<Cached<CatalogProblem[]>>,
  sourceName: string,
): Promise<Response> {
  let cached: Cached<CatalogProblem[]>;
  try {
    cached = await get();
  } catch (err) {
    console.error(`[sources] ${sourceName} fetch failed:`, err);
    return Response.json({ error: `${sourceName} didn't respond. Try again in a minute.` }, { status: 502 });
  }
  const { json, gzip } = encode(cached);
  const useGzip = /\bgzip\b/.test(request.headers.get("accept-encoding") ?? "");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=3600",
    Vary: "Accept-Encoding",
  };
  if (useGzip) headers["Content-Encoding"] = "gzip";
  return new Response(new Uint8Array(useGzip ? gzip : json), { headers });
}
