const pad = (n: number) => String(n).padStart(2, "0");

/** 3_725_000 → "01:02:05" */
export function formatClock(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000);
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

/** 754_000 → "12:34" (minutes may exceed 59) */
export function formatMinSec(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000);
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

/** Duration in minutes, one decimal under 10 min: "0.4", "7.5", "23". */
export function formatMinutes(ms: number): string {
  const min = Math.max(0, ms) / 60_000;
  return min < 10 ? (Math.round(min * 10) / 10).toFixed(1) : String(Math.round(min));
}

const dateFmt = new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : dateFmt.format(d);
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : `${dateFmt.format(d)}, ${timeFmt.format(d)}`;
}

export function plural(n: number, word: string, pluralWord = `${word}s`): string {
  return `${n} ${n === 1 ? word : pluralWord}`;
}

const SITES: [host: string, name: string][] = [
  ["takeuforward.org", "takeUforward"],
  ["neetcode.io", "NeetCode"],
  ["leetcode.com", "LeetCode"],
  ["geeksforgeeks.org", "GeeksforGeeks"],
  ["spoj.com", "SPOJ"],
  ["codeforces.com", "Codeforces"],
];

/** "https://takeuforward.org/practice/…" → "takeUforward"; unknown hosts give the hostname. */
export function linkSite(url: string): string {
  let host: string;
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "external site";
  }
  return SITES.find(([h]) => host === h || host.endsWith(`.${h}`))?.[1] ?? host;
}
