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
  components/             shared UI (header, theme toggle, dialog, badges)
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
tests/timer.test.ts
```

## Timing model

- Elapsed = banked active time + the live running segment. Paused or stopped time never accrues.
- Marking a problem solved records `elapsed − lastSolveMark` (the first solve measures from Start), then moves the mark.
- Unticking the most recent solve rolls the mark back, so its time carries into the next solve. Unticking an older solve clears only that problem.
- Problems ticked before Start are saved as *untimed*. Any solved problem's time can be edited by hand.
- The timer stores timestamps (`runningSince`), not tick counts, so reloads, navigation and throttled background tabs don't cause drift.

## Storage

Each set is stored under its own key, `blueprint-dsa:set:<uuid>`, so sets are independent. The theme is stored under `blueprint-dsa:theme`. Saved data is validated when it's read, and the record carries a `schemaVersion` for future migrations. Changes made in other tabs sync through the `storage` event.

## Problem data

Striver's sheets have no public API. `data/catalog.ts` is a curated, bundled subset (A2Z: 288 problems, 180: 151), with LeetCode, GFG and SPOJ links. It loads through an async provider (`fetchSheetProblems`), so a remote source can replace it without UI changes.
