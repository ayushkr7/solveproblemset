"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DifficultyTicks } from "@/components/DifficultyBadge";
import { AlertIcon, ArrowRightIcon, InfoIcon, MinusIcon, PlusIcon, TrashIcon } from "@/components/Icons";
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
import { CUSTOM_SHORT_NAME, SHEETS, fetchSheetProblems } from "@/data/sheets";
import { useCustomSheets } from "@/hooks/useCustomSheets";
import { useProblemSets } from "@/hooks/useProblemSets";
import { deleteCustomSheet } from "@/lib/custom-sheets";
import { plural } from "@/lib/format";
import {
  NAME_MAX,
  PER_DIFFICULTY_MAX,
  RATED_COUNT_MAX,
  buildProblemSet,
  countByDifficulty,
  inRatingRange,
  pickByRating,
  pickMix,
  pickProblems,
  ratingRange,
  usedProblemMatcher,
  validateCounts,
  validateInput,
  validateMix,
  validateMixInput,
  validateRatedInput,
  validateRating,
  type FieldErrors,
} from "@/lib/generate";
import { isCodeforcesRow } from "@/lib/excel/custom-sheet";
import { saveSet } from "@/lib/problem-sets";
import { CF_RATINGS, CF_RATING_STEP } from "@/lib/sources/codeforces";
import {
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  type CatalogProblem,
  type CustomSheet,
  type Difficulty,
  type DifficultyCounts,
  type SheetId,
} from "@/lib/types";
import { AddCustomSheet, CustomSheetFormatDialog } from "./CustomSheetSource";
import styles from "./CreateSetForm.module.css";

type Catalog =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; problems: CatalogProblem[] }
  | { status: "error"; message: string };

/** One card in "Choose a source": a built-in source, or one of the person's custom sheets. */
interface SourceOption {
  key: string;
  sheetId: SheetId;
  name: string;
  shortName: string;
  description: string;
  live: boolean;
  selectBy: "difficulty" | "rating";
  load: () => Promise<CatalogProblem[]>;
  custom: CustomSheet | null;
  /**
   * A custom sheet's two kinds of problem: LeetCode ones, picked by difficulty,
   * and Codeforces ones (with their lowest and highest rating), picked by rating.
   */
  split: { leetcode: number; codeforces: { count: number; min: number; max: number } | null } | null;
}

const BUILT_IN_SOURCES: readonly SourceOption[] = SHEETS.map((s) => ({
  key: s.id,
  sheetId: s.id,
  name: s.name,
  shortName: s.shortName,
  description: s.description,
  live: s.kind === "live",
  selectBy: s.selectBy,
  load: () => fetchSheetProblems(s.id),
  custom: null,
  split: null,
}));

// "Choose a source" shows live sources, then the person's own sheets, then the curated sheets (the add card comes last).
const LIVE_SOURCES = BUILT_IN_SOURCES.filter((s) => s.live);
const CURATED_SOURCES = BUILT_IN_SOURCES.filter((s) => !s.live);

