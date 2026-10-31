import Link from "next/link";
import { DifficultyBadge, DifficultyTicks } from "@/components/DifficultyBadge";
import { ArrowRightIcon } from "@/components/Icons";
import { SHEETS } from "@/data/sheets";
import { countByDifficulty } from "@/lib/generate";
import type { Difficulty } from "@/lib/types";
import styles from "./landing.module.css";

const FEATURES = [
  {
    n: "01",
    title: "Personalised sets",
    body: "Pick a sheet, dial in how many Easy, Medium and Hard problems you want, and get a fresh, randomised set in one click.",
    spec: "E / M / H · independent counts",
  },
  {
    n: "02",
    title: "Split timing",
    body: "Each tick records the time since your previous solve — so you see exactly how long every individual problem took.",
    spec: "Δt between consecutive solves",
  },
  {
    n: "03",
    title: "Pause without penalty",
    body: "Step away whenever you need. Paused and stopped time is excluded from every recorded duration.",
    spec: "Active time only",
  },
  {
    n: "04",
    title: "Persistent & private",
    body: "Refresh, close the tab, come back next week. Progress and the running clock are saved in your browser, never uploaded.",
    spec: "localStorage · no account",
  },
];

const STEPS = [
  {
    n: "A",
    title: "Configure",
    body: "Name the set, choose a sheet, LeetCode or Codeforces, and set the difficulty mix or rating range.",
  },
  {
    n: "B",
    title: "Generate",
    body: "Problems are drawn from the source and ordered Easy → Medium → Hard, or by rating.",
  },
  {
    n: "C",
    title: "Solve & split",
    body: "Start the timer, open each problem, and tick it off. The split is logged automatically.",
  },
  {
    n: "D",
    title: "Review",
    body: "Revisit any previous set to see completion and timings — or resume right where you stopped.",
  },
];

const FIGURE_ROWS: {
  title: string;
  d: Difficulty;
  time: string | null;
  done: boolean;
}[] = [
  { title: "Two Sum", d: "easy", time: "4.2", done: true },
  { title: "Sort Colors", d: "medium", time: "11", done: true },
  { title: "Merge Intervals", d: "medium", time: "18", done: true },
  { title: "Trapping Rain Water", d: "hard", time: null, done: false },
];

