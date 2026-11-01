# Solve Problemset

A client-side DSA / competitive-programming practice tracker. Build personalised problem sets from Striver's A2Z and 180 sheets, NeetCode's Blind 75, or live, quality-filtered pools from LeetCode (by difficulty) and Codeforces (by rating). Time every solve and resume where you left off. Sets persist in `localStorage`.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
npm test           # timing-logic unit tests
npm run typecheck
```

## Structure

```
src/
  app/                    routes: / (landing), /create, /sets, /sets/[id]
    api/sources/          GET /api/sources/leetcode, /api/sources/codeforces (server-side fetch + cache)
  components/             shared UI (header, theme toggle, confirm dialog, badges)
    ui/                   shadcn/ui-style components on Base UI (@base-ui/react): button, dialog,
                          alert-dialog, checkbox, radio-group, number-field, select, toggle, toast,
                          progress, field, input. Styled by globals.css tokens, not Tailwind; use
                          these instead of native controls or new primitives
    create/               problem-set form
    sets/                 previous-sets listing
    set-detail/           timer panel, problems table, detail page
  data/
    sheets.ts             problem-source registry (add new sheets here)
    a2zproblemset.ts      Striver A2Z problems (source of truth)
    striver180problemset.ts  Striver 180 problems (source of truth)
    neetcodeBlind75.ts    NeetCode Blind 75 problems (source of truth)
    problems.ts           maps those files onto CatalogProblem
  hooks/                  useProblemSets / useProblemSet (external store), useNow
  lib/
    timer.ts              pure session/timing logic (fully unit-tested)
    problem-sets.ts       localStorage repository + subscribable store
    generate.ts           validation, sampling (by difficulty or rating), set construction
    sources/              live sources: leetcode.ts, codeforces.ts (fetch + quality filter), cache.ts, serve.ts
    storage.ts, theme.ts, format.ts, types.ts
    excel/                .xlsx import/export (see below)
tests/                    timer, excel, sources (bundled sheets), live-sources
```

## Timing model

- Elapsed = banked active time + the live running segment. Paused or stopped time never accrues.
- Marking a problem solved records `elapsed − lastSolveMark` (the first solve measures from Start), then moves the mark.
- Unticking the most recent solve rolls the mark back, so its time carries into the next solve. Unticking an older solve clears only that problem.
- Problems ticked before Start are saved as *untimed*. Any solved problem's time can be edited by hand.
- The timer stores timestamps (`runningSince`), not tick counts, so reloads, navigation and throttled background tabs don't cause drift.

## Storage

Each set is stored under its own key, `solve-problemset:set:<uuid>`, so sets are independent. The theme is stored under `solve-problemset:theme`. Data saved before the rename (`blueprint-dsa:*`) is moved to these keys the first time the app touches storage. Saved data is validated when it's read, and the record carries a `schemaVersion` for future migrations. Changes made in other tabs sync through the `storage` event.

## Excel import / export

On My Sets you can select sets and export them (**Export selected**, **Export all**, or a card's **Export**) into a single `.xlsx` workbook, and import any number of sets from one workbook (**Import sets**). The info button next to Import sets shows the format in the app.

Format version 2 has two worksheets, linked by `SetID`:
- `ProblemSets`: one row per set, with `SetID`, `SetName`, `SourceSheet` and `CreatedAt`, plus optional `ElapsedSeconds`, `TimerState` and `FormatVersion`.
- `Problems`: one row per problem, with `SetID`, `ProblemName`, `ProblemURL`, `Difficulty`, `Status`, `TimeMinutes` and `Order`, plus optional `LeetCodeURL`, `Topic` and `Rating` (Codeforces).

Single-set files in format 1 (`ProblemSet` / `Problems` / `Session` worksheets) can still be imported.

- `lib/excel/schema.ts` is the single definition of the format. Export, import validation and the in-app guide all read from it. To change the format, bump `FORMAT_VERSION` there.
- `import.ts` validates the whole workbook up front: one bad row rejects the file. `plan.ts` decides what happens to each set (import, rename or skip) when names clash with saved sets or with each other. `export.ts` builds the workbook. All three are pure and unit-tested.
- `xlsx.ts` is the only code that uses ExcelJS, which is loaded on demand. `transfer.ts` handles the browser side (file checks, download).
- Importing shows a preview first. Saving goes through `saveNewSets`, which writes every set or none: if any write fails, the sets already written are removed. Each imported set gets a new id, so existing sets are never overwritten. Imported timers are never running.

## Problem data

None of the sheets has a public API, so each is bundled as its own file in `data/`. Those three files are the source of truth: Striver A2Z (431 problems), Striver 180 (179) and NeetCode Blind 75 (75). Each problem links to the sheet's own practice page (takeUforward or NeetCode) and, where there is one, to LeetCode. `data/problems.ts` maps the rows onto `CatalogProblem`. Problem ids are slugs from the problem links (the takeUforward slug for Striver, the LeetCode slug for Blind 75), so they stay stable if a sheet is reordered.

Each sheet loads lazily through `fetchSheetProblems`, so a remote source could replace a file without UI changes. To update a sheet, edit its file; to add one, follow the comment at the top of `data/sheets.ts`.

## Live sources

LeetCode and Codeforces are fetched by this app's server, never by the browser, and filtered down to problems worth practising. Each route caches its list in memory: once the list is stale it keeps serving the last good copy while a single refresh runs, and a failed refresh never takes the list away. The lists are sent as plain JSON, about 1.1 MB for Codeforces and 0.5 MB for LeetCode. Cloudflare compresses them at the edge to about 140 KB and 70 KB; a local `next start` sends them uncompressed. Don't gzip them in the route: the Workers runtime would compress them a second time.

| | Codeforces | LeetCode |
|---|---|---|
| Upstream | Official API: `problemset.problems` and `contest.list` (2 calls, spaced for its 1-call-per-2-s limit) | The GraphQL problem list its own site uses (unofficial; about 37 pages of 100) |
| Refresh | Every 6 h | Every 24 h |
| Quality filter | Rated problems from regular rated rounds held since 2016 (no April Fools, Kotlin Heroes, unrated mirrors…), without the least-solved quarter at each rating | Free Algorithms problems with 500+ likes and at least 80% positive votes |
| Pool (Oct 2026) | about 5,500 problems across 800–3500 | about 1,670 (397 E / 904 M / 372 H) |
| Picked by | Rating range and count, spread evenly across the ratings in the range | Easy / Medium / Hard counts |

The thresholds are constants at the top of `lib/sources/codeforces.ts` and `lib/sources/leetcode.ts`. Codeforces ratings map to tiers as below 1200 = Easy, below 1800 = Medium, and the rest Hard, and each problem keeps its exact rating.

LeetCode has no supported public API, and its robots.txt disallows `/graphql` for crawlers. The endpoint can change without notice, and LeetCode's terms apply, so check them before running this on a public deployment. The once-a-day cache keeps traffic to about 37 requests a day per server process.
