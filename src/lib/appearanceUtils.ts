// ─── Appearance Utilities — werden von App.tsx (IIFE) und Appearance.tsx genutzt ───

export type AccentColor = "mint" | "amber" | "sky" | "violet" | "rose";
export type Theme = "hell" | "dunkel" | "system";

// CSS HSL-Werte für --primary und --ring je nach Theme-Modus
const ACCENT_VALUES: Record<AccentColor, { dark: string; light: string }> = {
  mint:   { dark: "162 84% 54%", light: "162 72% 30%" },
  amber:  { dark: "38 92% 50%",  light: "38 85% 38%"  },
  sky:    { dark: "197 100% 48%", light: "202 90% 38%" },
  violet: { dark: "280 74% 67%", light: "280 72% 42%" },
  rose:   { dark: "0 100% 71%",  light: "0 72% 45%"   },
};

// --primary-foreground: in dark mode dunkler Text, in light mode weiß
const ACCENT_FG: Record<AccentColor, { dark: string; light: string }> = {
  mint:   { dark: "215 28% 10%", light: "0 0% 100%" },
  amber:  { dark: "215 28% 10%", light: "0 0% 100%" },
  sky:    { dark: "215 28% 10%", light: "0 0% 100%" },
  violet: { dark: "215 28% 10%", light: "0 0% 100%" },
  rose:   { dark: "215 28% 10%", light: "0 0% 100%" },
};

export const ALL_ACCENTS: AccentColor[] = ["mint", "amber", "sky", "violet", "rose"];

/**
 * Setzt die Akzentfarbe auf <html>:
 * - fügt accent-* Klasse hinzu (für eventuelle CSS-only Regeln)
 * - setzt --primary und --ring direkt als Inline-Style → schlägt jede Stylesheet-Regel
 */
export function applyAccent(accent: AccentColor) {
  const root = document.documentElement;
  const isDark = root.classList.contains("dark");
  const values = ACCENT_VALUES[accent];
  const fg = ACCENT_FG[accent];
  const hsl = isDark ? values.dark : values.light;
  const fgHsl = isDark ? fg.dark : fg.light;

  // Klasse aktualisieren
  ALL_ACCENTS.forEach((c) => root.classList.remove(`accent-${c}`));
  root.classList.add(`accent-${accent}`);

  // Inline CSS-Variablen setzen — höchste Spezifität, kein Cascade-Problem
  root.style.setProperty("--primary", hsl);
  root.style.setProperty("--ring", hsl);
  root.style.setProperty("--primary-foreground", fgHsl);
}

/**
 * Setzt das Theme und wendet danach sofort den aktuellen Accent neu an,
 * damit die richtigen dark/light Helligkeitswerte gelten.
 */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;

  if (theme === "dunkel") {
    root.classList.add("dark");
  } else if (theme === "hell") {
    root.classList.remove("dark");
  } else {
    // System: sofort anwenden
    root.classList.toggle("dark", window.matchMedia("(prefers-color-scheme: dark)").matches);

    // Und auf spätere Systemänderungen reagieren
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      if (localStorage.getItem("rigflow:theme") === "system") {
        root.classList.toggle("dark", e.matches);
        const storedAccent = (localStorage.getItem("rigflow:accentColor") as AccentColor) ?? "mint";
        applyAccent(storedAccent);
      }
    };
    // Alten Listener entfernen bevor neuer gesetzt wird
    mq.removeEventListener("change", handler);
    mq.addEventListener("change", handler);
  }

  const storedAccent = (localStorage.getItem("rigflow:accentColor") as AccentColor) ?? "mint";
  applyAccent(storedAccent);
}

/**
 * Liest alle gespeicherten Appearance-Einstellungen und wendet sie an.
 * Für den IIFE in App.tsx und für den Mount-Effect in Appearance.tsx.
 */
export function applyStoredAppearance() {
  const root = document.documentElement;
  const get = (k: string) => localStorage.getItem(k);

  // Theme (muss vor Accent laufen, damit isDark-Check korrekt ist)
  const theme = (get("rigflow:theme") as Theme) ?? "dunkel";
  if (theme === "dunkel") {
    root.classList.add("dark");
  } else if (theme === "hell") {
    root.classList.remove("dark");
  } else {
    root.classList.toggle("dark", window.matchMedia("(prefers-color-scheme: dark)").matches);
  }

  // Akzentfarbe — nach Theme, damit isDark stimmt
  const accent = (get("rigflow:accentColor") as AccentColor) ?? "mint";
  applyAccent(accent);

  // Schriftgröße
  const fontSize = get("rigflow:fontSize");
  if (fontSize) root.style.fontSize = `${fontSize}px`;

  // Hoher Kontrast
  root.classList.toggle("high-contrast", get("rigflow:highContrast") === "true");

  // Farbenblindheits-Modus
  root.dataset.colorBlind = get("rigflow:colorBlindMode") ?? "none";
}