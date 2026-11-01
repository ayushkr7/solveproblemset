"use client";

import { useSyncExternalStore } from "react";
import { getTheme, setTheme, subscribeTheme, type Theme } from "@/lib/theme";
import { MoonIcon, SunIcon } from "./Icons";
import { Button } from "./ui/button";

export function ThemeToggle() {
  // Server snapshot is null: the real theme is only known after the inline
  // script has run, so the icon renders once hydrated (no mismatch, no flash).
  const theme = useSyncExternalStore<Theme | null>(subscribeTheme, getTheme, () => null);
  const next: Theme = theme === "dark" ? "light" : "dark";

  return (
    <Button
      size="icon"
      className="theme-toggle"
      onClick={() => setTheme(next)}
      aria-label={theme ? `Switch to ${next} theme` : "Toggle theme"}
      title={theme ? `Switch to ${next} theme` : undefined}
    >
      {theme === "dark" ? <SunIcon /> : theme === "light" ? <MoonIcon /> : <span className="theme-toggle__blank" />}
    </Button>
  );
}
