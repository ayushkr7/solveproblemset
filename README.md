# Blueprint DSA

A client-side DSA / competitive-programming practice tracker. Build personalised problem sets from Striver's sheets, time every solve, and resume where you left off. Everything persists in `localStorage`.

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
  components/             shared UI (header, theme toggle, confirm dialog, badges)
    ui/dialog.tsx         shadcn/ui Dialog on Radix: use it for every modal
    create/               problem-set form
    sets/                 previous-sets listing
    set-detail/           timer panel, problems table, detail page
  data/
    sheets.ts             problem-source registry (add new sheets here)
    catalog.ts            bundled problem catalog, lazy-loaded
  hooks/                  useProblemSets / useProblemSet (external store), useNow
  lib/
    timer.ts              pure session/timing logic (fully unit-tested)
    problem-sets.ts       localStorage repository + subscribable store
    generate.ts           validation, sampling, set construction
    storage.ts, theme.ts, format.ts, types.ts
    excel/                .xlsx import/export (see below)
tests/timer.test.ts, tests/excel.test.ts
```

## Timing model

- Elapsed = banked active time + the live running segment. Paused or stopped time never accrues.
- Marking a problem solved records `elapsed − lastSolveMark` (the first solve measures from Start), then moves the mark.
- Unticking the most recent solve rolls the mark back, so its time carries into the next solve. Unticking an older solve clears only that problem.
- Problems ticked before Start are saved as *untimed*. Any solved problem's time can be edited by hand.
- The timer stores timestamps (`runningSince`), not tick counts, so reloads, navigation and throttled background tabs don't cause drift.

## Storage

Each set is stored under its own key, `blueprint-dsa:set:<uuid>`, so sets are independent. The theme is stored under `blueprint-dsa:theme`. Saved data is validated when it's read, and the record carries a `schemaVersion` for future migrations. Changes made in other tabs sync through the `storage` event.

## Excel import / export

On My Sets you can select sets and export them (**Export selected**, **Export all**, or a card's **Export**) into a single `.xlsx` workbook, and import any number of sets from one workbook (**Import sets**). The info button next to Import sets shows the format in the app.

Format version 2 has two worksheets, linked by `SetID`:
- `ProblemSets`: one row per set, with `SetID`, `SetName`, `SourceSheet` and `CreatedAt`, plus optional `ElapsedSeconds`, `TimerState` and `FormatVersion`.
- `Problems`: one row per problem, with `SetID`, `ProblemName`, `ProblemURL`, `Difficulty`, `Status`, `TimeMinutes` and `Order`, plus an optional `Topic`.

Single-set files in format 1 (`ProblemSet` / `Problems` / `Session` worksheets) can still be imported.

- `lib/excel/schema.ts` is the single definition of the format. Export, import validation and the in-app guide all read from it. To change the format, bump `FORMAT_VERSION` there.
- `import.ts` validates the whole workbook up front: one bad row rejects the file. `plan.ts` decides what happens to each set (import, rename or skip) when names clash with saved sets or with each other. `export.ts` builds the workbook. All three are pure and unit-tested.
- `xlsx.ts` is the only code that uses ExcelJS, which is loaded on demand. `transfer.ts` handles the browser side (file checks, download).
- Importing shows a preview first. Saving goes through `saveNewSets`, which writes every set or none: if any write fails, the sets already written are removed. Each imported set gets a new id, so existing sets are never overwritten. Imported timers are never running.

## Problem data

Striver's sheets have no public API. `data/catalog.ts` is a curated, bundled subset (A2Z: 288 problems, 180: 151), with LeetCode, GFG and SPOJ links. It loads through an async provider (`fetchSheetProblems`), so a remote source can replace it without UI changes.
