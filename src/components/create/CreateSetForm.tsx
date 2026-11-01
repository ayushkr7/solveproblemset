"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";
import { DifficultyTicks } from "@/components/DifficultyBadge";
import { AlertIcon, ArrowRightIcon, MinusIcon, PlusIcon } from "@/components/Icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel, Fieldset, FieldsetLegend } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/components/ui/number-field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { SHEETS, fetchSheetProblems } from "@/data/sheets";
import { useProblemSets } from "@/hooks/useProblemSets";
import {
  NAME_MAX,
  PER_DIFFICULTY_MAX,
  RATED_COUNT_MAX,
  buildProblemSet,
  countByDifficulty,
  inRatingRange,
  pickByRating,
  pickProblems,
  ratingRange,
  usedProblemMatcher,
  validateCounts,
  validateInput,
  validateRatedInput,
  validateRating,
  type FieldErrors,
} from "@/lib/generate";
import { saveSet } from "@/lib/problem-sets";
import { CF_RATINGS } from "@/lib/sources/codeforces";
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

const RATING_PRESETS: { label: string; min: number; max: number }[] = [
  { label: "Div. 2 A–B", min: 800, max: 1200 },
  { label: "Div. 2 B–C", min: 1200, max: 1600 },
  { label: "Div. 2 C–D", min: 1600, max: 2000 },
  { label: "Div. 1", min: 2000, max: 2600 },
];

