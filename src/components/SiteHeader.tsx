"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import logoSvg from "@/app/graph-icon.svg?raw";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./SiteHeader.module.css";

const NAV = [
  { href: "/create", label: "Create", long: "Create set" },
  { href: "/sets", label: "My sets", long: "My sets" },
];

export function Logo() {
  return (
    <span className={styles.logo}>
      {/* Inlined (not <img>) so the mark follows the site theme, not the OS one. */}
      <span
        className={styles.mark}
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: logoSvg }}
      />
      <span className={styles.word}>
        Solve<span className={styles.slash}>/</span>Problemset
      </span>
    </span>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link
          href="/"
          className={styles.home}
          aria-label="Solve Problemset — home"
        >
          <Logo />
        </Link>
        <nav aria-label="Main" className={styles.nav}>
          {NAV.map((item) => {
            const active =
              pathname === item.href ||
              (item.href === "/sets" && pathname.startsWith("/sets/"));
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
