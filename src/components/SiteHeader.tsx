"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./SiteHeader.module.css";

const NAV = [
  { href: "/create", label: "Create", long: "Create set" },
  { href: "/sets", label: "My sets", long: "My sets" },
];

export function Logo() {
  return (
    <span className={styles.logo}>
      <svg className={styles.mark} viewBox="0 0 28 28" aria-hidden="true">
        <rect x="1" y="1" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M14 1v26M1 14h26" stroke="currentColor" strokeWidth="0.75" opacity="0.45" />
        <circle cx="14" cy="14" r="5.5" fill="none" stroke="var(--accent)" strokeWidth="1.5" />
        <path d="M14 8.5v11M8.5 14h11" stroke="var(--accent)" strokeWidth="1.5" />
      </svg>
      <span className={styles.word}>
        Blueprint<span className={styles.slash}>/</span>DSA
      </span>
    </span>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.home} aria-label="Blueprint DSA — home">
          <Logo />
        </Link>
        <nav aria-label="Main" className={styles.nav}>
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href === "/sets" && pathname.startsWith("/sets/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={styles.link}
                aria-current={active ? "page" : undefined}
              >
                <span className={styles.short}>{item.label}</span>
                <span className={styles.long}>{item.long}</span>
              </Link>
            );
          })}
          <span className={styles.divider} aria-hidden="true" />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