function customSource(sheet: CustomSheet): SourceOption {
  const ratings = sheet.problems.flatMap((p) => (isCodeforcesRow(p) && p.rating !== undefined ? [p.rating] : []));
  return {
    key: `custom:${sheet.id}`,
    sheetId: "custom",
    name: sheet.name,
    shortName: CUSTOM_SHORT_NAME,
    description: `${plural(sheet.problems.length, "problem")} from ${sheet.fileName}`,
    live: false,
    selectBy: "difficulty",
    load: () => Promise.resolve(sheet.problems),
    custom: sheet,
    split: {
      leetcode: sheet.problems.filter((p) => !isCodeforcesRow(p)).length,
      codeforces:
        ratings.length > 0 ? { count: ratings.length, min: Math.min(...ratings), max: Math.max(...ratings) } : null,
    },
  };
}

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
  const customSheets = useCustomSheets();

  const [name, setName] = useState("");
  const [sourceKey, setSourceKey] = useState<string | null>(null);
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
  const [formatOpen, setFormatOpen] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [removing, setRemoving] = useState<CustomSheet | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const countsRef = useRef<HTMLFieldSetElement>(null);
  const ratingRef = useRef<HTMLFieldSetElement>(null);
  const mixRef = useRef<HTMLElement>(null);
  const addSheetRef = useRef<HTMLButtonElement>(null);
  const addedFocusRef = useRef<HTMLElement | null>(null);
  const formatFocusRef = useRef<HTMLElement | null>(null);
  const removedFocusRef = useRef<HTMLElement | null>(null);

  const counts: DifficultyCounts = {
    easy: toCount(rawCounts.easy),
    medium: toCount(rawCounts.medium),
    hard: toCount(rawCounts.hard),
  };
  const ratedCount = toCount(rawRatedCount);
  const rated = { min: ratingMin, max: ratingMax, count: ratedCount };
  const customSources = useMemo(() => customSheets.map(customSource), [customSheets]);
  const sources = useMemo(() => [...LIVE_SOURCES, ...customSources, ...CURATED_SOURCES], [customSources]);
  // Undefined when nothing is selected, or the selected sheet was removed in another tab.
  const source = sources.find((s) => s.key === sourceKey);
  const sheetId = source?.sheetId ?? null;
  // A custom sheet shows a picker per platform it has: by difficulty for LeetCode,
  // by rating for Codeforces, or both, in which case one set mixes them.
  const split = source?.split ?? null;
  const showRating = split ? split.codeforces !== null : source?.selectBy === "rating";
  const showDifficulty = split ? split.leetcode > 0 : !showRating;
  const mixed = showDifficulty && showRating;
  const byRating = showRating && !mixed;
  const difficultyTotal = DIFFICULTIES.reduce((s, d) => s + (Number.isFinite(counts[d]) ? counts[d] : 0), 0);
  const ratedTotal = Number.isFinite(ratedCount) ? ratedCount : 0;
  const total = (showDifficulty ? difficultyTotal : 0) + (showRating ? ratedTotal : 0);

  // Load the selected source so availability can be shown and validated up front.
  useEffect(() => {
    if (!source) {
      setCatalog({ status: "idle" });
      return;
    }
    let cancelled = false;
    setCatalog({ status: "loading" });
    source.load().then(
      (problems) => !cancelled && setCatalog({ status: "ready", problems }),
      (err: unknown) =>
        !cancelled &&
        setCatalog({
          status: "error",
          message: err instanceof Error ? err.message : "Couldn't load problems.",
        }),
    );
    return () => {
      cancelled = true;
    };
  }, [source, reloadKey]);

  const otherSets = useMemo(
    () =>
      source && existingSets
        ? existingSets.filter(
            (s) => s.sheetId === source.sheetId && (!source.custom || s.customSheetName === source.custom.name),
          )
        : [],
    [existingSets, source],
  );
  const isUsed = useMemo(() => usedProblemMatcher(otherSets.flatMap((s) => s.problems)), [otherSets]);
  const usedCount = catalog.status === "ready" ? catalog.problems.filter(isUsed).length : null;

  const pool = useMemo(() => {
    if (catalog.status !== "ready") return null;
    return avoidUsed ? catalog.problems.filter((p) => !isUsed(p)) : catalog.problems;
  }, [catalog, avoidUsed, isUsed]);

  // Each picker only sees its own platform's problems.
  const byDifficultyPool = pool && split ? pool.filter((p) => !isCodeforcesRow(p)) : pool;
  const byRatingPool = pool && split ? pool.filter(isCodeforcesRow) : pool;
  const available = byDifficultyPool ? countByDifficulty(byDifficultyPool) : undefined;
  const ratedAvailable = byRatingPool
    ? byRatingPool.filter((p) => inRatingRange(p, ratingMin, ratingMax)).length
    : undefined;
  const validate = (): FieldErrors =>
    mixed
      ? validateMixInput({ name, sheetId, counts, rating: rated }, available, ratedAvailable)
      : byRating
        ? validateRatedInput({ name, sheetId, ...rated }, ratedAvailable)
        : validateInput({ name, sheetId, counts }, available);
  const errors: FieldErrors = attempted ? validate() : {};
  // Count problems (e.g. more than the sheet has) are flagged immediately, not only after submit.
  const liveErrors: FieldErrors = attempted
    ? errors
    : mixed
      ? validateMix(counts, rated, available, ratedAvailable)
      : byRating
        ? validateRating(rated, ratedAvailable)
        : validateCounts(counts, available);

  function selectSource(option: SourceOption) {
    setSourceKey(option.key);
    setSubmitError(null);
    const codeforces = option.split?.codeforces;
    if (!codeforces) return;
    // Start from the sheet's whole Codeforces rating range.
    const { min, max } = codeforces;
    setRatingMin(Math.floor(min / CF_RATING_STEP) * CF_RATING_STEP);
    setRatingMax(Math.ceil(max / CF_RATING_STEP) * CF_RATING_STEP);
  }

  const setCount = (d: Difficulty, value: string) => {
    setRawCounts((c) => ({ ...c, [d]: value }));
    setSubmitError(null);
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setAttempted(true);
    setSubmitError(null);
    const found = validate();
    if (Object.keys(found).length > 0 || !source) {
      if (found.name) nameRef.current?.focus();
      else if (found.sheetId) sheetRef.current?.querySelector<HTMLElement>("[role='radio']")?.focus();
      else mixRef.current?.querySelector<HTMLElement>("[aria-invalid='true'], [role='combobox'], input")?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const problems = await source.load();
      const candidates = avoidUsed ? problems.filter((p) => !isUsed(p)) : problems;
      const lc = split ? candidates.filter((p) => !isCodeforcesRow(p)) : candidates;
      const cf = split ? candidates.filter(isCodeforcesRow) : candidates;
      const picked = mixed
        ? pickMix(lc, counts, cf, rated)
        : byRating
          ? pickByRating(cf, rated)
          : pickProblems(lc, counts);
      const set = buildProblemSet(
        {
          name,
          sheetId: source.sheetId,
          customSheetName: source.custom?.name ?? null,
          counts: showRating ? countByDifficulty(picked) : counts,
        },
        picked,
      );
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
          <div className={styles.sectionHead}>
            <SectionLabel n="02" id="sec-source" title="Choose a source" />
            <CustomSheetFormatDialog
              open={formatOpen}
              onOpenChange={(open) => {
                if (open) formatFocusRef.current = null; // opened by its own button: return there
                setFormatOpen(open);
              }}
              returnFocus={formatFocusRef}
              trigger={
                <Button variant="ghost" size="icon" aria-label="Custom sheet format" title="Custom sheet format">
                  <InfoIcon />
                </Button>
              }
            />
          </div>
          <div className={styles.sheets}>
            {/* display: contents, so the cards and the add card (not a radio) share one grid. */}
            <RadioGroup
              ref={sheetRef}
              name="sheet"
              className={styles.sheetGroup}
              value={sourceKey}
              onValueChange={(value) => {
                const option = sources.find((s) => s.key === value);
                if (option) selectSource(option);
              }}
              aria-label="Problem source"
              aria-describedby="sheet-error"
            >
              {sources.map((s) => (
                <label key={s.key} className={styles.sheet} data-checked={sourceKey === s.key || undefined}>
                  <span className={styles.sheetTop}>
                    <span className={styles.sheetTags}>
                      <span className={`mono ${styles.sheetCode}`}>{s.shortName}</span>
                      {s.live && <span className={`label ${styles.liveTag}`}>Live</span>}
                    </span>
                    <RadioGroupItem
                      ref={s.key === justAdded ? addedFocusRef : undefined}
                      value={s.key}
                      className={styles.radioDot}
                    />
                  </span>
                  <span className={styles.sheetName}>{s.name}</span>
                  <span className={styles.sheetDesc}>{s.description}</span>
                </label>
              ))}
            </RadioGroup>
            <AddCustomSheet
              sheets={customSheets}
              triggerRef={addSheetRef}
              returnFocus={addedFocusRef}
              onAdded={(added) => {
                const option = customSource(added);
                setJustAdded(option.key);
                selectSource(option);
              }}
              onShowFormat={() => {
                formatFocusRef.current = addSheetRef.current;
                setFormatOpen(true);
              }}
              onError={setAddError}
            />
          </div>
          <GroupError id="sheet-error" message={errors.sheetId} />

          {addError && (
            <div className="notice notice--error" role="alert">
              <AlertIcon />
              <span>{addError}</span>
            </div>
          )}

          {source?.custom && (
            <div className={styles.customNote}>
              <span className="field__hint">Saved in this browser. Sets you create from it stay if you remove it.</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  removedFocusRef.current = null;
                  setRemoving(source.custom);
                }}
              >
                <TrashIcon /> Remove sheet
              </Button>
            </div>
          )}

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
                  {" "}
                  — skip the {usedCount === null ? "" : `${usedCount} `}problems already in your other{" "}
                  {source?.custom ? source.name : source?.shortName} sets.
                </span>
              </span>
            </label>
          )}
        </section>

        {/* 03 — Problem mix */}
        <section ref={mixRef} className={styles.section} aria-labelledby="sec-mix">
          <SectionLabel
            n="03"
            id="sec-mix"
            title={mixed ? "Set the problem mix" : byRating ? "Set the rating range" : "Set the difficulty mix"}
          />
          {mixed && (
            <p className="field__hint">
              This sheet has LeetCode and Codeforces problems. Pick LeetCode problems by difficulty and Codeforces
              problems by rating, and the set gets both. Either can be 0.
            </p>
          )}
          {showDifficulty && (
            <div className={styles.picker}>
              {mixed && (
                <h3 className={styles.pickerTitle}>
                  LeetCode <span className="label">by difficulty</span>
                </h3>
              )}
              <div className={styles.presets} role="group" aria-label={mixed ? "LeetCode presets" : "Presets"}>
                {PRESETS.map((p) => (
                  <Button
                    key={p.label}
                    size="sm"
                    onClick={() => {
                      setRawCounts({
                        easy: String(p.counts.easy),
                        medium: String(p.counts.medium),
                        hard: String(p.counts.hard),
                      });
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
                <FieldsetLegend className="visually-hidden">
                  {mixed ? "Number of LeetCode problems per difficulty" : "Number of problems per difficulty"}
                </FieldsetLegend>
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
            </div>
          )}
          {showRating && (
            <div className={styles.picker}>
              {mixed && (
                <h3 className={styles.pickerTitle}>
                  Codeforces <span className="label">by rating</span>
                </h3>
              )}
              <RatingFields
                fieldsetRef={ratingRef}
                legend={
                  mixed ? "Codeforces rating range and number of problems" : "Rating range and number of problems"
                }
                minCount={mixed ? 0 : 1}
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
            </div>
          )}
          <GroupError id="counts-error" message={errors.counts} />
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
              <dd className={source ? undefined : styles.placeholder}>{source?.name ?? "Not selected"}</dd>
            </div>
            {showDifficulty && (
              <div className={styles.specMix}>
                <dt className="label">{mixed ? "LeetCode" : "Mix"}</dt>
                <dd>
                  <MixBar counts={counts} total={difficultyTotal} />
                </dd>
              </div>
            )}
            {showRating && (
              <div>
                <dt className="label">{mixed ? "Codeforces" : "Rating"}</dt>
                <dd className="mono tabular">
                  {ratingRange(ratingMin, ratingMax)}
                  {mixed && <span className="label"> · {ratedTotal} problems</span>}
                </dd>
              </div>
            )}
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

      <ConfirmDialog
        open={removing !== null}
        eyebrow="Confirm removal"
        title={`Remove “${removing?.name ?? ""}”?`}
        confirmLabel="Remove sheet"
        returnFocus={removedFocusRef}
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (!removing) return;
          // The button that opened this goes with the sheet.
          removedFocusRef.current = addSheetRef.current;
          deleteCustomSheet(removing.id);
          setSourceKey(null);
          setRemoving(null);
        }}
      >
        <p>
          This removes the sheet from this browser. Sets you created from it are kept. You can add the file again at any
          time.
        </p>
      </ConfirmDialog>
    </form>
  );
}

function RatingFields({
  fieldsetRef,
  min,
  max,
  rawCount,
  available,
  legend,
  minCount,
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
  legend: string;
  /** 0 when this is one of two pickers, so the set can take none from it. */
  minCount: number;
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
        <FieldsetLegend className="visually-hidden">{legend}</FieldsetLegend>
        <div className={styles.counts}>
          {ends.map((e) => (
            <div
              key={e.id}
              className={`${styles.count} ${styles.countRated}`}
              data-invalid={errors.rating ? "" : undefined}
            >
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
            min={minCount}
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
