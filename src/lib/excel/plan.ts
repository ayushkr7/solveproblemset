/**
 * Import plan: what happens to each validated set before anything is saved.
 * A set whose name clashes with a saved set, or with an earlier set in the same
 * file, starts out as "rename" with a free suggested name; the user can change
 * the name, import anyway (if the clash is resolved elsewhere) or skip it.
 * Pure, so the preview UI and the tests share the same rules.
 */
import { NAME_MAX } from "../generate";
import type { ProblemSet } from "../types";
import { nameTaken, suggestName, type ImportedSet } from "./import";

export type PlanAction = "import" | "rename" | "skip";

export type Conflict =
  | { kind: "existing" }
  /** Same name as an earlier set in the file. */
  | { kind: "file"; ref: string; row: number };

export interface PlanItem extends ImportedSet {
  conflict: Conflict | null;
  action: PlanAction;
  /** Name used when `action` is "rename". */
  rename: string;
}

type Named = Pick<ProblemSet, "name">;

export function planImport(sets: readonly ImportedSet[], existing: readonly Named[]): PlanItem[] {
  // Suggestions must avoid saved names, every name in the file and earlier suggestions.
  const reserved: Named[] = [...existing, ...sets.map((s) => s.set)];
  const firstByName = new Map<string, ImportedSet>();

  return sets.map((item) => {
    const key = item.set.name.toLocaleLowerCase();
    const earlier = firstByName.get(key);
    if (!earlier) firstByName.set(key, item);

    const conflict: Conflict | null = nameTaken(item.set.name, existing)
      ? { kind: "existing" }
      : earlier
        ? { kind: "file", ref: earlier.ref, row: earlier.row }
        : null;
    if (!conflict) return { ...item, conflict, action: "import", rename: item.set.name };

    const rename = suggestName(item.set.name, reserved);
    reserved.push({ name: rename });
    return { ...item, conflict, action: "rename", rename };
  });
}

/** The name a plan item will be saved under, or `null` when skipped. */
export function finalName(item: PlanItem): string | null {
  if (item.action === "skip") return null;
  return (item.action === "rename" ? item.rename : item.set.name).trim();
}

/** Problems that block confirming the plan, by item index. */
export function planErrors(items: readonly PlanItem[], existing: readonly Named[]): Map<number, string> {
  const errors = new Map<number, string>();
  const used = new Map<string, number>();
  items.forEach((item, i) => {
    const name = finalName(item);
    if (name === null) return;
    const key = name.toLocaleLowerCase();
    if (!name) errors.set(i, "Enter a name, or skip this set.");
    else if (name.length > NAME_MAX) errors.set(i, `Keep the name under ${NAME_MAX} characters.`);
    else if (nameTaken(name, existing)) errors.set(i, `You already have a set named “${name}”. Rename or skip it.`);
    else if (used.has(key)) errors.set(i, `Another set in this import is also named “${name}”.`);
    else used.set(key, i);
  });
  return errors;
}

export interface PlanOutcome {
  sets: ProblemSet[];
  imported: number;
  renamed: number;
  skipped: number;
}

/** The sets to save, under their final names. Call only when planErrors is empty. */
export function applyPlan(items: readonly PlanItem[]): PlanOutcome {
  const sets: ProblemSet[] = [];
  let renamed = 0;
  for (const item of items) {
    const name = finalName(item);
    if (name === null) continue;
    if (name !== item.set.name) renamed++;
    sets.push(name === item.set.name ? item.set : { ...item.set, name });
  }
  return { sets, imported: sets.length, renamed, skipped: items.length - sets.length };
}