export default async function LandingPage() {
  // Counted from the sheet files at build time; the page stays static. Live
  // sources are fetched only when someone picks one.
  const sheets = SHEETS.filter((s) => s.kind === "sheet");
  const live = SHEETS.filter((s) => s.kind === "live");
  const sheetStats = await Promise.all(
    sheets.map(async (s) => {
      const problems = await s.load();
      return {
        ...s,
        total: problems.length,
        counts: countByDifficulty(problems),
      };
    }),
  );

  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={`container ${styles.heroGrid}`}>
          <div className={styles.heroCopy}>
            <p className={`label ${styles.kicker}`}>
              <span className={styles.kickerDot} aria-hidden="true" />
              Sheet 01 — A practice system for DSA &amp; CP
            </p>
            <h1 id="hero-title" className={styles.heroTitle}>
              Practice,
              <br />
              <span className="serif-accent">measured.</span>
            </h1>
            <p className={styles.heroLede}>
              Turn Striver&rsquo;s sheets, NeetCode&rsquo;s Blind 75, LeetCode
              and Codeforces into focused, personalised problem sets. Time every
              solve, pause without penalty, and pick up exactly where you left
              off.
            </p>
            <div className={styles.ctaRow}>
              <Link href="/create" className="btn btn--primary btn--lg">
                Create a problem set <ArrowRightIcon />
              </Link>
              <Link href="/sets" className="btn btn--lg">
                View previous sets
              </Link>
            </div>
            <dl className={styles.specs}>
              <div>
                <dt className="label">Sources</dt>
                <dd className="mono">
                  {sheets.length} sheets · {live.length} live
                </dd>
              </div>
              <div>
                <dt className="label">Tiers</dt>
                <dd className="mono">E · M · H</dd>
              </div>
              <div>
                <dt className="label">Accounts</dt>
                <dd className="mono">None</dd>
              </div>
            </dl>
          </div>

          <figure
            className={styles.figure}
            aria-label="Illustration of a problem set in progress"
          >
            <div className={styles.figFrame}>
              <span
                className={`${styles.corner} ${styles.cTL}`}
                aria-hidden="true"
              />
              <span
                className={`${styles.corner} ${styles.cTR}`}
                aria-hidden="true"
              />
              <span
                className={`${styles.corner} ${styles.cBL}`}
                aria-hidden="true"
              />
              <span
                className={`${styles.corner} ${styles.cBR}`}
                aria-hidden="true"
              />

              <div className={styles.figHead}>
                <div>
                  <span className="label">Set</span>
                  <strong>Weekend sprint</strong>
                </div>
                <div className={styles.figClock}>
                  <span className="label">Elapsed</span>
                  <strong className="mono tabular">00:33:12</strong>
                </div>
              </div>

              <ol className={styles.figRows}>
                {FIGURE_ROWS.map((r, i) => (
                  <li
                    key={r.title}
                    className={styles.figRow}
                    data-done={r.done || undefined}
                  >
                    <span className={`mono ${styles.figNo}`}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className={styles.figBox} aria-hidden="true">
                      {r.done ? "✓" : ""}
                    </span>
                    <span className={styles.figTitle}>{r.title}</span>
                    <span className={styles.figDiff}>
                      <DifficultyBadge difficulty={r.d} />
                    </span>
                    <span className={`mono tabular ${styles.figTime}`}>
                      {r.time ? (
                        `${r.time} min`
                      ) : (
                        <span className={styles.figLive}>live</span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>

              <div className={styles.figFoot}>
                <span className="label">3 / 4 solved</span>
                <span className={styles.figBar} aria-hidden="true">
                  <span style={{ width: "75%" }} />
                </span>
                <span className="label">75%</span>
              </div>
            </div>
            <figcaption className={`label ${styles.figCaption}`}>
              Fig. 1 — A set mid-session. Times are splits between solves.
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ---------------- Capabilities ---------------- */}
      <section className={styles.section} aria-labelledby="features-title">
        <div className="container">
          <SectionHead index="§ 01" title="What it does" id="features-title" />
          <ul className={styles.features}>
            {FEATURES.map((f) => (
              <li key={f.n} className={styles.feature}>
                <span className={`mono ${styles.featureNo}`}>{f.n}</span>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureBody}>{f.body}</p>
                <p className={`label ${styles.featureSpec}`}>{f.spec}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------- Workflow ---------------- */}
      <section className={styles.section} aria-labelledby="workflow-title">
        <div className="container">
          <SectionHead index="§ 02" title="The procedure" id="workflow-title" />
          <ol className={styles.steps}>
            {STEPS.map((s) => (
              <li key={s.n} className={styles.step}>
                <span className={styles.stepNode} aria-hidden="true">
                  {s.n}
                </span>
                <h3 className={styles.stepTitle}>{s.title}</h3>
                <p className={styles.stepBody}>{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------- Timing model ---------------- */}
      <section className={styles.section} aria-labelledby="timing-title">
        <div className="container">
          <SectionHead
            index="§ 03"
            title="How time is measured"
            id="timing-title"
          />
          <div className={styles.timingGrid}>
            <div className={styles.timingCopy}>
              <p>
                The session clock only advances while it&rsquo;s running. When
                you mark a problem solved, its time is the active time since
                your previous solve — or since you pressed Start, for the first
                one.
              </p>
              <p className="muted">
                Breaks are free: pause for coffee and the gap is simply not
                counted. Unticking your latest solve hands its time back to the
                problem you&rsquo;re on, so nothing is lost or counted twice.
              </p>
            </div>
            <figure
              className={styles.timeline}
              aria-label="Timeline: three solves with a pause excluded from the second"
            >
              <div className={styles.track}>
                <span className={styles.seg} style={{ gridColumn: 1 }}>
                  run
                </span>
                <span className={styles.seg} style={{ gridColumn: 2 }}>
                  run
                </span>
                <span
                  className={`${styles.seg} ${styles.segPause}`}
                  style={{ gridColumn: 3 }}
                >
                  pause
                </span>
                <span className={styles.seg} style={{ gridColumn: 4 }}>
                  run
                </span>
                <span className={styles.seg} style={{ gridColumn: 5 }}>
                  run
                </span>
              </div>
              <div className={styles.marks}>
                <span className={styles.mark} style={{ gridColumn: "1 / 2" }}>
                  <b className="mono">P1</b> 8.7 min
                </span>
                <span className={styles.mark} style={{ gridColumn: "2 / 5" }}>
                  <b className="mono">P2</b> 12.2 min <em>pause excluded</em>
                </span>
                <span className={styles.mark} style={{ gridColumn: "5 / 6" }}>
                  <b className="mono">P3</b> 9.5 min
                </span>
              </div>
              <figcaption className="label">
                Fig. 2 — Recorded time = active time between consecutive solves.
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* ---------------- Sources ---------------- */}
      <section className={styles.section} aria-labelledby="sources-title">
        <div className="container">
          <SectionHead
            index="§ 04"
            title="Problem sources"
            id="sources-title"
          />
          <ul className={styles.sources}>
            {live.map((s) => (
              <li key={s.id} className={styles.source}>
                <div className={styles.sourceHead}>
                  <span className={`mono ${styles.sourceCode}`}>
                    {s.shortName}
                  </span>
                  <span className="label">Live · {s.author}</span>
                </div>
                <h3 className={styles.sourceTitle}>{s.name}</h3>
                <p className="muted">{s.description}</p>
                <p className={`label ${styles.sourceLive}`}>
                  {s.selectBy === "rating"
                    ? "Pick by rating · 800–3500"
                    : "Pick by difficulty · E / M / H"}
                </p>
              </li>
            ))}
            {sheetStats.map((s) => (
              <li key={s.id} className={styles.source}>
                <div className={styles.sourceHead}>
                  <span className={`mono ${styles.sourceCode}`}>
                    {s.shortName}
                  </span>
                  <span className="label">{s.author}</span>
                </div>
                <h3 className={styles.sourceTitle}>{s.name}</h3>
                <p className="muted">{s.description}</p>
                <dl className={styles.sourceCounts}>
                  {(["easy", "medium", "hard"] as const).map((d) => (
                    <div key={d} className={`diff--${d}`}>
                      <dt className="label">
                        <span className={styles.sourceTick}>
                          <DifficultyTicks difficulty={d} />
                        </span>
                        {d}
                      </dt>
                      <dd className="mono tabular">{s.counts[d]}</dd>
                    </div>
                  ))}
                  <div>
                    <dt className="label">Total</dt>
                    <dd className="mono tabular">{s.total}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className={styles.cta} aria-labelledby="cta-title">
        <div className={`container ${styles.ctaInner}`}>
          <h2 id="cta-title" className={styles.ctaTitle}>
            Draft your first set.{" "}
            <span className="serif-accent">Ship the solves.</span>
          </h2>
          <div className={styles.ctaRow}>
            <Link href="/create" className="btn btn--primary btn--lg">
              Create a problem set <ArrowRightIcon />
            </Link>
            <Link href="/sets" className="btn btn--lg">
              View previous sets
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function SectionHead({
  index,
  title,
  id,
}: {
  index: string;
  title: string;
  id: string;
}) {
  return (
    <header className={styles.sectionHead}>
      <span className={`mono ${styles.sectionIndex}`}>{index}</span>
      <h2 id={id} className={styles.sectionTitle}>
        {title}
      </h2>
    </header>
  );
}
