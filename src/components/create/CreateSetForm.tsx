"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { DifficultyTicks } from "@/components/DifficultyBadge";
import { AlertIcon, ArrowRightIcon, MinusIcon, PlusIcon } from "@/components/Icons";
import { SHEETS, fetchSheetProblems } from "@/data/sheets";
import { useProblemSets } from "@/hooks/useProblemSets";
import {
  NAME_MAX,
  PER_DIFFICULTY_MAX,
  buildProblemSet,
  countByDifficulty,
  pickProblems,
  validateCounts,
  validateInput,
  type FieldErrors,
} from "@/lib/generate";
import { saveSet } from "@/lib/problem-sets";
import { DIFFICULTIES, DIFFICULTY_LABEL, type CatalogProblem, type Difficulty, type DifficultyCounts, type SheetId } from "@/lib/types";
import styles from "./CreateSetForm.module.css";

type Catalog =
  | { status: "idle" }
  | { status: "loading"; sheetId: SheetId }
  | { status: "ready"; sheetId: SheetId; problems: CatalogProblem[] }
  | { status: "error"; sheetId: SheetId; message: string };

const PRESETS: { label: string; counts: DifficultyCounts }[] = [
  { label: "Warm-up", counts: { easy: 3, medium: 2, hard: 0 } },
  { label: "Balanced", counts: { easy: 2, medium: 3, hard: 1 } },
  { label: "Interview", counts: { easy: 1, medium: 3, hard: 2 } },
  { label: "Gauntlet", counts: { easy: 0, medium: 3, hard: 4 } },
];

function toCount(raw: string): number {
  const t = raw.trim();
  return t === "" ? 0 : Number(t);
}