const RATING_ITEMS = CF_RATINGS.map((r) => ({ value: r, label: String(r) }));

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
  const [ratingMin, setRatingMin] = useState(800);
  const [ratingMax, setRatingMax] = useState(1200);
  const [rawRatedCount, setRawRatedCount] = useState("6");
  const [avoidUsed, setAvoidUsed] = useState(false);
  const [catalog, setCatalog] = useState<Catalog>({ status: "idle" });
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const nameRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const countsRef = useRef<HTMLFieldSetElement>(null);

  const counts: DifficultyCounts = {
    easy: toCount(rawCounts.easy),
    medium: toCount(rawCounts.medium),
    hard: toCount(rawCounts.hard),
  };
  const ratedCount = toCount(rawRatedCount);
  const rated = { min: ratingMin, max: ratingMax, count: ratedCount };
  const sheet = SHEETS.find((s) => s.id === sheetId);
  const byRating = sheet?.selectBy === "rating";
  const total = byRating
    ? Number.isFinite(ratedCount) ? ratedCount : 0
    : DIFFICULTIES.reduce((s, d) => s + (Number.isFinite(counts[d]) ? counts[d] : 0), 0);

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

  const otherSets = useMemo(
    () => (sheetId && existingSets ? existingSets.filter((s) => s.sheetId === sheetId) : []),
    [existingSets, sheetId],
  );
  const isUsed = useMemo(() => usedProblemMatcher(otherSets.flatMap((s) => s.problems)), [otherSets]);
  const usedCount = catalog.status === "ready" ? catalog.problems.filter(isUsed).length : null;

  const pool = useMemo(() => {
    if (catalog.status !== "ready") return null;
    return avoidUsed ? catalog.problems.filter((p) => !isUsed(p)) : catalog.problems;
  }, [catalog, avoidUsed, isUsed]);

  const available = pool ? countByDifficulty(pool) : undefined;
  const ratedAvailable = pool ? pool.filter((p) => inRatingRange(p, ratingMin, ratingMax)).length : undefined;
  const validate = (): FieldErrors =>
    byRating ? validateRatedInput({ name, sheetId, ...rated }, ratedAvailable) : validateInput({ name, sheetId, counts }, available);
  const errors: FieldErrors = attempted ? validate() : {};
  // Count problems (e.g. more than the sheet has) are flagged immediately, not only after submit.
  const liveErrors: FieldErrors = attempted
    ? errors
    : byRating
      ? validateRating(rated, ratedAvailable)
      : validateCounts(counts, available);

  const setCount = (d: Difficulty, value: string) => {
    setRawCounts((c) => ({ ...c, [d]: value }));
    setSubmitError(null);
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setAttempted(true);
    setSubmitError(null);
    const found = validate();
    if (Object.keys(found).length > 0 || !sheetId) {
      if (found.name) nameRef.current?.focus();
      else if (found.sheetId) sheetRef.current?.querySelector<HTMLElement>("[role='radio']")?.focus();
      else countsRef.current?.querySelector<HTMLElement>("[aria-invalid='true'], [role='combobox'], input")?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const problems = await fetchSheetProblems(sheetId);
      const candidates = avoidUsed ? problems.filter((p) => !isUsed(p)) : problems;
      const picked = byRating ? pickByRating(candidates, rated) : pickProblems(candidates, counts);
      const set = buildProblemSet({ name, sheetId, counts: byRating ? countByDifficulty(picked) : counts }, picked);
      saveSet(set);
      router.push(`/sets/${set.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong while creating the set.");
      setSubmitting(false);
    }
  }

  const hasOtherSetsForSheet = otherSets.length > 0;

  return (
    <form className={styles.layout} onSubmit={onSubmit} noValidate aria-busy={submitting}>
      <div className={styles.sections}>
        {/* 01 — Name */}
        <section className={styles.section} aria-labelledby="sec-name">
          <SectionLabel n="01" id="sec-name" title="Name the set" />
          <Field invalid={!!errors.name}>
            <FieldLabel>Problem set name</FieldLabel>
            <Input
              ref={nameRef}
              id="set-name"
              className="input"
              type="text"
              value={name}
              maxLength={NAME_MAX}
              placeholder="e.g. Sliding window sprint"
              autoComplete="off"
              onChange={(e) => {
                setName(e.target.value);
                setSubmitError(null);
              }}
            />
            <div className={styles.fieldMeta}>
              <FieldDescription render={<span />}>Something you&rsquo;ll recognise later.</FieldDescription>
              <span className="label tabular" aria-hidden="true">
                {name.trim().length}/{NAME_MAX}
              </span>
            </div>
            <FieldError message={errors.name} />
          </Field>
        </section>

        {/* 02 — Source */}
        <section className={styles.section} aria-labelledby="sec-source">
          <SectionLabel n="02" id="sec-source" title="Choose a source" />
          <RadioGroup
            ref={sheetRef}
            name="sheet"
            className={styles.sheets}
            value={sheetId}
            onValueChange={(value) => {
              setSheetId(value as SheetId);
              setSubmitError(null);
            }}
            aria-label="Problem source"
            aria-describedby="sheet-error"
          >
            {SHEETS.map((s) => (
              <label key={s.id} className={styles.sheet} data-checked={sheetId === s.id || undefined}>
                <span className={styles.sheetTop}>
                  <span className={styles.sheetTags}>
                    <span className={`mono ${styles.sheetCode}`}>{s.shortName}</span>
                    {s.kind === "live" && <span className={`label ${styles.liveTag}`}>Live</span>}
                  </span>
                  <RadioGroupItem value={s.id} className={styles.radioDot} />
                </span>
                <span className={styles.sheetName}>{s.name}</span>
                <span className={styles.sheetDesc}>{s.description}</span>
              </label>
            ))}
          </RadioGroup>
          <GroupError id="sheet-error" message={errors.sheetId} />

          {catalog.status === "error" && (
            <div className="notice notice--error" role="alert">
              <AlertIcon />
              <div className={styles.noticeBody}>
                <span>{catalog.message}</span>
                <Button size="sm" onClick={() => setReloadKey((k) => k + 1)}>
                  Retry
                </Button>
              </div>
            </div>
          )}

          {hasOtherSetsForSheet && (
            <label className={styles.check}>
              <Checkbox className={styles.checkBox} checked={avoidUsed} onCheckedChange={setAvoidUsed} />
              <span>
                <strong>Only new problems</strong>
                <span className="field__hint">
                  {" "}— skip the {usedCount === null ? "" : `${usedCount} `}problems already in your other {sheet?.shortName} sets.
                </span>
              </span>
            </label>
          )}
        </section>

        {/* 03 — Difficulty mix */}
        <section className={styles.section} aria-labelledby="sec-mix">
          <SectionLabel n="03" id="sec-mix" title={byRating ? "Set the rating range" : "Set the difficulty mix"} />
          {byRating ? (
            <RatingFields
              fieldsetRef={countsRef}
              min={ratingMin}
              max={ratingMax}
              rawCount={rawRatedCount}
              available={ratedAvailable}
              loading={catalog.status === "loading"}
              errors={liveErrors}
              onRange={(min, max) => {
                setRatingMin(min);
                setRatingMax(max);
                setSubmitError(null);
              }}
              onCount={(v) => {
                setRawRatedCount(v);
                setSubmitError(null);
              }}
            />
          ) : (
            <>
              <div className={styles.presets} role="group" aria-label="Presets">
                {PRESETS.map((p) => (
                  <Button
                    key={p.label}
                    size="sm"
                    onClick={() => {
                      setRawCounts({ easy: String(p.counts.easy), medium: String(p.counts.medium), hard: String(p.counts.hard) });
                      setSubmitError(null);
                    }}
                  >
                    {p.label}
                    <span className={`mono ${styles.presetSpec}`}>
                      {p.counts.easy}/{p.counts.medium}/{p.counts.hard}
                    </span>
                  </Button>
                ))}
              </div>

              <Fieldset ref={countsRef} className={styles.fieldset} aria-describedby="counts-error">
                <FieldsetLegend className="visually-hidden">Number of problems per difficulty</FieldsetLegend>
                <div className={styles.counts}>
                  {DIFFICULTIES.map((d) => (
                    <CountField
                      key={d}
                      id={`count-${d}`}
                      className={`${styles.count} diff--${d}`}
                      label={
                        <>
                          <DifficultyTicks difficulty={d} />
                          {DIFFICULTY_LABEL[d]}
                        </>
                      }
                      noun={`${DIFFICULTY_LABEL[d].toLowerCase()} problems`}
                      raw={rawCounts[d]}
                      min={0}
                      // + stops at what the source has; typing more shows why instead of clamping.
                      max={Math.min(PER_DIFFICULTY_MAX, available?.[d] ?? PER_DIFFICULTY_MAX)}
                      available={catalog.status === "loading" ? "loading" : available?.[d]}
                      error={liveErrors[d]}
                      onChange={(v) => setCount(d, v)}
                    />
                  ))}
                </div>
              </Fieldset>
              <GroupError id="counts-error" message={errors.counts} />
            </>
          )}
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
              <dt className="label">{byRating ? "Rating" : "Mix"}</dt>
              <dd>
                {byRating ? (
                  <span className="mono tabular">{ratingRange(ratingMin, ratingMax)}</span>
                ) : (
                  <MixBar counts={counts} total={total} />
                )}
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

          <Button type="submit" variant="primary" size="lg" block disabled={submitting}>
            {submitting ? (
              <>
                <span className="spinner" aria-hidden="true" /> Fetching problems…
              </>
            ) : (
              <>
                Generate set <ArrowRightIcon />
              </>
            )}
          </Button>
          <p className={styles.summaryNote}>Saved to this browser. You can delete it any time.</p>
        </div>
      </aside>
      <p className="visually-hidden" aria-live="polite">
        {submitting ? "Fetching problems and creating your set." : ""}
      </p>
    </form>
  );
}

function RatingFields({
  fieldsetRef,
  min,
  max,
  rawCount,
  available,
  loading,
  errors,
  onRange,
  onCount,
}: {
  fieldsetRef: RefObject<HTMLFieldSetElement | null>;
  min: number;
  max: number;
  rawCount: string;
  available: number | undefined;
  loading: boolean;
  errors: FieldErrors;
  onRange: (min: number, max: number) => void;
  onCount: (raw: string) => void;
}) {
  // Moving one end past the other drags the other end along, so the range is never empty.
  const ends = [
    { id: "rating-min", label: "Lowest", value: min, set: (v: number) => onRange(v, Math.max(v, max)) },
    { id: "rating-max", label: "Highest", value: max, set: (v: number) => onRange(Math.min(min, v), v) },
  ];

  return (
    <>
      <div className={styles.presets} role="group" aria-label="Rating presets">
        {RATING_PRESETS.map((p) => (
          <Toggle
            key={p.label}
            size="sm"
            pressed={min === p.min && max === p.max}
            onPressedChange={() => onRange(p.min, p.max)}
          >
            {p.label}
            <span className={`mono ${styles.presetSpec}`}>
              {p.min}–{p.max}
            </span>
          </Toggle>
        ))}
      </div>

      <Fieldset ref={fieldsetRef} className={styles.fieldset} aria-describedby="rating-hint rating-error">
        <FieldsetLegend className="visually-hidden">Rating range and number of problems</FieldsetLegend>
        <div className={styles.counts}>
          {ends.map((e) => (
            <div key={e.id} className={`${styles.count} ${styles.countRated}`} data-invalid={errors.rating ? "" : undefined}>
              <Select items={RATING_ITEMS} value={e.value} onValueChange={(v) => v !== null && e.set(v)}>
                <SelectLabel className={styles.countLabel}>{e.label} rating</SelectLabel>
                <SelectTrigger
                  id={e.id}
                  className={`mono tabular ${styles.ratingSelect}`}
                  aria-invalid={errors.rating ? true : undefined}
                />
                <SelectContent className={styles.ratingPopup}>
                  {CF_RATINGS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}

          <CountField
            id="rated-count"
            className={`${styles.count} ${styles.countRated}`}
            label="Problems"
            noun="problems"
            raw={rawCount}
            min={1}
            max={Math.min(RATED_COUNT_MAX, available ?? RATED_COUNT_MAX)}
            available={loading ? "loading" : available}
            error={errors.count}
            onChange={onCount}
          />
        </div>
      </Fieldset>
      <p id="rating-hint" className="field__hint">
        Problems are spread evenly across the ratings from {ratingRange(min, max)}, lowest first.
      </p>
      <GroupError id="rating-error" message={errors.rating} />
    </>
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

/**
 * A count card: Base UI Field (label, description, error wiring) around a
 * NumberField. The − / + buttons and arrow keys step within min–max; typing is
 * not clamped (allowOutOfRange), so a too-large number shows the reason.
 */
function CountField({
  id,
  className,
  label,
  noun,
  raw,
  min,
  max,
  available,
  error,
  onChange,
}: {
  id: string;
  className: string;
  label: ReactNode;
  /** For the step buttons: "Fewer easy problems". */
  noun: string;
  raw: string;
  min: number;
  max: number;
  available: number | "loading" | undefined;
  error?: string;
  onChange: (raw: string) => void;
}) {
  const value = raw.trim() === "" || !Number.isFinite(Number(raw)) ? null : Number(raw);
  return (
    <Field className={className} invalid={!!error}>
      <FieldLabel className={styles.countLabel}>{label}</FieldLabel>
      <NumberField
        id={id}
        value={value}
        min={min}
        max={max}
        step={1}
        allowOutOfRange
        onValueChange={(v) => onChange(v === null ? "" : String(v))}
      >
        <NumberFieldGroup className={styles.stepper}>
          <NumberFieldDecrement className={styles.stepBtn} aria-label={`Fewer ${noun}`}>
            <MinusIcon />
          </NumberFieldDecrement>
          <NumberFieldInput className={`mono tabular ${styles.countInput}`} onFocus={(e) => e.currentTarget.select()} />
          <NumberFieldIncrement className={styles.stepBtn} aria-label={`More ${noun}`}>
            <PlusIcon />
          </NumberFieldIncrement>
        </NumberFieldGroup>
      </NumberField>
      <FieldDescription render={<span />} className={`label ${styles.avail}`}>
        {available === "loading" ? (
          <span className={`skeleton ${styles.availSkeleton}`} aria-label="Loading availability" />
        ) : available !== undefined ? (
          <>of {available} available</>
        ) : (
          <>pick a source</>
        )}
      </FieldDescription>
      <FieldError message={error} />
    </Field>
  );
}

/** Error for a whole group (source, mix, range), outside any single Field. */
function GroupError({ id, message }: { id: string; message?: string }) {
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
