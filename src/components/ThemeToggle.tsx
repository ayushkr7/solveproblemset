"use client";

import { useSyncExternalStore } from "react";
import { getTheme, setTheme, subscribeTheme, type Theme } from "@/lib/theme";
import { MoonIcon, SunIcon } from "./Icons";

export function ThemeToggle() {
  // Server snapshot is null: the real theme is only known after the inline
  // script has run, so the icon renders once hydrated (no mismatch, no flash).
  const theme = useSyncExternalStore<Theme | null>(subscribeTheme, getTheme, () => null);
  const next: Theme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className="btn btn--icon theme-toggle"
      onClick={() => setTheme(next)}
      aria-label={theme ? `Switch to ${next} theme` : "Toggle theme"}
      title={theme ? `Switch to ${next} theme` : undefined}
    >
      {theme === "dark" ? <SunIcon /> : theme === "light" ? <MoonIcon /> : <span className="theme-toggle__blank" />}
    </button>
  );
}
