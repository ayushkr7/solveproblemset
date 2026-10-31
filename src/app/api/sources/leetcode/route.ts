import { cachedLoader } from "@/lib/sources/cache";
import { fetchLeetCodeCatalog } from "@/lib/sources/leetcode";
import { serveCatalog } from "@/lib/sources/serve";

export const dynamic = "force-dynamic";

// One full pass a day keeps traffic to LeetCode's unofficial endpoint minimal.
const getCatalog = cachedLoader(fetchLeetCodeCatalog, { ttlMs: 24 * 60 * 60 * 1000, retryMs: 5 * 60 * 1000 });

export function GET(request: Request) {
  return serveCatalog(request, getCatalog, "LeetCode");
}
