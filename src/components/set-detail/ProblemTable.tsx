"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import {
  CheckIcon,
  CloseIcon,
  ExternalIcon,
  PencilIcon,
} from "@/components/Icons";
import { formatMinSec, formatMinutes, linkSite } from "@/lib/format";
import { compareProblems } from "@/lib/generate";
import {
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  type ProblemSet,
  type SetProblem,
} from "@/lib/types";
import styles from "./ProblemTable.module.css";

interface ProblemTableProps {
  set: ProblemSet;
  onToggle: (problemId: string, solved: boolean) => void;
  onEditTime: (problemId: string, minutes: number) => void;
}

export function ProblemTable({ set, onToggle, onEditTime }: ProblemTableProps) {
  const sorted = [...set.problems].sort(compareProblems);
  const groups = DIFFICULTIES.map((d) => ({
    d,
    rows: sorted.filter((p) => p.difficulty === d),
  })).filter((g) => g.rows.length > 0);
  let serial = 0;

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <caption className="visually-hidden">
          Problems in {set.name}, sorted by difficulty from easy to hard
        </caption>
        <thead>
          <tr>
            <th scope="col" className={styles.colNo}>
              S. No.
            </th>
            <th scope="col" className={styles.colTitle}>
              Problem
            </th>
            <th scope="col" className={styles.colDiff}>
              Difficulty
            </th>
            <th scope="col" className={styles.colStatus}>
              Status
            </th>
            <th scope="col" className={styles.colTime}>
              Time <span className={styles.unit}>(min)</span>
            </th>
          </tr>
        </thead>
        {groups.map(({ d, rows }) => (
          <tbody key={d} className={styles.group}>
            <tr className={styles.groupRow}>
              <th scope="rowgroup" colSpan={5} className={`diff--${d}`}>
                <span className={styles.groupLabel}>{DIFFICULTY_LABEL[d]}</span>
                <span className={styles.groupCount}>
                  {rows.filter((r) => r.solved).length}/{rows.length}
                </span>
              </th>
            </tr>
            {rows.map((p) => {
              serial++;
              return (
                <ProblemRow
                  key={p.id}
                  problem={p}
                  serial={serial}
                  onToggle={onToggle}
                  onEditTime={onEditTime}
                />
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}

function ProblemRow({
  problem: p,
  serial,
  onToggle,
  onEditTime,
}: {
  problem: SetProblem;
  serial: number;
  onToggle: ProblemTableProps["onToggle"];
  onEditTime: ProblemTableProps["onEditTime"];
}) {
  const checkId = `solved-${p.id}`;
  const site = linkSite(p.url);
  // Older sets linked the title straight to LeetCode; don't show the same link twice.
  const leetCode =
    p.leetCodeUrl && p.leetCodeUrl !== p.url ? p.leetCodeUrl : null;
  const hideTopics = true;
  return (
    <tr className={styles.row} data-solved={p.solved || undefined}>
      <td className={`mono tabular ${styles.no}`}>
        {String(serial).padStart(2, "0")}
      </td>
      <td className={styles.title}>
        <a
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
          title={`Open on ${site}`}
        >
          {p.title}
          <ExternalIcon className={styles.ext} />
          <span className="visually-hidden"> ({site}, opens in a new tab)</span>
        </a>
        {(p.topic || leetCode) && (
          <span className={styles.meta}>
            {p.topic && !hideTopics && (
              <span className={styles.topic}>{p.topic}</span>
            )}
            {leetCode && (
              <a
                href={leetCode}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.alt}
              >
                LeetCode
                <ExternalIcon />
                <span className="visually-hidden">
                  : {p.title} (opens in a new tab)
                </span>
              </a>
            )}
          </span>
        )}
      </td>
      <td className={styles.diff}>
        <DifficultyBadge difficulty={p.difficulty} />
        {p.rating !== null && (
          <span
            className={`mono tabular ${styles.rating}`}
            title="Codeforces rating"
          >
            <span className="visually-hidden">rated </span>
            {p.rating}
          </span>
        )}
      </td>
      <td className={styles.status}>
        <label htmlFor={checkId} className={styles.checkHit}>
          <input
            id={checkId}
            type="checkbox"
            className={styles.check}
            checked={p.solved}
            onChange={(e) => onToggle(p.id, e.target.checked)}
          />
          <span className={styles.checkBox} aria-hidden="true">
            <CheckIcon />
          </span>
          <span className="visually-hidden">Mark {p.title} as solved</span>
        </label>
      </td>
      <td className={styles.time}>
        <TimeCell problem={p} onSave={(m) => onEditTime(p.id, m)} />
      </td>
    </tr>
  );
}

function TimeCell({
  problem: p,
  onSave,
}: {
  problem: SetProblem;
  onSave: (minutes: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [invalid, setInvalid] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const editBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);
  // Leave edit mode if the problem gets unsolved (e.g. Restart from another tab).
  useEffect(() => {
    if (!p.solved) setEditing(false);
  }, [p.solved]);

  if (!p.solved)
    return (
      <span className={styles.timeEmpty} aria-label="No time">
        —
      </span>
    );

  if (editing) {
    const close = () => {
      setEditing(false);
      setInvalid(false);
      requestAnimationFrame(() => editBtnRef.current?.focus());
    };
    const submit = (e: FormEvent) => {
      e.preventDefault();
      const minutes = Number(value);
      if (
        value.trim() === "" ||
        !Number.isFinite(minutes) ||
        minutes < 0 ||
        minutes > 10_000
      ) {
        setInvalid(true);
        return;
      }
      onSave(minutes);
      close();
    };
    return (
      <form
        className={styles.timeForm}
        onSubmit={submit}
        onKeyDown={(e) => e.key === "Escape" && close()}
      >
        <input
          ref={inputRef}
          className={`mono tabular ${styles.timeInput}`}
          type="number"
          inputMode="decimal"
          min={0}
          step={0.1}
          value={value}
          aria-label={`Minutes taken for ${p.title}`}
          aria-invalid={invalid || undefined}
          onChange={(e) => {
            setValue(e.target.value);
            setInvalid(false);
          }}
        />
        <button type="submit" className={styles.iconBtn} aria-label="Save time">
          <CheckIcon />
        </button>
        <button
          type="button"
          className={styles.iconBtn}
          aria-label="Cancel"
          onClick={close}
        >
          <CloseIcon />
        </button>
      </form>
    );
  }

  return (
    <span className={styles.timeView}>
      {p.timeMs === null ? (
        <span
          className={styles.untimed}
          title="Solved while the timer wasn't running"
        >
          untimed
        </span>
      ) : (
        <span
          className={`mono tabular ${styles.timeValue}`}
          title={`${formatMinSec(p.timeMs)} (mm:ss)${p.timeEdited ? " · edited" : ""}`}
        >
          {formatMinutes(p.timeMs)}
          <span className={styles.timeUnit}> min</span>
          {p.timeEdited && (
            <span className={styles.edited} aria-label="edited">
              *
            </span>
          )}
        </span>
      )}
      <button
        ref={editBtnRef}
        type="button"
        className={styles.iconBtn}
        aria-label={`Edit time for ${p.title}`}
        onClick={() => {
          setValue(p.timeMs === null ? "" : formatMinutes(p.timeMs));
          setEditing(true);
        }}
      >
        <PencilIcon />
      </button>
    </span>
  );
}
