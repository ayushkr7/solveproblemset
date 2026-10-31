/**
 * LeetCode source. LeetCode has no official public API; this reads the same
 * GraphQL problem list its problemset page uses. That endpoint is unsupported
 * and may change, and robots.txt asks crawlers to stay off /graphql, so the
 * server pages through it once and then serves from its cache (see cache.ts).
 */
import type { CatalogProblem, Difficulty } from "../types";

export const LEETCODE_GRAPHQL = "https://leetcode.com/graphql";
/** The server caps a page at 100 questions. */
export const LEETCODE_PAGE_SIZE = 100;

export const LEETCODE_QUERY = `query problemList($skip: Int!, $limit: Int!) {
  questionList(categorySlug: "algorithms", limit: $limit, skip: $skip, filters: {}) {
    totalNum
    data { questionFrontendId title titleSlug difficulty isPaidOnly likes dislikes topicTags { name } }
  }
}`;

/**
 * What "high quality" means here: free (not Premium) Algorithms problems with
 * at least 500 likes and 80% of votes positive, i.e. problems many people
 * have solved and rated well. This keeps roughly half of each tier.
 */
export const LEETCODE_QUALITY = { minLikes: 500, minLikeRatio: 0.8 } as const;

export interface LcQuestion {
  questionFrontendId: string;
  title: string;
  titleSlug: string;
  difficulty: string;
  isPaidOnly: boolean;
  likes: number;
  dislikes: number;
  topicTags: { name: string }[] | null;
}

const DIFFICULTY: Record<string, Difficulty> = { Easy: "easy", Medium: "medium", Hard: "hard" };

export function leetCodeUrl(slug: string): string {
  return `https://leetcode.com/problems/${slug}/`;
}

export function isQualityQuestion(q: LcQuestion): boolean {
  const votes = q.likes + q.dislikes;
  return !q.isPaidOnly && q.likes >= LEETCODE_QUALITY.minLikes && votes > 0 && q.likes / votes >= LEETCODE_QUALITY.minLikeRatio;
}

/** The practice-worthy questions, in LeetCode's numbering. */
export function leetCodeCatalog(questions: readonly LcQuestion[]): CatalogProblem[] {
  const seen = new Set<string>();
  return questions
    .filter((q) => {
      if (typeof q.titleSlug !== "string" || !/^[a-z0-9-]+$/.test(q.titleSlug) || seen.has(q.titleSlug)) return false;
      if (typeof q.title !== "string" || !q.title || !DIFFICULTY[q.difficulty]) return false;
      if (typeof q.likes !== "number" || typeof q.dislikes !== "number") return false;
      seen.add(q.titleSlug);
      return isQualityQuestion(q);
    })
    .map((q) => ({ q, n: Number(q.questionFrontendId) }))
    .sort((a, b) => (Number.isFinite(a.n) ? a.n : Infinity) - (Number.isFinite(b.n) ? b.n : Infinity))
    .map(({ q }, i) => {
      const url = leetCodeUrl(q.titleSlug);
      return {
        // The LeetCode slug, the same id Blind 75 problems use.
        id: q.titleSlug,
        title: q.title,
        url,
        leetCodeUrl: url,
        difficulty: DIFFICULTY[q.difficulty]!,
        topic: (q.topicTags ?? []).slice(0, 3).map((t) => t.name).join(", "),
        order: i + 1,
      };
    });
}

// --- Fetching (server only) -----------------------------------------------

const CONCURRENCY = 3;

async function page(skip: number): Promise<{ totalNum: number; data: LcQuestion[] }> {
  const res = await fetch(LEETCODE_GRAPHQL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Referer: "https://leetcode.com/problemset/" },
    body: JSON.stringify({ query: LEETCODE_QUERY, variables: { skip, limit: LEETCODE_PAGE_SIZE } }),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`LeetCode problem list: HTTP ${res.status}`);
  const body = (await res.json()) as { data?: { questionList?: { totalNum: number; data: LcQuestion[] } }; errors?: unknown };
  const list = body.data?.questionList;
  if (!list || !Array.isArray(list.data) || typeof list.totalNum !== "number") throw new Error("LeetCode problem list: unexpected response");
  return list;
}

/** ~37 small requests, at most three at a time. */
export async function fetchLeetCodeCatalog(): Promise<CatalogProblem[]> {
  const first = await page(0);
  const questions = [...first.data];
  const skips: number[] = [];
  for (let s = LEETCODE_PAGE_SIZE; s < first.totalNum; s += LEETCODE_PAGE_SIZE) skips.push(s);
  for (let i = 0; i < skips.length; i += CONCURRENCY) {
    for (const p of await Promise.all(skips.slice(i, i + CONCURRENCY).map(page))) questions.push(...p.data);
  }
  return leetCodeCatalog(questions);
}
