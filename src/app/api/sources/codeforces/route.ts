import { cachedLoader } from "@/lib/sources/cache";
import { fetchCodeforcesCatalog } from "@/lib/sources/codeforces";
import { serveCatalog } from "@/lib/sources/serve";

export const dynamic = "force-dynamic";

// Ratings and solve counts drift slowly; new rounds appear a few times a week.
const getCatalog = cachedLoader(fetchCodeforcesCatalog, { ttlMs: 6 * 60 * 60 * 1000 });

export function GET(request: Request) {
  return serveCatalog(request, getCatalog, "Codeforces");
}