export function CreateSetForm() {
  const router = useRouter();
  const existingSets = useProblemSets();

  const [name, setName] = useState("");
  const [sheetId, setSheetId] = useState<SheetId | null>(null);
  const [rawCounts, setRawCounts] = useState<Record<Difficulty, string>>({ easy: "2", medium: "3", hard: "1" });
  const [avoidUsed, setAvoidUsed] = useState(false);
  const [catalog, setCatalog] = useState<Catalog>({ status: "idle" });
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const nameRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLFieldSetElement>(null);
  const countsRef = useRef<HTMLFieldSetElement>(null);

  const counts: DifficultyCounts = {
    easy: toCount(rawCounts.easy),
    medium: toCount(rawCounts.medium),
    hard: toCount(rawCounts.hard),
  };
  const total = DIFFICULTIES.reduce((s, d) => s + (Number.isFinite(counts[d]) ? counts[d] : 0), 0);

  // Load the selected sheet so availability can be shown and validated up front.
  useEffect(() => {
    if (!sheetId) return;
    let cancelled = false;
    setCatalog({ status: "loading", sheetId });
    fetchSheetProblems(sheetId).then(
      (problems) => !cancelled && setCatalog({ status: "ready", sheetId, problems }),
      (err: unknown) =>
        !cancelled &&
        setCatalog({ status: "error", sheetId, message: err instanceof Error ? err.message : "Couldn't load problems." }),
    );
    return () => {
      cancelled = true;
    };
  }, [sheetId, reloadKey]);

  const usedIds = useMemo(() => {
    const ids = new Set<string>();
    if (sheetId && existingSets) {
      for (const s of existingSets) if (s.sheetId === sheetId) for (const p of s.problems) ids.add(p.id);
    }
    return ids;
  }, [existingSets, sheetId]);

  const pool = useMemo(() => {
    if (catalog.status !== "ready") return null;
    return avoidUsed ? catalog.problems.filter((p) => !usedIds.has(p.id)) : catalog.problems;
  }, [catalog, avoidUsed, usedIds]);

  const available = pool ? countByDifficulty(pool) : undefined;
  const errors: FieldErrors = attempted ? validateInput({ name, sheetId, counts }, available) : {};
  // Count problems (e.g. more than the sheet has) are flagged immediately, not only after submit.
  const liveErrors: FieldErrors = attempted ? errors : validateCounts(counts, available);

  const setCount = (d: Difficulty, value: string) => {
    setRawCounts((c) => ({ ...c, [d]: value }));
    setSubmitError(null);
  };
  const step = (d: Difficulty, delta: number) => {
    const current = Number.isFinite(counts[d]) ? Math.trunc(counts[d]) : 0;
    const cap = Math.min(PER_DIFFICULTY_MAX, available?.[d] ?? PER_DIFFICULTY_MAX);
    setCount(d, String(Math.max(0, Math.min(cap, current + delta))));
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setAttempted(true);
    setSubmitError(null);
    const found = validateInput({ name, sheetId, counts }, available);
    if (Object.keys(found).length > 0 || !sheetId) {
      if (found.name) nameRef.current?.focus();
      else if (found.sheetId) sheetRef.current?.querySelector("input")?.focus();
      else countsRef.current?.querySelector<HTMLInputElement>("input[aria-invalid='true'], input")?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const problems = await fetchSheetProblems(sheetId);
      const candidates = avoidUsed ? problems.filter((p) => !usedIds.has(p.id)) : problems;
      const picked = pickProblems(candidates, counts);
      const set = buildProblemSet({ name, sheetId, counts }, picked);
      saveSet(set);
      router.push(`/sets/${set.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong while creating the set.");
      setSubmitting(false);
    }
  }

  const sheet = SHEETS.find((s) => s.id === sheetId);
  const hasOtherSetsForSheet = usedIds.size > 0;

  return (
    <form className={styles.layout} onSubmit={onSubmit} noValidate aria-busy={submitting}>
      <div className={styles.sections}>
        {/* 01 — Name */}
        <section className={styles.section} aria-labelledby="sec-name">
          <SectionLabel n="01" id="sec-name" title="Name the set" />
          <div className="field">
            <label htmlFor="set-name" className="field__label">Problem set name</label>
            <input
              ref={nameRef}
              id="set-name"
              className="input"
              type="text"
              value={name}
              maxLength={NAME_MAX}
              placeholder="e.g. Sliding window sprint"
              autoComplete="off"
              aria-invalid={errors.name ? true : undefined}
              aria-describedby="set-name-hint set-name-error"
              onChange={(e) => {
                setName(e.target.value);
                setSubmitError(null);
              }}
            />
            <div className={styles.fieldMeta}>
              <span id="set-name-hint" className="field__hint">Something you&rsquo;ll recognise later.</span>
              <span className="label tabular">{name.trim().length}/{NAME_MAX}</span>
            </div>
            <FieldError id="set-name-error" message={errors.name} />
          </div>
        </section>

        {/* 02 — Source */}
        <section className={styles.section} aria-labelledby="sec-source">
          <SectionLabel n="02" id="sec-source" title="Choose a source" />
          <fieldset ref={sheetRef} className={styles.fieldset} aria-describedby="sheet-error">
            <legend className="visually-hidden">Problem source</legend>
            <div className={styles.sheets}>
              {SHEETS.map((s) => (
                <label key={s.id} className={styles.sheet} data-checked={sheetId === s.id || undefined}>
                  <input
                    type="radio"
                    name="sheet"
                    value={s.id}
                    checked={sheetId === s.id}
                    onChange={() => {
                      setSheetId(s.id);
                      setSubmitError(null);
                    }}
                    className={styles.sheetRadio}
                  />
                  <span className={styles.sheetTop}>
                    <span className={`mono ${styles.sheetCode}`}>{s.shortName}</span>
                    <span className={styles.radioDot} aria-hidden="true" />
                  </span>
                  <span className={styles.sheetName}>{s.name}</span>
                  <span className={styles.sheetDesc}>{s.description}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <FieldError id="sheet-error" message={errors.sheetId} />

          {catalog.status === "error" && (
            <div className="notice notice--error" role="alert">
              <AlertIcon />
              <div className={styles.noticeBody}>
                <span>{catalog.message}</span>
                <button type="button" className="btn btn--sm" onClick={() => setReloadKey((k) => k + 1)}>
                  Retry
                </button>
              </div>
            </div>
          )}

          {hasOtherSetsForSheet && (
            <label className={styles.check}>
              <input type="checkbox" checked={avoidUsed} onChange={(e) => setAvoidUsed(e.target.checked)} />
              <span>
                <strong>Only new problems</strong>
                <span className="field__hint"> — skip the {usedIds.size} problems already in your other {sheet?.shortName} sets.</span>
              </span>
            </label>
          )}
        </section>

        {/* 03 — Difficulty mix */}
        <section className={styles.section} aria-labelledby="sec-mix">
          <SectionLabel n="03" id="sec-mix" title="Set the difficulty mix" />
          <div className={styles.presets} role="group" aria-label="Presets">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className="btn btn--sm"
                onClick={() => {
                  setRawCounts({ easy: String(p.counts.easy), medium: String(p.counts.medium), hard: String(p.counts.hard) });
                  setSubmitError(null);
                }}
              >
                {p.label}
                <span className={`mono ${styles.presetSpec}`}>
                  {p.counts.easy}/{p.counts.medium}/{p.counts.hard}
                </span>
              </button>
            ))}
          </div>

          <fieldset ref={countsRef} className={styles.fieldset} aria-describedby="counts-error">
            <legend className="visually-hidden">Number of problems per difficulty</legend>
            <div className={styles.counts}>
              {DIFFICULTIES.map((d) => {
                const err = liveErrors[d];
                const inputId = `count-${d}`;
                return (
                  <div key={d} className={`${styles.count} diff--${d}`} data-invalid={err ? "" : undefined}>
                    <label htmlFor={inputId} className={styles.countLabel}>
                      <DifficultyTicks difficulty={d} />
                      {DIFFICULTY_LABEL[d]}
                    </label>
                    <div className={styles.stepper}>
                      <button
                        type="button"
                        className={styles.stepBtn}
                        onClick={() => step(d, -1)}
                        aria-label={`Fewer ${DIFFICULTY_LABEL[d].toLowerCase()} problems`}
                        disabled={!(counts[d] > 0)}
                      >
                        <MinusIcon />
                      </button>
                      <input
                        id={inputId}
                        className={`mono tabular ${styles.countInput}`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={PER_DIFFICULTY_MAX}
                        step={1}
                        value={rawCounts[d]}
                        aria-invalid={err ? true : undefined}
                        aria-describedby={`${inputId}-avail ${inputId}-error`}
                        onChange={(e) => setCount(d, e.target.value)}
                        onFocus={(e) => e.currentTarget.select()}
                      />
                      <button
                        type="button"
                        className={styles.stepBtn}
                        onClick={() => step(d, 1)}
                        aria-label={`More ${DIFFICULTY_LABEL[d].toLowerCase()} problems`}
                        disabled={available ? counts[d] >= available[d] : counts[d] >= PER_DIFFICULTY_MAX}
                      >
                        <PlusIcon />
                      </button>
                    </div>
                    <span id={`${inputId}-avail`} className={`label ${styles.avail}`}>
                      {catalog.status === "loading" ? (
                        <span className={`skeleton ${styles.availSkeleton}`} aria-label="Loading availability" />
                      ) : available ? (
                        <>of {available[d]} available</>
                      ) : (
                        <>pick a source</>
                      )}
                    </span>
                    <FieldError id={`${inputId}-error`} message={err} />
                  </div>
                );
              })}
            </div>
          </fieldset>
          <FieldError id="counts-error" message={errors.counts} />
        </section>
      </div>

      {/* Specification summary */}
      <aside className={styles.summary} aria-label="Set specification">
        <div className={styles.summaryCard}>
          <div className={styles.summaryHead}>
            <span className="label">Specification</span>
            <span className="label">Rev. A</span>
          </div>
          <dl className={styles.specList}>
            <div>
              <dt className="label">Name</dt>
              <dd className={name.trim() ? undefined : styles.placeholder}>{name.trim() || "Untitled"}</dd>
            </div>
            <div>
              <dt className="label">Source</dt>
              <dd className={sheet ? undefined : styles.placeholder}>{sheet?.name ?? "Not selected"}</dd>
            </div>
            <div className={styles.specMix}>
              <dt className="label">Mix</dt>
              <dd>
                <MixBar counts={counts} total={total} />
              </dd>
            </div>
            <div>
              <dt className="label">Total</dt>
              <dd className={`mono tabular ${styles.specTotal}`}>
                {total} <span className="label">problems</span>
              </dd>
            </div>
          </dl>

          {submitError && (
            <div className="notice notice--error" role="alert">
              <AlertIcon />
              <span>{submitError}</span>
            </div>
          )}

          <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={submitting}>
            {submitting ? (
              <>
                <span className="spinner" aria-hidden="true" /> Fetching problems…
              </>
            ) : (
              <>
                Generate set <ArrowRightIcon />
              </>
            )}
          </button>
          <p className={styles.summaryNote}>Saved to this browser. You can delete it any time.</p>
        </div>
      </aside>
      <p className="visually-hidden" aria-live="polite">
        {submitting ? "Fetching problems and creating your set." : ""}
      </p>
    </form>
  );
}

function SectionLabel({ n, id, title }: { n: string; id: string; title: string }) {
  return (
    <h2 id={id} className={styles.sectionTitle}>
      <span className="mono">{n}</span>
      {title}
    </h2>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return (
    <p id={id} className="field__error" role={message ? "alert" : undefined} hidden={!message}>
      {message && (
        <>
          <span aria-hidden="true">✕</span> {message}
        </>
      )}
    </p>
  );
}

function MixBar({ counts, total }: { counts: DifficultyCounts; total: number }) {
  if (total <= 0) return <span className={styles.placeholder}>No problems yet</span>;
  return (
    <span className={styles.mix}>
      <span className={styles.mixBar} aria-hidden="true">
        {DIFFICULTIES.map((d) =>
          counts[d] > 0 ? (
            <span key={d} className={`diff--${d} ${styles.mixSeg}`} style={{ flexGrow: counts[d] }} />
          ) : null,
        )}
      </span>
      <span className={`mono tabular ${styles.mixLegend}`}>
        {DIFFICULTIES.map((d) => (
          <span key={d} className={`diff--${d}`}>
            {DIFFICULTY_LABEL[d][0]} {Number.isFinite(counts[d]) ? counts[d] : "?"}
          </span>
        ))}
      </span>
    </span>
  );
}
