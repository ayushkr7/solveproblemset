import Link from "next/link";
import type { ReactNode } from "react";
import { LEGAL_LINKS, LEGAL_UPDATED, SITE } from "@/lib/site";
import styles from "./LegalPage.module.css";

export interface LegalSection {
  /** Anchor id, e.g. "google-drive" → /privacy#google-drive. Keep stable: other pages link to them. */
  id: string;
  title: string;
  body: ReactNode;
}

/**
 * Layout shared by the Privacy Policy and Terms of Service: page head with the
 * last-updated date, an "On this page" contents list, and numbered sections.
 * The contents and headings come from the same `sections`, so they can't drift.
 */
export function LegalPage({
  kicker,
  title,
  lede,
  summary,
  sections,
  related,
}: {
  kicker: string;
  title: ReactNode;
  lede: ReactNode;
  /** Plain-language overview shown before the full text. */
  summary?: ReactNode;
  sections: readonly LegalSection[];
  related: "privacy" | "terms";
}) {
  const n = (i: number) => String(i + 1).padStart(2, "0");
  return (
    <div className="container page">
      <header className="page-head">
        <div className="page-head__meta">
          <span className="label">§ Legal</span>
          <span className="label">{kicker}</span>
        </div>
        <h1 className="page-head__title">{title}</h1>
        <p className="page-head__lede">{lede}</p>
        <dl className={styles.dates}>
          <div>
            <dt className="label">Last updated</dt>
            <dd>
              <time dateTime={LEGAL_UPDATED.iso}>{LEGAL_UPDATED.label}</time>
            </dd>
          </div>
          <div>
            <dt className="label">Contact</dt>
            <dd>
              <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>
            </dd>
          </div>
        </dl>
      </header>

      <div className={styles.layout}>
        <nav className={styles.toc} aria-labelledby="toc-title">
          <h2 id="toc-title" className="label">
            On this page
          </h2>
          <ol>
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>
                  <span className="mono" aria-hidden="true">
                    {n(i)}
                  </span>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className={styles.article}>
          {summary && (
            <section className={styles.summary} aria-labelledby="summary-title">
              <h2 id="summary-title" className={styles.summaryTitle}>
                Summary
              </h2>
              {summary}
            </section>
          )}
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className={styles.section} aria-labelledby={`${s.id}-title`}>
              <h2 id={`${s.id}-title`} className={styles.sectionTitle}>
                <span className="mono" aria-hidden="true">
                  {n(i)}
                </span>
                {s.title}
              </h2>
              {s.body}
            </section>
          ))}
          <p className={styles.related}>
            {related === "privacy" ? (
              <>
                Please also read our <Link href={LEGAL_LINKS.privacy}>Privacy Policy</Link>, which explains how the Service handles information.
              </>
            ) : (
              <>
                Please also read our <Link href={LEGAL_LINKS.terms}>Terms of Service</Link>, which govern your use of the Service.
              </>
            )}
          </p>
        </article>
      </div>
    </div>
  );
}
