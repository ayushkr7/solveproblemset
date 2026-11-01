"use client";

import { useId, useRef, useState, type ReactElement, type RefObject } from "react";
import { AlertIcon, InfoIcon, UploadIcon } from "@/components/Icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger } from "@/components/ui/select";
import { getSheet } from "@/data/sheets";
import { useProblemSets } from "@/hooks/useProblemSets";
import { formatClock, plural } from "@/lib/format";
import { applyPlan, planErrors, planImport, type PlanAction, type PlanItem, type PlanOutcome } from "@/lib/excel/plan";
import {
  FORMAT_VERSION,
  MAX_FILE_BYTES,
  MAX_PROBLEMS,
  MAX_SETS,
  PROBLEMS_SHEET,
  SETS_SHEET,
  WORKBOOK_SPEC,
  XLSX_EXTENSION,
  type SheetSpec,
} from "@/lib/excel/schema";
import { XLSX_ACCEPT, preloadXlsx, readWorkbookFile, type ImportedSet } from "@/lib/excel/transfer";
import { getListSnapshot, saveNewSets } from "@/lib/problem-sets";
import { StorageWriteError } from "@/lib/storage";
import { elapsedMs, getStats } from "@/lib/timer";
import type { ProblemSet } from "@/lib/types";
import styles from "./SetTransfer.module.css";

interface Preview {
  fileName: string;
  format: number;
  sets: ImportedSet[];
  warnings: string[];
}

interface Results extends PlanOutcome {
  items: PlanItem[];
  warnings: string[];
}

/**
 * "Import sets" + format-guide button, and the import flow:
 * file → validate → preview & resolve name conflicts → save atomically → results.
 * Each step is a dialog; closing any of them returns focus to "Import sets".
 */
/** `onImported` runs when the results summary is dismissed (the sets are saved before that). */
export function ImportSets({ onImported }: { onImported: (sets: ProblemSet[]) => void }) {
  const importRef = useRef<HTMLButtonElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const busy = useRef(false);
  const [reading, setReading] = useState(false);
  const [invalid, setInvalid] = useState<{ fileName: string; errors: string[] } | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  // focusableWhenDisabled: a natively disabled button drops keyboard focus,
  // leaving nothing for the dialogs to return focus to.
  const unavailable = reading || preview !== null;
  const chooseFile = () => {
    if (!busy.current) fileRef.current?.click();
  };

  async function handleFile(file: File) {
    if (busy.current) return; // one import at a time
    busy.current = true;
    setReading(true);
    try {
      const result = await readWorkbookFile(file);
      if (result.ok) setPreview({ fileName: file.name, format: result.format, sets: result.sets, warnings: result.warnings });
      else setInvalid({ fileName: file.name, errors: result.errors });
    } finally {
      busy.current = false;
      setReading(false);
    }
  }

  return (
    <>
      <div className={styles.importGroup}>
        <Button
          ref={importRef}
          onClick={chooseFile}
          onPointerEnter={preloadXlsx}
          onFocus={preloadXlsx}
          disabled={unavailable}
          focusableWhenDisabled
          aria-busy={reading || undefined}
        >
          {reading ? <span className="spinner" aria-hidden="true" /> : <UploadIcon />}
          {reading ? "Reading…" : "Import sets"}
        </Button>
        <FormatGuideDialog
          open={guideOpen}
          onOpenChange={setGuideOpen}
          trigger={
            <Button variant="ghost" size="icon" aria-label="Excel import format" title="Excel import format">
              <InfoIcon />
            </Button>
          }
        />
        <input
          ref={fileRef}
          type="file"
          accept={XLSX_ACCEPT}
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = ""; // so choosing the same file again still fires
            if (file) void handleFile(file);
          }}
        />
        <span className="visually-hidden" role="status">{reading ? "Reading workbook…" : ""}</span>
      </div>

      <Dialog open={invalid !== null} onOpenChange={(open) => !open && setInvalid(null)}>
        <DialogContent eyebrow="Import failed" returnFocus={importRef}>
          {invalid && (
            <>
              <DialogBody>
                <DialogHeader>
                  <DialogTitle>This file can’t be imported</DialogTitle>
                  <DialogDescription>
                    <p>
                      Nothing was imported and your sets are unchanged. Fix the issues below in{" "}
                      <strong className={styles.fileName}>{invalid.fileName}</strong>, then import it again.
                    </p>
                  </DialogDescription>
                </DialogHeader>
                <ul className={styles.errors} aria-label={`${plural(invalid.errors.length, "issue")} found`}>
                  {invalid.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </DialogBody>
              <DialogFooter>
                <Button
                  onClick={() => {
                    setInvalid(null);
                    setGuideOpen(true);
                  }}
                >
                  <InfoIcon /> Format guide
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    setInvalid(null);
                    chooseFile();
                  }}
                >
                  <UploadIcon /> Choose another file
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ImportPreviewDialog
        preview={preview}
        returnFocus={importRef}
        onCancel={() => setPreview(null)}
        onImported={(outcome, items) => {
          setResults({ ...outcome, items, warnings: preview?.warnings ?? [] });
          setPreview(null);
        }}
      />

      <ImportResultsDialog
        results={results}
        returnFocus={importRef}
        onClose={() => {
          // Highlight (and scroll to) the new cards only once the page is visible
          // again, so nothing moves behind the modal.
          if (results) onImported(results.sets);
          setResults(null);
        }}
      />
    </>
  );
}


