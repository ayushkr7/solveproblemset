"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ArrowRightIcon, CheckIcon, PlusIcon, TrashIcon } from "@/components/Icons";
import { getSheet } from "@/data/sheets";
import { useProblemSets } from "@/hooks/useProblemSets";
import { formatDate, formatDateTime, plural } from "@/lib/format";
import { deleteSet } from "@/lib/problem-sets";
import { getStats } from "@/lib/timer";
import type { ProblemSet } from "@/lib/types";
import styles from "./SetList.module.css";

export function SetList() {
  const sets = useProblemSets();
  const [pendingDelete, setPendingDelete] = useState<ProblemSet | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const totals = sets?.reduce(
    (acc, s) => {
      const st = getStats(s);
      acc.problems += st.total;
      acc.solved += st.solved;
      return acc;
    },
    { problems: 0, solved: 0 },
  );

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
            <SetCard key={s.id} set={s} index={sets.length - i} onDelete={() => setPendingDelete(s)} />
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
          setToast(`Deleted “${pendingDelete.name}”`);
          setPendingDelete(null);
        }}
      >
        <p>
          This permanently removes the set, its {pendingDelete ? plural(pendingDelete.problems.length, "problem") : "problems"},
          solved statuses and recorded timings from this browser. Your other sets are not affected.
        </p>
      </ConfirmDialog>

      {toast && (
        <div className="toast" role="status">
          <CheckIcon width={16} height={16} /> {toast}
        </div>
      )}
    </>
  );
}

function SetCard({ set, index, onDelete }: { set: ProblemSet; index: number; onDelete: () => void }) {
  const stats = getStats(set);
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
    <li className={styles.card} data-status={status.key}>
      <div className={styles.cardTop}>
        <span className={`mono ${styles.index}`}>No. {String(index).padStart(3, "0")}</span>
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
        <button type="button" className={`btn btn--sm btn--ghost ${styles.delete}`} onClick={onDelete} aria-label={`Delete ${set.name}`}>
          <TrashIcon /> Delete
        </button>
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
