import Link from "next/link";
import { Logo } from "./SiteHeader";
import styles from "./SiteFooter.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.brand}>
          <Logo />
          <p className={styles.note}>
            Your sets and timings live only in this browser&rsquo;s local storage. Nothing is uploaded.
          </p>
        </div>
        <nav aria-label="Footer" className={styles.links}>
          <Link href="/create">Create a set</Link>
          <Link href="/sets">Previous sets</Link>
        </nav>
        <p className={`label ${styles.meta}`}>
          Problems sourced from Striver&rsquo;s sheets (takeUforward), NeetCode&rsquo;s Blind 75, LeetCode and Codeforces · Not affiliated
        </p>
      </div>
    </footer>
  );
}