// ---------------------------------------------------------------------------

const ACTION_LABEL: Record<PlanAction, string> = {
  import: "Import",
  rename: "Import with a new name",
  skip: "Skip",
};

function setSummary(set: ProblemSet): string {
  const stats = getStats(set);
  const timer = set.session.status === "idle" ? "timer not started" : `${set.session.status} at ${formatClock(elapsedMs(set.session, 0))}`;
  return `${getSheet(set.sheetId).shortName} · ${plural(stats.total, "problem")} · ${stats.solved} solved · ${timer}`;
}

function ImportPreviewDialog({
  preview,
  returnFocus,
  onCancel,
  onImported,
}: {
  preview: Preview | null;
  returnFocus: RefObject<HTMLElement | null>;
  onCancel: () => void;
  onImported: (outcome: PlanOutcome, items: PlanItem[]) => void;
}) {
  const focusRef = useRef<HTMLElement | null>(null);
  return (
    <Dialog open={preview !== null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent size="wide" eyebrow="Import preview" initialFocus={focusRef} returnFocus={returnFocus}>
        {/* Keyed by file so each import starts from a fresh plan. */}
        {preview && <PreviewPanel key={preview.sets[0]?.set.id} preview={preview} focusRef={focusRef} onImported={onImported} />}
      </DialogContent>
    </Dialog>
  );
}

function PreviewPanel({
  preview,
  focusRef,
  onImported,
}: {
  preview: Preview;
  /** Set to the first name conflict's control, or the confirm button when there are none. */
  focusRef: RefObject<HTMLElement | null>;
  onImported: (outcome: PlanOutcome, items: PlanItem[]) => void;
}) {
  const existing = useProblemSets() ?? [];
  const [items, setItems] = useState(() => planImport(preview.sets, getListSnapshot()));
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const baseId = useId();

  // Re-checked against the live list, so a set added in another tab is caught.
  const errors = planErrors(items, existing);
  const toImport = items.filter((i) => i.action !== "skip").length;
  const conflicts = items.filter((i) => i.conflict).length;
  const firstConflict = items.findIndex((i) => i.conflict);
  const setFocusTarget = (el: HTMLElement | null) => {
    focusRef.current = el;
  };

  const update = (index: number, patch: Partial<Pick<PlanItem, "action" | "rename">>) => {
    setSaveError(null);
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const confirm = () => {
    if (saving || planErrors(items, getListSnapshot()).size > 0) return;
    const outcome = applyPlan(items);
    if (outcome.sets.length === 0) return;
    setSaving(true);
    try {
      saveNewSets(outcome.sets);
      onImported(outcome, items);
    } catch (err) {
      setSaveError(
        `${err instanceof StorageWriteError ? err.message : "The sets couldn't be saved."} Nothing was imported — your existing sets are unchanged.`,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DialogBody>
        <DialogHeader>
          <DialogTitle>Import {plural(items.length, "set")}?</DialogTitle>
          <DialogDescription>
            <p>
              <strong className={styles.fileName}>{preview.fileName}</strong> is valid
              {preview.format < FORMAT_VERSION ? " (earlier single-set format)" : ""}. Review the sets below, then confirm.
              {conflicts > 0 &&
                ` ${conflicts === 1 ? "One set has a name" : `${conflicts} sets have names`} already in use — rename or skip ${conflicts === 1 ? "it" : "them"}.`}{" "}
              Existing sets are never changed.
            </p>
          </DialogDescription>
        </DialogHeader>

        {saveError && (
          <div className="notice notice--error" role="alert">
            <AlertIcon /> <span>{saveError}</span>
          </div>
        )}
        {preview.warnings.length > 0 && (
          <div className="notice notice--info">
            <InfoIcon />
            <ul className={styles.warnings} aria-label="Warnings">
              {preview.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        <ul className={styles.plan} aria-label="Sets in this file">
          {items.map((item, i) => {
            const error = errors.get(i);
            const id = `${baseId}-${i}`;
            return (
              <li key={item.set.id} className={styles.planItem} data-action={item.action} data-error={error ? true : undefined}>
                <div className={styles.planHead}>
                  <span className={`mono ${styles.ref}`} title={`SetID in the file (row ${item.row})`}>{item.ref}</span>
                  <div className={styles.planText}>
                    <span className={styles.planName}>{item.set.name}</span>
                    <span className={`mono ${styles.planMeta}`}>{setSummary(item.set)}</span>
                  </div>
                </div>

                {item.conflict && (
                  <p className={styles.conflict} id={`${id}-conflict`}>
                    <AlertIcon />
                    {item.conflict.kind === "existing"
                      ? "You already have a set with this name."
                      : `Same name as SetID ${item.conflict.ref} (row ${item.conflict.row}) in this file.`}
                  </p>
                )}

                <div className={styles.planControls}>
                  <Select
                    items={ACTION_LABEL}
                    value={item.action}
                    onValueChange={(value) => value && update(i, { action: value as PlanAction })}
                  >
                    <SelectLabel className="visually-hidden">What to do with “{item.set.name}”</SelectLabel>
                    <SelectTrigger
                      ref={i === firstConflict ? setFocusTarget : undefined}
                      id={`${id}-action`}
                      className={`input ${styles.select}`}
                      aria-describedby={item.conflict ? `${id}-conflict` : undefined}
                    />
                    <SelectContent>
                      {(Object.keys(ACTION_LABEL) as PlanAction[]).map((a) => (
                        <SelectItem key={a} value={a}>
                          {ACTION_LABEL[a]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {item.action === "rename" && (
                    <>
                      <label className="visually-hidden" htmlFor={`${id}-name`}>
                        New name for “{item.set.name}”
                      </label>
                      <Input
                        id={`${id}-name`}
                        className={`input ${styles.renameInput}`}
                        value={item.rename}
                        autoComplete="off"
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? `${id}-error` : undefined}
                        onChange={(e) => update(i, { rename: e.target.value })}
                      />
                    </>
                  )}
                </div>
                {error && (
                  <p id={`${id}-error`} className="field__error">
                    {error}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </DialogBody>
      <DialogFooter>
        {errors.size > 0 && (
          <p className={styles.footNote} role="status">
            Resolve {plural(errors.size, "name")} to continue.
          </p>
        )}
        <DialogClose render={<Button />}>Cancel import</DialogClose>
        <Button
          ref={firstConflict === -1 ? setFocusTarget : undefined}
          variant="primary"
          onClick={confirm}
          disabled={errors.size > 0 || toImport === 0 || saving}
          aria-busy={saving || undefined}
        >
          {saving ? <span className="spinner" aria-hidden="true" /> : <UploadIcon />}
          {toImport === 0 ? "Nothing to import" : `Import ${plural(toImport, "set")}`}
        </Button>
      </DialogFooter>
    </>
  );
}

function ImportResultsDialog({
  results,
  returnFocus,
  onClose,
}: {
  results: Results | null;
  returnFocus: RefObject<HTMLElement | null>;
  onClose: () => void;
}) {
  const doneRef = useRef<HTMLButtonElement>(null);
  return (
    <Dialog open={results !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent eyebrow="Import complete" initialFocus={doneRef} returnFocus={returnFocus}>
        {results && (
          <>
            <DialogBody>
              <DialogHeader>
                <DialogTitle>Imported {plural(results.imported, "set")}</DialogTitle>
                <DialogDescription>
                  <p>The imported sets are saved and will be highlighted on My Sets. Their timers are not running.</p>
                </DialogDescription>
              </DialogHeader>
              <dl className={styles.resultStats}>
                <div><dt className="label">Imported</dt><dd className="mono tabular">{results.imported}</dd></div>
                <div><dt className="label">Renamed</dt><dd className="mono tabular">{results.renamed}</dd></div>
                <div><dt className="label">Skipped</dt><dd className="mono tabular">{results.skipped}</dd></div>
              </dl>
              <ul className={styles.resultList} aria-label="Sets in the file">
                {results.items.map((item) => {
                  const skipped = item.action === "skip";
                  const name = item.action === "rename" ? item.rename.trim() : item.set.name;
                  return (
                    <li key={item.set.id} data-skipped={skipped || undefined}>
                      <span className={`mono ${styles.ref}`}>{item.ref}</span>
                      <span>
                        {skipped ? (
                          <>Skipped “{item.set.name}”</>
                        ) : name !== item.set.name ? (
                          <>“{name}” <span className={styles.muted}>(renamed from “{item.set.name}”)</span></>
                        ) : (
                          <>“{name}”</>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {results.warnings.length > 0 && (
                <div className="notice notice--info">
                  <InfoIcon />
                  <ul className={styles.warnings} aria-label="Warnings">
                    {results.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </DialogBody>
            <DialogFooter>
              <DialogClose render={<Button ref={doneRef} variant="primary" />}>Done</DialogClose>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------

const COLUMN_LETTERS = "ABCDEFGHIJ";

/** Opened by `trigger` (the info button), or programmatically from the import-errors dialog. */
function FormatGuideDialog({
  open,
  onOpenChange,
  trigger,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactElement;
}) {
  const notesId = useId();
  const linkId = useId();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent size="wide" eyebrow="Import format">
        <DialogBody>
          <DialogHeader>
            <DialogTitle>Excel workbook format</DialogTitle>
            <DialogDescription>
              <p>
                One Excel workbook ({XLSX_EXTENSION}) can hold any number of problem sets in two worksheets:{" "}
                <code className="mono">{SETS_SHEET.name}</code> lists the sets, and{" "}
                <code className="mono">{PROBLEMS_SHEET.name}</code> lists every problem. Exports use this same format, so
                you can export sets, edit them in Excel and import them again.
              </p>
            </DialogDescription>
          </DialogHeader>

          <section className={styles.link} aria-labelledby={linkId}>
            <h3 id={linkId} className={styles.sectionTitle}>How SetID links the sheets</h3>
            <p className={styles.sectionText}>
              Give each set a <code className="mono">SetID</code> in {SETS_SHEET.name}, such as{" "}
              <span className={styles.refTag} data-tone="0">S1</span>. Every row in {PROBLEMS_SHEET.name} with that SetID
              belongs to that set, so <span className={styles.refTag} data-tone="0">S1</span> problems go to the first set
              and <span className={styles.refTag} data-tone="1">S2</span> problems to the second, in any row order. SetIDs
              only link rows inside the file: imported sets get new internal IDs and never replace a set you already have.
            </p>
          </section>

          {WORKBOOK_SPEC.map((spec) => (
            <SheetGuide key={spec.name} spec={spec} />
          ))}

          <section className={styles.section} aria-labelledby={notesId}>
            <h3 id={notesId} className={styles.sectionTitle}>Good to know</h3>
            <ul className="dialog__list">
              <li>Headers go in row 1, spelled exactly as shown, and worksheet names must match too. Column order doesn’t matter; extra columns are ignored.</li>
              <li>Values are checked by what’s in each cell, not by cell formatting: a number stored as text, such as “12”, is fine.</li>
              <li>Every SetID in {PROBLEMS_SHEET.name} must exist in {SETS_SHEET.name}, and every set needs at least one problem.</li>
              <li>Problems are listed Easy → Medium → Hard; Order sets the sequence within each difficulty of a set.</li>
              <li>The whole workbook is validated before anything is saved. If any row has a problem you’ll see each issue with its row number, and nothing is imported.</li>
              <li>You’ll see a preview of the sets before confirming. If a name matches a set you already have, or another set in the file, rename or skip it there — existing sets are never overwritten.</li>
              <li>Imported timers are never running. A timer that was running at export is saved as Paused.</li>
              <li>Up to {MAX_SETS} sets per file and {MAX_PROBLEMS} problems per set; files up to {MAX_FILE_BYTES / 1024 / 1024} MB. Blank rows are skipped.</li>
              <li>Files in the earlier single-set format (ProblemSet, Problems and Session worksheets) can still be imported.</li>
            </ul>
          </section>
        </DialogBody>
        <DialogFooter>
          <DialogClose render={<Button />}>Close</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SheetGuide({ spec }: { spec: SheetSpec }) {
  const headingId = useId();
  const example = spec.example ?? [];
  // Colour SetIDs consistently across both example sheets.
  const tone = (ref: string) => String(Number(ref.replace(/\D/g, "")) - 1);
  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <div className={styles.sectionHead}>
        <h3 id={headingId} className={styles.sectionTitle}>
          <span className="mono">{spec.name}</span> worksheet
        </h3>
        <span className={styles.tag} data-required>Required</span>
      </div>
      <p className={styles.sectionText}>{spec.description}</p>

      <dl className={styles.columns}>
        {spec.columns.map((c) => (
          <div key={c.key}>
            <dt>
              <code className="mono">{c.header}</code>
              {!c.required && <span className={styles.optional}>optional</span>}
            </dt>
            <dd>{c.format}</dd>
          </div>
        ))}
      </dl>

      <div className={styles.example} role="region" aria-label={`Example ${spec.name} worksheet`} tabIndex={0}>
        <table className={styles.grid}>
          <caption className="visually-hidden">Example {spec.name} worksheet</caption>
          <thead aria-hidden="true">
            <tr>
              <td />
              {spec.columns.map((c, i) => (
                <th key={c.key} scope="col">{COLUMN_LETTERS[i]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className={styles.headerRow}>
              <th scope="row">1</th>
              {spec.columns.map((c) => (
                <td key={c.key}>{c.header}</td>
              ))}
            </tr>
            {example.map((row, r) => (
              <tr key={r}>
                <th scope="row">{r + 2}</th>
                {spec.columns.map((c) => (
                  <td key={c.key} data-tone={c.key === "setId" ? tone(row[c.key] ?? "") : undefined}>
                    {row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <span className={`mono ${styles.sheetTab}`} aria-hidden="true">{spec.name}</span>
      </div>
    </section>
  );
}
