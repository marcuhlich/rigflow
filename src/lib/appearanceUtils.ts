// ─── Appearance Utilities — werden von App.tsx (IIFE) und Appearance.tsx genutzt ───

export type AccentColor = "mint" | "amber" | "sky" | "violet" | "rose";
export type Theme = "hell" | "dunkel" | "system";

export const ALL_ACCENTS: AccentColor[] = ["amber", "mint", "sky", "violet", "rose"];
export const DEFAULT_ACCENT: AccentColor = "amber";

// Die konkreten Farbwerte je Theme stehen in index.css (.accent-*).
// Dadurch stimmen sie automatisch nach jedem Theme-Wechsel.
export function applyAccent(accent: AccentColor) {
  const root = document.documentElement;
  ALL_ACCENTS.forEach((c) => root.classList.remove(`accent-${c}`));
  root.classList.add(`accent-${accent}`);
  // Altlast: früher als Inline-Style gesetzt
  root.style.removeProperty("--primary");
  root.style.removeProperty("--ring");
  root.style.removeProperty("--primary-foreground");
}

const systemDark = () => window.matchMedia("(prefers-color-scheme: dark)");

function onSystemThemeChange(e: MediaQueryListEvent) {
  if (localStorage.getItem("rigflow:theme") === "system") {
    document.documentElement.classList.toggle("dark", e.matches);
  }
}

let systemListenerAttached = false;

export function applyTheme(theme: Theme) {
  const root = document.documentElement;

  if (theme === "dunkel") {
    root.classList.add("dark");
  } else if (theme === "hell") {
    root.classList.remove("dark");
  } else {
    root.classList.toggle("dark", systemDark().matches);
  }

  if (!systemListenerAttached) {
    systemDark().addEventListener("change", onSystemThemeChange);
    systemListenerAttached = true;
  }
}

export function getStoredAccent(): AccentColor {
  const stored = localStorage.getItem("rigflow:accentColor") as AccentColor | null;
  return stored && ALL_ACCENTS.includes(stored) ? stored : DEFAULT_ACCENT;
}

/**
 * Liest alle gespeicherten Appearance-Einstellungen und wendet sie an.
 * Für den IIFE in App.tsx und für den Mount-Effect in Appearance.tsx.
 */
export function applyStoredAppearance() {
  const root = document.documentElement;
  const get = (k: string) => localStorage.getItem(k);

  // Theme (muss vor Accent laufen, damit isDark-Check korrekt ist)
  applyTheme((get("rigflow:theme") as Theme) ?? "system");
  applyAccent(getStoredAccent());

  // Schriftgröße
  const fontSize = get("rigflow:fontSize");
  if (fontSize) root.style.fontSize = `${fontSize}px`;

  // Hoher Kontrast
  root.classList.toggle("high-contrast", get("rigflow:highContrast") === "true");

  // Farbenblindheits-Modus
  root.dataset.colorBlind = get("rigflow:colorBlindMode") ?? "none";
}