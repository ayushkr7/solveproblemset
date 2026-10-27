"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Checkbox } from "@/components/Checkbox";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { AlertIcon, ArrowRightIcon, CheckIcon, DownloadIcon, PlusIcon, TrashIcon } from "@/components/Icons";
import { getSheet } from "@/data/sheets";
import { useProblemSets } from "@/hooks/useProblemSets";
import { downloadProblemSets, preloadXlsx } from "@/lib/excel/transfer";
import { formatDate, formatDateTime, plural } from "@/lib/format";
import { deleteSet, getListSnapshot } from "@/lib/problem-sets";
import { getStats } from "@/lib/timer";
import type { ProblemSet } from "@/lib/types";
import { ImportSets } from "./SetTransfer";
import styles from "./SetList.module.css";

interface Toast {
  tone: "success" | "error";
  message: string;
}

/** What an export covers: everything, the selection, or one card's set. */
type ExportTarget = "all" | "selected" | `set:${string}`;

export function SetList() {
  const sets = useProblemSets();
  const [pendingDelete, setPendingDelete] = useState<ProblemSet | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
  const [exportTarget, setExportTarget] = useState<ExportTarget | null>(null);
  const exporting = useRef(false);
  const [highlightIds, setHighlightIds] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), toast.tone === "error" ? 6000 : 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (highlightIds.size === 0) return;
    const t = window.setTimeout(() => setHighlightIds(new Set()), 4000);
    return () => window.clearTimeout(t);
  }, [highlightIds]);

  // Selection only counts sets that are still displayed (others may be deleted, e.g. in another tab).
  const selectedCount = sets?.filter((s) => selected.has(s.id)).length ?? 0;
  const allSelected = !!sets && sets.length > 0 && selectedCount === sets.length;
  const firstHighlighted = sets?.find((s) => highlightIds.has(s.id))?.id;

  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  /** Download sets as one .xlsx. Read-only: stored sets and running timers are untouched. */
  async function runExport(target: ExportTarget) {
    if (exporting.current) return;
    // Read from storage at click time, in display order.
    const all = getListSnapshot();
    const chosen =
      target === "all" ? all
      : target === "selected" ? all.filter((s) => selected.has(s.id))
      : all.filter((s) => `set:${s.id}` === target);
    if (chosen.length === 0) {
      setToast({ tone: "error", message: target === "all" ? "There are no sets to export yet." : "Select at least one set to export." });
      return;
    }
    exporting.current = true;
    setExportTarget(target);
    try {
      const fileName = await downloadProblemSets(chosen, { all: target === "all" });
      const what = chosen.length === 1 ? `“${chosen[0]!.name}”` : plural(chosen.length, "set");
      setToast({ tone: "success", message: `Exported ${what} as ${fileName}` });
    } catch {
      setToast({ tone: "error", message: "The Excel file couldn’t be created. Check your connection and try again." });
    } finally {
      exporting.current = false;
      setExportTarget(null);
    }
  }

  const totals = sets?.reduce(
    (acc, s) => {
      const st = getStats(s);
      acc.problems += st.total;
      acc.solved += st.solved;
      return acc;
    },
    { problems: 0, solved: 0 },
  );

  const busyIcon = (target: ExportTarget) =>
    exportTarget === target ? <span className="spinner" aria-hidden="true" /> : <DownloadIcon />;

  return (
    <>
      <header className="page-head">
        <div className="page-head__meta">
          <span className="label">§ Archive</span>
          <span className="label">Previous problem sets</span>
        </div>
        <div className="page-head__row">
          <h1 className="page-head__title">
            Your <span className="serif-accent">sets.</span>
          </h1>
          {sets && sets.length > 0 && (
            <Link href="/create" className="btn btn--primary">
              <PlusIcon /> New set
            </Link>
          )}
        </div>
        {sets && sets.length > 0 && totals && (
          <dl className={styles.totals}>
            <div><dt className="label">Sets</dt><dd className="mono tabular">{sets.length}</dd></div>
            <div><dt className="label">Problems</dt><dd className="mono tabular">{totals.problems}</dd></div>
            <div><dt className="label">Solved</dt><dd className="mono tabular">{totals.solved}</dd></div>
          </dl>
        )}
      </header>

      {sets && (
        <div className={styles.toolbar} role="region" aria-label="Select, import and export sets">
          <div className={styles.selection}>
            {sets.length > 0 ? (
              <>
                <Checkbox
                  checked={allSelected}
                  indeterminate={selectedCount > 0 && !allSelected}
                  onChange={(on) => setSelected(on ? new Set(sets.map((s) => s.id)) : new Set())}
                  label="Select all"
                  showLabel
                />
                {/* role="status", not aria-live: Radix's aria-hiding keeps [aria-live] regions (and
                    their ancestors) exposed behind an open dialog. */}
                <span className={`mono tabular ${styles.count}`} role="status">
                  {selectedCount} of {plural(sets.length, "set")} selected
                </span>
                <button
                  type="button"
                  className="btn btn--sm btn--ghost"
                  onClick={() => setSelected(new Set())}
                  disabled={selectedCount === 0}
                >
                  Deselect all
                </button>
              </>
            ) : (
              <span className={styles.count}>No sets yet — import a workbook or create a set.</span>
            )}
          </div>

          <div className={styles.bulkActions}>
            <ImportSets
              onImported={(imported) => {
                setHighlightIds(new Set(imported.map((s) => s.id)));
              }}
            />
            <button
              type="button"
              className={`btn ${styles.exportSelected}`}
              onClick={() => void runExport("selected")}
              onPointerEnter={preloadXlsx}
              onFocus={preloadXlsx}
              disabled={selectedCount === 0}
              aria-disabled={exportTarget !== null || undefined}
              aria-busy={exportTarget === "selected" || undefined}
            >
              {busyIcon("selected")} Export selected
              {selectedCount > 0 && <span className={`mono tabular ${styles.badge}`}>{selectedCount}</span>}
            </button>
            <button
              type="button"
              className={`btn ${styles.exportAll}`}
              onClick={() => void runExport("all")}
              onPointerEnter={preloadXlsx}
              onFocus={preloadXlsx}
              disabled={sets.length === 0}
              aria-disabled={exportTarget !== null || undefined}
              aria-busy={exportTarget === "all" || undefined}
            >
              {busyIcon("all")} Export all
            </button>
          </div>
        </div>
      )}

      {sets === null ? (
        <ul className={styles.grid} aria-busy="true" aria-label="Loading problem sets">
          {[0, 1, 2].map((i) => (
            <li key={i} className={`${styles.card} ${styles.cardSkeleton}`}>
              <span className={`skeleton ${styles.skLine}`} style={{ width: "40%" }} />
              <span className={`skeleton ${styles.skLine}`} style={{ width: "75%", height: 22 }} />
              <span className={`skeleton ${styles.skLine}`} style={{ width: "100%", height: 6 }} />
            </li>
          ))}
        </ul>
      ) : sets.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className={styles.grid}>
          {sets.map((s, i) => (
            <SetCard
              key={s.id}
              set={s}
              index={sets.length - i}
              selected={selected.has(s.id)}
              onSelect={(on) => toggle(s.id, on)}
              highlight={highlightIds.has(s.id)}
              scrollIntoView={s.id === firstHighlighted}
              exporting={exportTarget === `set:${s.id}`}
              exportDisabled={exportTarget !== null}
              onExport={() => void runExport(`set:${s.id}`)}
              onDelete={() => setPendingDelete(s)}
            />
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        eyebrow="Confirm deletion"
        title={`Delete “${pendingDelete?.name ?? ""}”?`}
        confirmLabel="Delete set"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return;
          deleteSet(pendingDelete.id);
          toggle(pendingDelete.id, false);
          setToast({ tone: "success", message: `Deleted “${pendingDelete.name}”` });
          setPendingDelete(null);
        }}
      >
        <p>
          This permanently removes the set, its {pendingDelete ? plural(pendingDelete.problems.length, "problem") : "problems"},
          solved statuses and recorded timings from this browser. Your other sets are not affected.
        </p>
      </ConfirmDialog>

      {toast &&
        (toast.tone === "error" ? (
          <div className="toast toast--error" role="alert">
            <AlertIcon width={16} height={16} /> {toast.message}
          </div>
        ) : (
          <div className="toast" role="status">
            <CheckIcon width={16} height={16} /> {toast.message}
          </div>
        ))}
    </>
  );
}

interface SetCardProps {
  set: ProblemSet;
  index: number;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  /** Just imported: briefly marked. */
  highlight: boolean;
  /** The first just-imported card is scrolled into view. */
  scrollIntoView: boolean;
  exporting: boolean;
  exportDisabled: boolean;
  onExport: () => void;
  onDelete: () => void;
}

function SetCard({
  set,
  index,
  selected,
  onSelect,
  highlight,
  scrollIntoView,
  exporting,
  exportDisabled,
  onExport,
  onDelete,
}: SetCardProps) {
  const ref = useRef<HTMLLIElement>(null);
  const stats = getStats(set);

  useEffect(() => {
    if (!scrollIntoView) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ref.current?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [scrollIntoView]);

  const sheet = getSheet(set.sheetId);
  const status =
    stats.total > 0 && stats.solved === stats.total
      ? { key: "complete", label: "Complete" }
      : set.session.status === "running"
        ? { key: "running", label: "Timer running" }
        : set.session.status === "paused"
          ? { key: "paused", label: "Paused" }
          : stats.solved > 0 || set.session.status === "stopped"
            ? { key: "progress", label: "In progress" }
            : { key: "new", label: "Not started" };

  return (
    <li
      ref={ref}
      className={styles.card}
      data-status={status.key}
      data-selected={selected || undefined}
      data-highlight={highlight || undefined}
    >
      <div className={styles.cardTop}>
        <span className={styles.select}>
          <Checkbox checked={selected} onChange={onSelect} label={`Select ${set.name}`} />
          <span className={`mono ${styles.index}`}>No. {String(index).padStart(3, "0")}</span>
        </span>
        <span className={styles.status}>
          <span className={styles.statusDot} aria-hidden="true" />
          {status.label}
        </span>
      </div>

      <h2 className={styles.name}>
        <Link href={`/sets/${set.id}`} className={styles.link}>
          {set.name}
        </Link>
      </h2>

      <dl className={styles.meta}>
        <div>
          <dt className="label">Source</dt>
          <dd>
            <span className={`mono ${styles.code}`}>{sheet.shortName}</span> {sheet.name}
          </dd>
        </div>
        <div>
          <dt className="label">Created</dt>
          <dd>
            <time dateTime={set.createdAt} title={formatDateTime(set.createdAt)}>{formatDate(set.createdAt)}</time>
          </dd>
        </div>
      </dl>

      <dl className={styles.stats}>
        <div><dt className="label">Total</dt><dd className="mono tabular">{stats.total}</dd></div>
        <div><dt className="label">Solved</dt><dd className="mono tabular">{stats.solved}</dd></div>
        <div><dt className="label">Left</dt><dd className="mono tabular">{stats.remaining}</dd></div>
        <div><dt className="label">Done</dt><dd className="mono tabular">{stats.percent}%</dd></div>
      </dl>

      <div
        className="progress"
        role="progressbar"
        aria-label={`${set.name} completion`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={stats.percent}
      >
        <span className="progress__fill" style={{ width: `${stats.percent}%` }} />
      </div>

      <div className={styles.actions}>
        <div className={styles.actionGroup}>
          <button type="button" className={`btn btn--sm btn--ghost ${styles.delete}`} onClick={onDelete} aria-label={`Delete ${set.name}`}>
            <TrashIcon /> Delete
          </button>
          <button
            type="button"
            className="btn btn--sm btn--ghost"
            onClick={onExport}
            aria-disabled={exportDisabled || undefined}
            aria-busy={exporting || undefined}
            aria-label={`Export ${set.name} to Excel`}
          >
            {exporting ? <span className="spinner" aria-hidden="true" /> : <DownloadIcon />} Export
          </button>
        </div>
        <Link href={`/sets/${set.id}`} className="btn btn--sm" tabIndex={-1} aria-hidden="true">
          {stats.solved > 0 || set.session.status !== "idle" ? "Resume" : "Open"} <ArrowRightIcon />
        </Link>
      </div>
    </li>
  );
}

function EmptyState() {
  return (
    <section className={styles.empty} aria-labelledby="empty-title">
      <svg className={styles.emptyArt} viewBox="0 0 200 120" aria-hidden="true">
        <rect x="20" y="16" width="160" height="88" fill="none" stroke="currentColor" strokeDasharray="4 4" />
        <path d="M20 40h160M60 16v88" stroke="currentColor" opacity="0.4" />
        <path d="M100 52v36M82 70h36" stroke="var(--accent)" strokeWidth="2" />
        <path d="M12 16h4M12 104h4M14 16v88" stroke="var(--accent)" />
        <text x="6" y="64" fontSize="8" fill="var(--accent)" fontFamily="var(--font-mono)" transform="rotate(-90 6 64)">0 sets</text>
      </svg>
      <h2 id="empty-title" className={styles.emptyTitle}>The drawing board is empty.</h2>
      <p className="muted">
        Create your first problem set — choose a sheet, set the difficulty mix, and start the clock.
      </p>
      <Link href="/create" className="btn btn--primary btn--lg">
        Create your first set <ArrowRightIcon />
      </Link>
    </section>
  );
}
