"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { AlertIcon, ArrowLeftIcon, InfoIcon, TrashIcon } from "@/components/Icons";
import { getSheet } from "@/data/sheets";
import { useNow } from "@/hooks/useNow";
import { useProblemSet } from "@/hooks/useProblemSets";
import { formatDateTime, plural } from "@/lib/format";
import { deleteSet, updateSet } from "@/lib/problem-sets";
import { StorageWriteError } from "@/lib/storage";
import * as timer from "@/lib/timer";
import { DIFFICULTIES, type ProblemSet } from "@/lib/types";
import { ProblemTable } from "./ProblemTable";
import { TimerDock, TimerPanel, type TimerActions } from "./TimerPanel";
import styles from "./SetDetail.module.css";

export function SetDetail({ id }: { id: string }) {
  const snapshot = useProblemSet(id);

  if (snapshot === "loading") return <DetailSkeleton />;
  if (snapshot === undefined) return <NotFound />;
  if (snapshot === null) return <Unreadable id={id} />;
  return <Workspace set={snapshot} />;
}

function Workspace({ set }: { set: ProblemSet }) {
  const running = set.session.status === "running";
  const now = useNow(running);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelVisible, setPanelVisible] = useState(true);

  useEffect(() => {
    document.title = `${set.name} · Blueprint DSA`;
  }, [set.name]);

  // Show the compact dock only while the full timer panel is off-screen.
  useEffect(() => {
    const el = panelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setPanelVisible(entry?.isIntersecting ?? true), {
      rootMargin: "-64px 0px 0px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /** Apply a pure transition to the freshest stored copy, timestamped at the moment of the action. */
  const apply = useCallback(
    (fn: (s: ProblemSet, at: number) => ProblemSet) => {
      try {
        updateSet(set.id, (s) => fn(s, Date.now()));
        setError(null);
      } catch (err) {
        setError(err instanceof StorageWriteError ? err.message : "Couldn't save your progress.");
      }
    },
    [set.id],
  );

  const actions: TimerActions = {
    start: () => apply(timer.start),
    pause: () => apply(timer.pause),
    resume: () => apply(timer.resume),
    stop: () => apply(timer.stop),
    restart: () => setConfirmRestart(true),
  };

  const sheet = getSheet(set.sheetId);
  const stats = timer.getStats(set);
  const counts = DIFFICULTIES.map((d) => ({ d, n: set.problems.filter((p) => p.difficulty === d).length }));

  return (
    <div className={`container ${styles.page}`}>
      <Link href="/sets" className={`label ${styles.back}`}>
        <ArrowLeftIcon width={14} height={14} /> All sets
      </Link>

      <header className={`page-head ${styles.head}`}>
        <div className="page-head__meta">
          <span className="label">
            <span className={`mono ${styles.code}`}>{sheet.shortName}</span> {sheet.name}
          </span>
          <span className="label">
            Created <time dateTime={set.createdAt}>{formatDateTime(set.createdAt)}</time>
          </span>
        </div>
        <h1 className={`page-head__title ${styles.title}`}>{set.name}</h1>
        <dl className={styles.headStats}>
          {counts.map(({ d, n }) => (
            <div key={d} className={`diff--${d}`}>
              <dt className="label">{d}</dt>
              <dd className="mono tabular">{n}</dd>
            </div>
          ))}
          <div>
            <dt className="label">Solved</dt>
            <dd className="mono tabular">
              {stats.solved}<span className={styles.of}>/{stats.total}</span>
            </dd>
          </div>
        </dl>
      </header>

      {error && (
        <div className={`notice notice--error ${styles.error}`} role="alert">
          <AlertIcon />
          <span>{error}</span>
        </div>
      )}

      <div className={styles.workspace}>
        <aside className={styles.aside} aria-label="Practice timer">
          <div ref={panelRef}>
            <TimerPanel set={set} now={now} actions={actions} />
          </div>
        </aside>

        <section className={styles.main} aria-labelledby="problems-title">
          <div className={styles.mainHead}>
            <h2 id="problems-title" className={styles.mainTitle}>Problems</h2>
            <span className="label">{plural(stats.total, "problem")} · Easy → Hard</span>
          </div>
          {set.session.status === "idle" && (
            <div className={`notice notice--info ${styles.hint}`}>
              <InfoIcon />
              <span>
                Press <strong>Start</strong> to time each problem. Problems ticked before starting are saved without a
                time.
              </span>
            </div>
          )}
          <ProblemTable
            set={set}
            onToggle={(problemId, solved) => apply((s, at) => timer.setSolved(s, problemId, solved, at))}
            onEditTime={(problemId, minutes) => apply((s, at) => timer.editTime(s, problemId, minutes, at))}
          />
        </section>
      </div>

      <TimerDock set={set} now={now} actions={actions} hidden={panelVisible} />

      <ConfirmDialog
        open={confirmRestart}
        eyebrow="Confirm restart"
        title="Restart this practice session?"
        confirmLabel="Restart session"
        onCancel={() => setConfirmRestart(false)}
        onConfirm={() => {
          apply(timer.restart);
          setConfirmRestart(false);
        }}
      >
        <p>All solved statuses and recorded timings for <strong>{set.name}</strong> will be reset:</p>
        <ul className="dialog__list" style={{ marginTop: 12 }}>
          <li>Every problem is marked unsolved</li>
          <li>Every recorded time is cleared</li>
          <li>The session timer returns to 00:00:00</li>
        </ul>
        <p style={{ marginTop: 12 }}>The problem list, name and source stay the same. Other sets are not affected.</p>
      </ConfirmDialog>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className={`container ${styles.page}`} aria-busy="true" aria-label="Loading problem set">
      <div className="page-head">
        <span className={`skeleton ${styles.sk}`} style={{ width: 180, height: 12 }} />
        <span className={`skeleton ${styles.sk}`} style={{ width: "60%", height: 56 }} />
      </div>
      <div className={styles.workspace}>
        <div className={`skeleton ${styles.sk}`} style={{ height: 320 }} />
        <div className={styles.main}>
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className={`skeleton ${styles.sk}`} style={{ height: 52, marginBottom: 8 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className={`container page ${styles.state}`}>
      <span className="label">Error 404 — Set not found</span>
      <h1 className={styles.stateTitle}>This set isn&rsquo;t on file.</h1>
      <p className="muted">
        It may have been deleted, or it was created in a different browser. Sets are stored locally on each device.
      </p>
      <div className={styles.stateActions}>
        <Link href="/sets" className="btn btn--primary">View your sets</Link>
        <Link href="/create" className="btn">Create a set</Link>
      </div>
    </div>
  );
}

function Unreadable({ id }: { id: string }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div className={`container page ${styles.state}`}>
      <span className="label">Error — Unreadable data</span>
      <h1 className={styles.stateTitle}>This set&rsquo;s saved data is damaged.</h1>
      <p className="muted">
        The record in local storage couldn&rsquo;t be read, possibly due to a manual edit. You can remove it and create
        a new set.
      </p>
      <div className={styles.stateActions}>
        <button type="button" className="btn btn--danger" onClick={() => setConfirm(true)}>
          <TrashIcon /> Remove damaged set
        </button>
        <Link href="/sets" className="btn">Back to sets</Link>
      </div>
      <ConfirmDialog
        open={confirm}
        eyebrow="Confirm removal"
        title="Remove the damaged record?"
        confirmLabel="Remove"
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          deleteSet(id);
          setConfirm(false);
        }}
      >
        <p>Only this record is removed. Your other sets are untouched.</p>
      </ConfirmDialog>
    </div>
  );
}
