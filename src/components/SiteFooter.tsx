import Link from "next/link";
import { DRIVE_ENABLED } from "@/lib/drive/config";
import { LEGAL_LINKS, SITE } from "@/lib/site";
import { ExternalIcon } from "./Icons";
import { Logo } from "./SiteHeader";
import styles from "./SiteFooter.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.brand}>
          <Logo />
          <p className={styles.note}>
            Your sets and timings live only in this browser&rsquo;s local storage and are never sent to our servers.
            {DRIVE_ENABLED && <> Google Drive is used only when you save to it or import from it.</>}
          </p>
          <p className={styles.contact}>
            <span className="label">Support</span>
            <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>
          </p>
        </div>
        <nav aria-label="Footer" className={styles.links}>
          <Link href="/create">Create a set</Link>
          <Link href="/sets">Previous sets</Link>
          <a href={SITE.repoUrl} target="_blank" rel="noopener noreferrer">
            GitHub
            <ExternalIcon className={styles.ext} />
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>
        </nav>
        <div className={styles.meta}>
          <p className="label">
            This is an open-source community tool built for educational purposes. The curriculum design, structuring,
            and branding for Striver's and Neetcode's sheet belong entirely to them. We are not affiliated with or
            endorsed by them.
          </p>
          <nav aria-label="Legal" className={styles.legal}>
            <span className="label">
              © {new Date().getFullYear()} {SITE.name}
            </span>
            <Link href={LEGAL_LINKS.privacy}>Privacy Policy</Link>
            <Link href={LEGAL_LINKS.terms}>Terms of Service</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
