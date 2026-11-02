/**
 * Site identity, used by the legal pages, the footer and page metadata. Keep
 * these in step with the Google Cloud OAuth consent screen (app name, support
 * email, homepage, privacy policy and terms URLs).
 */
export const SITE = {
  name: "Solve Problemset",
  url: "https://solveproblemset.com",
  /** Runs the site; named in the Privacy Policy and Terms. */
  operator: "Ayush Kumar",
  /** Public contact for privacy, legal and support requests. */
  contactEmail: "support@solveproblemset.com",
  /** Public source repository, linked from the footer. */
  repoUrl: "https://github.com/ayushkr7/solveproblemset",
} as const;

/** When the Privacy Policy and Terms last changed. Update it with every edit to them. */
export const LEGAL_UPDATED = { iso: "2026-11-02", label: "2 November 2026" } as const;

export const LEGAL_LINKS = {
  privacy: "/privacy",
  terms: "/terms",
} as const;
