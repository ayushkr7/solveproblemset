"use client";

import { PauseIcon, PlayIcon, RestartIcon, StopIcon } from "@/components/Icons";
import { formatClock, formatMinSec, formatMinutes } from "@/lib/format";
import { currentSplitMs, elapsedMs, getStats, hasProgress } from "@/lib/timer";
import type { ProblemSet, TimerStatus } from "@/lib/types";
import styles from "./TimerPanel.module.css";

export interface TimerActions {
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  restart: () => void;
}

const STATUS_LABEL: Record<TimerStatus, string> = {
  idle: "Ready",
  running: "Running",
  paused: "Paused",
  stopped: "Stopped",
};

function PrimaryControl({ status, actions, compact }: { status: TimerStatus; actions: TimerActions; compact?: boolean }) {
  const size = compact ? "" : " btn--lg";
  if (status === "idle")
    return (
      <button type="button" className={`btn btn--primary${size} ${styles.primary}`} onClick={actions.start}>
        <PlayIcon /> Start
      </button>
    );
  if (status === "running")
    return (
      <button type="button" className={`btn btn--primary${size} ${styles.primary}`} onClick={actions.pause}>
        <PauseIcon /> Pause
      </button>
    );
  return (
    <button type="button" className={`btn btn--primary${size} ${styles.primary}`} onClick={actions.resume}>
      <PlayIcon /> Resume
    </button>
  );
}

export function TimerPanel({ set, now, actions }: { set: ProblemSet; now: number; actions: TimerActions }) {
  const { status } = set.session;
  const elapsed = elapsedMs(set.session, now);
  const split = currentSplitMs(set.session, now);
  const stats = getStats(set);
  const allSolved = stats.total > 0 && stats.solved === stats.total;
  const canStop = status === "running" || status === "paused";

  return (
    <div className={styles.panel} data-status={status}>
      <div className={styles.head}>
        <span className="label">Session timer</span>
        <span className={styles.status} role="status">
          <span className={styles.dot} aria-hidden="true" />
          {STATUS_LABEL[status]}
        </span>
      </div>

      <div className={styles.readout}>
        <span className="label">Elapsed · active time</span>
        <time className={`mono tabular ${styles.clock}`} dateTime={`PT${Math.floor(elapsed / 1000)}S`} aria-label={`Elapsed ${formatClock(elapsed)}`}>
          {formatClock(elapsed)}
        </time>
        <div className={styles.split}>
          <span className="label">{allSolved ? "All problems solved" : stats.solved === 0 ? "First problem" : "Current problem"}</span>
          <span className={`mono tabular ${styles.splitValue}`}>
            {status === "idle" || allSolved ? "—" : formatMinSec(split)}
          </span>
        </div>
      </div>

      <div className={styles.controls}>
        <PrimaryControl status={status} actions={actions} />
        <button type="button" className={`btn ${styles.secondary}`} onClick={actions.stop} disabled={!canStop}>
          <StopIcon /> Stop
        </button>
        <button
          type="button"
          className={`btn btn--danger ${styles.secondary}`}
          onClick={actions.restart}
          disabled={!hasProgress(set)}
        >
          <RestartIcon /> Restart
        </button>
      </div>

      <dl className={styles.stats}>
        <div>
          <dt className="label">Solved</dt>
          <dd className="mono tabular">{stats.solved}/{stats.total}</dd>
        </div>
        <div>
          <dt className="label">Avg / problem</dt>
          <dd className="mono tabular">
            {stats.averageMs === null ? "—" : formatMinutes(stats.averageMs)}
            {stats.averageMs !== null && <small> min</small>}
          </dd>
        </div>
        <div>
          <dt className="label">Recorded</dt>
          <dd className="mono tabular">
            {formatMinutes(stats.recordedMs)}<small> min</small>
          </dd>
        </div>
      </dl>
      <div
        className="progress"
        role="progressbar"
        aria-label="Completion"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={stats.percent}
      >
        <span className="progress__fill" style={{ width: `${stats.percent}%` }} />
      </div>

      <p className={styles.note}>
        {status === "stopped"
          ? "Session stopped. Progress and timings are saved — resume any time."
          : status === "paused"
            ? "Paused time is not counted towards any problem."
            : "Tick a problem when solved; its time is the split since your last solve."}
      </p>
    </div>
  );
}

/** Compact, fixed-bottom controls for small screens while the main panel is scrolled away. */
export function TimerDock({ set, now, actions, hidden }: { set: ProblemSet; now: number; actions: TimerActions; hidden: boolean }) {
  const { status } = set.session;
  return (
    // `right-scroll-bar-position`: the dialog scroll lock offsets this fixed bar by the
    // removed scrollbar's width, so it doesn't jump when a dialog opens.
    <div
      className={`${styles.dock} right-scroll-bar-position`}
      data-status={status}
      data-hidden={hidden || undefined}
      inert={hidden}
    >
      <div className={styles.dockReadout}>
        <span className={styles.status}>
          <span className={styles.dot} aria-hidden="true" />
          {STATUS_LABEL[status]}
        </span>
        <span className={`mono tabular ${styles.dockClock}`}>{formatClock(elapsedMs(set.session, now))}</span>
      </div>
      <div className={styles.dockControls}>
        {(status === "running" || status === "paused") && (
          <button type="button" className="btn btn--icon" onClick={actions.stop} aria-label="Stop timer">
            <StopIcon />
          </button>
        )}
        <PrimaryControl status={status} actions={actions} compact />
      </div>
    </div>
  );
}
