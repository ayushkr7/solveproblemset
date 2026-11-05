import { SHEETS } from "@/data/sheets";
import { DRIVE_ENABLED } from "@/lib/drive/config";
import { SITE } from "@/lib/site";

// Built once at build time, like the landing page, so sheet counts stay current.
export const dynamic = "force-static";

/** Served as /llms.txt: a plain-Markdown summary of the site for language models (llmstxt.org). */
export async function GET() {
  const page = (path: string) => new URL(path, SITE.url).href;

  const sources = await Promise.all(
    SHEETS.map(async (s) => {
      const pick = s.selectBy === "rating" ? "Rating range 800–3500." : "Picked by difficulty (Easy / Medium / Hard).";
      // Live sources' descriptions already say where they come from.
      const head = s.kind === "sheet" ? `- [${s.name}](${s.homepage}) (${s.author})` : `- [${s.name}](${s.homepage})`;
      const count = s.kind === "sheet" ? ` ${(await s.load()).length} problems.` : "";
      return `${head}: ${s.description}${count} ${pick}`;
    }),
  );

  const backup = DRIVE_ENABLED
    ? "Sets can be exported to and imported from an Excel file or the user's own Google Drive."
    : "Sets can be exported to and imported from an Excel file.";

  const body = `# ${SITE.name}

> ${SITE.name} is a free web app for coding-interview and competitive-programming practice. It generates problem sets from curated DSA sheets, LeetCode and Codeforces by difficulty or rating, and records the time spent on each problem.

- Problems link to their pages on the original sites; ${SITE.name} does not host problem statements or judge solutions.
- Each solve's recorded time is the active time since the previous solve. Paused time is excluded.
- No account is required. Sets and progress are stored in the browser's localStorage. ${backup}

## Pages

- [Home](${page("/")}): Overview of features, the timing model and problem sources
- [Create a problem set](${page("/create")}): Choose a source and a difficulty mix or rating range, then generate a set
- [Previous sets](${page("/sets")}): Sets saved in this browser, with completion and per-problem times

## Problem sources

${sources.join("\n")}

## Optional

- [Privacy Policy](${page("/privacy")})
- [Terms of Service](${page("/terms")})
- [Source code](${SITE.repoUrl})
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
