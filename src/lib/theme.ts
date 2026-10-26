import { STORAGE_KEYS } from "./storage";

export type Theme = "light" | "dark";

/**
 * Runs inline in <head> before first paint: applies the saved theme, or the OS
 * preference on a first visit, so the wrong theme never flashes.
 */
export const themeInitScript = `(function(){try{var k=${JSON.stringify(STORAGE_KEYS.theme)};var t=null;try{t=localStorage.getItem(k)}catch(e){}if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}var d=document.documentElement;d.dataset.theme=t;d.style.colorScheme=t}catch(e){}})();`;

function apply(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/** Explicit user choice; persisted so it wins over the OS preference from now on. */
export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  } catch {
    /* still apply for this page view */
  }
  // Suppress transitions for the swap so every surface changes in one frame.
  const root = document.documentElement;
  root.classList.add("theme-switching");
  apply(theme);
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => root.classList.remove("theme-switching")));
}

function hasExplicitChoice(): boolean {
  try {
    const t = localStorage.getItem(STORAGE_KEYS.theme);
    return t === "light" || t === "dark";
  } catch {
    return false;
  }
}

/** Subscribe to theme changes: data-theme mutations, other tabs, and OS changes when no choice is saved. */
export function subscribeTheme(callback: () => void): () => void {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onMedia = (e: MediaQueryListEvent) => {
    if (!hasExplicitChoice()) apply(e.matches ? "dark" : "light");
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEYS.theme && (e.newValue === "light" || e.newValue === "dark")) apply(e.newValue);
  };
  media.addEventListener("change", onMedia);
  window.addEventListener("storage", onStorage);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", onMedia);
    window.removeEventListener("storage", onStorage);
  };
}
