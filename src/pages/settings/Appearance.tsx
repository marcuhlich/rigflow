import { useState, useEffect, useCallback } from "react";
import { Sun, Moon, Monitor, Type, Palette, Eye, Keyboard, Info, ChevronLeft, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";

// ─── Types ────────────────────────────────────────────────────────────────────

type Theme = "hell" | "dunkel" | "system";
type ColorBlindMode = "none" | "deuteranopia" | "protanopia" | "tritanopia";
type AccentColor = "mint" | "amber" | "sky" | "violet" | "rose";

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY_THEME       = "rigflow:theme";
const STORAGE_KEY_FONT_SIZE   = "rigflow:fontSize";
const STORAGE_KEY_HIGH_CONTRAST = "rigflow:highContrast";
const STORAGE_KEY_COLOR_BLIND = "rigflow:colorBlindMode";
const STORAGE_KEY_ACCENT      = "rigflow:accentColor";
const STORAGE_KEY_SHORTCUTS   = "rigflow:keyboardShortcuts";

const THEMES = [
  {
    id: "hell"    as Theme,
    label: "Hell",
    icon: <Sun  className="w-3.5 h-3.5" />,
    bg: "#f1f5f9", card: "#ffffff", bar1: "#cbd5e1", bar2: "#34d399", btn: "#34d399",
  },
  {
    id: "dunkel"  as Theme,
    label: "Dunkel",
    icon: <Moon className="w-3.5 h-3.5" />,
    bg: "#151e2d", card: "#1a2535", bar1: "#2d3f55", bar2: "#34d399", btn: "#34d399",
  },
  {
    id: "system"  as Theme,
    label: "Systemstandard",
    icon: <Monitor className="w-3.5 h-3.5" />,
    bg: null, card: "#1a2535", bar1: "#2d3f55", bar2: "#34d399", btn: "#34d399",
  },
] as const;

const ACCENT_COLORS: { id: AccentColor; label: string; value: string }[] = [
  { id: "mint",   label: "Mint",    value: "#34d399" },
  { id: "amber",  label: "Amber",   value: "#f59e0b" },
  { id: "sky",    label: "Sky",     value: "#38bdf8" },
  { id: "violet", label: "Violett", value: "#a78bfa" },
  { id: "rose",   label: "Rose",    value: "#fb7185" },
];

const COLOR_BLIND_MODES: { id: ColorBlindMode; label: string; desc: string }[] = [
  { id: "none",         label: "Keine",        desc: "Standard-Farbdarstellung" },
  { id: "deuteranopia", label: "Deuteranopie", desc: "Rot-Grün-Schwäche (häufigste Form)" },
  { id: "protanopia",   label: "Protanopie",   desc: "Rot-Blindheit" },
  { id: "tritanopia",   label: "Tritanopie",   desc: "Blau-Gelb-Schwäche" },
];

// ─── Mini-Mockup ──────────────────────────────────────────────────────────────

function ThemeMockup({ theme }: { theme: (typeof THEMES)[number] }) {
  if (theme.id === "system") {
    return (
      <div className="w-full h-[72px] rounded-lg overflow-hidden border border-white/10 flex">
        {/* Helle Hälfte */}
        <div className="flex-1 flex flex-col gap-1.5 p-2" style={{ background: "#f1f5f9" }}>
          <div className="flex gap-1 items-center">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#34d399" }} />
            <div className="h-1 rounded flex-1" style={{ background: "#cbd5e1" }} />
          </div>
          <div className="h-1 rounded w-3/4" style={{ background: "#cbd5e1" }} />
          <div className="h-1 rounded w-1/2" style={{ background: "#cbd5e1" }} />
          <div className="mt-auto h-3 rounded" style={{ background: "#34d399" }} />
        </div>

        {/* Trennlinie */}
        <div className="w-px" style={{ background: "rgba(255,255,255,0.15)" }} />

        {/* Dunkle Hälfte */}
        <div className="flex-1 flex flex-col gap-1.5 p-2" style={{ background: "#151e2d" }}>
          <div className="flex gap-1 items-center">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#34d399" }} />
            <div className="h-1 rounded flex-1" style={{ background: "#2d3f55" }} />
          </div>
          <div className="h-1 rounded w-3/4" style={{ background: "#2d3f55" }} />
          <div className="h-1 rounded w-1/2" style={{ background: "#2d3f55" }} />
          <div className="mt-auto h-3 rounded" style={{ background: "#34d399" }} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full h-[72px] rounded-lg overflow-hidden border border-white/10 flex flex-col gap-1.5 p-2"
      style={{ background: theme.bg }}
    >
      {/* Fake-Topbar */}
      <div className="flex gap-1 items-center">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: theme.bar2 }} />
        <div className="h-1 rounded flex-1" style={{ background: theme.bar1 }} />
      </div>
      {/* Fake-Content */}
      <div className="h-1 rounded w-3/4" style={{ background: theme.bar1 }} />
      <div className="h-1 rounded w-1/2" style={{ background: theme.bar1 }} />
      {/* Fake-Button */}
      <div className="mt-auto h-3 rounded" style={{ background: theme.btn }} />
    </div>
  );
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────────

export default function Appearance() {
  const { isMobile } = useDeviceDetection();

  // Electron-Erkennung über den Custom-UA (RigFlowDesktop/1.0)
  const isElectron = navigator.userAgent.includes("RigFlowDesktop");
  const isDesktopContext = !isMobile; // Browser-Desktop oder Electron

  // ── State ──────────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(STORAGE_KEY_THEME) as Theme) ?? "dunkel"
  );
  const [fontSize, setFontSize] = useState<number>(
    () => Number(localStorage.getItem(STORAGE_KEY_FONT_SIZE)) || 16
  );
  const [highContrast, setHighContrast] = useState(
    () => localStorage.getItem(STORAGE_KEY_HIGH_CONTRAST) === "true"
  );
  const [colorBlindMode, setColorBlindMode] = useState<ColorBlindMode>(
    () => (localStorage.getItem(STORAGE_KEY_COLOR_BLIND) as ColorBlindMode) ?? "none"
  );
  const [accentColor, setAccentColor] = useState<AccentColor>(
    () => (localStorage.getItem(STORAGE_KEY_ACCENT) as AccentColor) ?? "mint"
  );
  const [keyboardShortcuts, setKeyboardShortcuts] = useState<boolean>(() => {
    if (isMobile) return false;
    return localStorage.getItem(STORAGE_KEY_SHORTCUTS) !== "false";
  });

  // ── Effekte / Echtzeit-Anwendung ───────────────────────────────────────────

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_THEME, theme);
    const root = document.documentElement;
    if (theme === "dunkel") {
      root.classList.add("dark");
    } else if (theme === "hell") {
      root.classList.remove("dark");
    } else {
      root.classList.toggle("dark", window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_FONT_SIZE, String(fontSize));
    document.documentElement.style.fontSize = `${fontSize}px`;
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_HIGH_CONTRAST, String(highContrast));
    document.documentElement.classList.toggle("high-contrast", highContrast);
  }, [highContrast]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_COLOR_BLIND, colorBlindMode);
    document.documentElement.dataset.colorBlind = colorBlindMode;
  }, [colorBlindMode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ACCENT, accentColor);
    
    // Remove all accent classes
    ACCENT_COLORS.forEach((c) => {
      document.documentElement.classList.remove(`accent-${c.id}`);
    });
    
    // Add new accent class (CSS variables handled by CSS @layer)
    document.documentElement.classList.add(`accent-${accentColor}`);
  }, [accentColor]);

  useEffect(() => {
    if (!isMobile) localStorage.setItem(STORAGE_KEY_SHORTCUTS, String(keyboardShortcuts));
    window.dispatchEvent(
      new CustomEvent("rigflow:shortcuts-changed", { detail: { enabled: keyboardShortcuts } })
    );
  }, [keyboardShortcuts, isMobile]);

  // ── Init: Apply all saved settings on component mount ────────────────────
  useEffect(() => {
    const root = document.documentElement;

    // Apply theme
    if (theme === "dunkel") {
      root.classList.add("dark");
    } else if (theme === "hell") {
      root.classList.remove("dark");
    }

    // Apply font size
    root.style.fontSize = `${fontSize}px`;

    // Apply high contrast
    root.classList.toggle("high-contrast", highContrast);

    // Apply colorblind mode
    root.dataset.colorBlind = colorBlindMode;

    // Apply accent color
    ACCENT_COLORS.forEach((c) => {
      root.classList.remove(`accent-${c.id}`);
    });
    root.classList.add(`accent-${accentColor}`);
  }, []); // Only on mount

  const fontSizeLabel = useCallback((v: number) => {
    if (v <= 13) return "Sehr klein";
    if (v <= 15) return "Klein";
    if (v <= 17) return "Standard";
    if (v <= 19) return "Groß";
    return "Sehr groß";
  }, []);

  const handleReset = () => {
    // Alle Einstellungen auf Standard zurücksetzen
    setTheme("dunkel");
    setFontSize(16);
    setHighContrast(false);
    setColorBlindMode("none");
    setAccentColor("mint");
    setKeyboardShortcuts(true);

    // LocalStorage löschen
    localStorage.removeItem(STORAGE_KEY_THEME);
    localStorage.removeItem(STORAGE_KEY_FONT_SIZE);
    localStorage.removeItem(STORAGE_KEY_HIGH_CONTRAST);
    localStorage.removeItem(STORAGE_KEY_COLOR_BLIND);
    localStorage.removeItem(STORAGE_KEY_ACCENT);
    localStorage.removeItem(STORAGE_KEY_SHORTCUTS);

    // DOM aktualisieren
    const root = document.documentElement;
    root.classList.add("dark");
    root.style.fontSize = "16px";
    root.classList.remove("high-contrast");
    root.dataset.colorBlind = "none";
    
    // Remove all accent classes
    ACCENT_COLORS.forEach((c) => {
      root.classList.remove(`accent-${c.id}`);
    });
    
    // Add default accent class
    root.classList.add("accent-mint");
    root.style.setProperty("--color-accent", "#34d399");
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-md bg-background/70 border-b border-border/40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link
            to="/settings"
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="text-sm">Einstellungen</span>
          </Link>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-sm font-medium">Erscheinungsbild</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-5">

        {/* ── THEME CARD ─────────────────────────────────────────────────────── */}
        <div className="glass-card p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Farbschema
          </p>

          <div className="grid grid-cols-3 gap-3">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={cn(
                  "flex flex-col gap-2 p-2.5 rounded-xl border transition-all duration-200 text-left group",
                  theme === t.id
                    ? "border-primary bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary))]"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                )}
              >
                <ThemeMockup theme={t} />

                <div className="flex items-center gap-1.5 px-0.5">
                  <span className={cn(
                    "transition-colors",
                    theme === t.id ? "text-primary" : "text-slate-500 group-hover:text-slate-300"
                  )}>
                    {t.icon}
                  </span>
                  <span className={cn(
                    "text-xs font-medium truncate",
                    theme === t.id ? "text-white" : "text-slate-400 group-hover:text-slate-300"
                  )}>
                    {t.label}
                  </span>
                  {theme === t.id && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-[#34d399] shadow-[0_0_6px_#34d399] shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── AKZENTFARBE CARD ───────────────────────────────────────────────── */}
        <div className="glass-card p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Akzentfarbe
          </p>

          <div className="flex gap-4 flex-wrap">
            {ACCENT_COLORS.map((c) => (
              <button
                key={c.id}
                onClick={() => setAccentColor(c.id)}
                title={c.label}
                className="flex flex-col items-center gap-1.5 group"
              >
                <div
                  className={cn(
                    "w-9 h-9 rounded-full border-2 transition-all duration-200",
                    accentColor === c.id
                      ? "scale-110 border-white"
                      : "border-transparent opacity-60 hover:opacity-100 hover:scale-105"
                  )}
                  style={{ background: c.value, boxShadow: accentColor === c.id ? `0 0 12px ${c.value}` : undefined }}
                />
                <span className={cn("text-[10px]", accentColor === c.id ? "text-white" : "text-slate-500")}>
                  {c.label}
                </span>
              </button>
            ))}
          </div>

          <p className="text-xs text-slate-500 mt-4">
            Die gewählte Akzentfarbe wird für Buttons, Badges und Highlights verwendet.
          </p>
        </div>

        {/* ── TEXTGRÖSSE CARD ────────────────────────────────────────────────── */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Textgröße
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{fontSizeLabel(fontSize)}</span>
              <Badge variant="outline" className="text-[#34d399] border-[#34d399]/30 text-xs font-mono">
                {fontSize}px
              </Badge>
            </div>
          </div>

          <Slider
            min={12} max={22} step={1}
            value={[fontSize]}
            onValueChange={([v]) => setFontSize(v)}
            className="w-full"
          />
          <div className="flex justify-between text-slate-600 select-none leading-none mt-2">
            <span className="text-xs">A</span>
            <span className="text-base">A</span>
            <span className="text-xl">A</span>
          </div>

          {/* Live-Vorschau */}
          <div
            className="rounded-xl bg-[#1a2535] border border-white/10 p-4 transition-all duration-150 mt-4"
            style={{ fontSize: `${fontSize}px` }}
          >
            <p className="font-semibold text-white mb-1">Vorschau — RigFlow Inventar</p>
            <p className="text-slate-400 leading-relaxed">
              Scheinwerfer Moving Head · 12× verfügbar · Lager A-3
            </p>
            <p className="text-[#34d399] mt-1" style={{ fontSize: `${Math.max(fontSize - 2, 10)}px` }}>
              Zuletzt geändert: heute, 09:41 Uhr
            </p>
          </div>
        </div>

        {/* ── BARRIEREFREIHEIT CARD ──────────────────────────────────────────── */}
        <div className="glass-card p-5 space-y-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Barrierefreiheit
          </p>

          <ToggleRow
            id="high-contrast"
            label="Hoher Kontrast"
            description="Verstärkt Farbkontraste für bessere Lesbarkeit bei Sehbeeinträchtigungen."
            checked={highContrast}
            onCheckedChange={setHighContrast}
          />

          <div className="border-t border-border/30 pt-4">
            <div>
              <Label className="text-sm font-medium text-white">Farbenblindheits-Modus</Label>
              <p className="text-xs text-slate-400 mt-1 mb-3">
                Passt die Farbpalette an verschiedene Formen der Farbenblindheit an.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {COLOR_BLIND_MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setColorBlindMode(m.id)}
                  className={cn(
                    "flex flex-col items-start gap-0.5 p-3 rounded-lg border text-left transition-all duration-150",
                    colorBlindMode === m.id
                      ? "border-[#34d399]/60 bg-[#34d399]/5 text-white"
                      : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20"
                  )}
                >
                  <span className="text-xs font-medium">{m.label}</span>
                  <span className="text-[10px] opacity-70">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── TASTATURKÜRZEL CARD ────────────────────────────────────────────── */}
        <div className="glass-card p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Tastaturkürzel
          </p>

          {isMobile ? (
            <div className="rounded-xl bg-[#1a2535] border border-white/10 p-4 flex gap-3">
              <Info className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm text-slate-300 font-medium">Auf Mobilgeräten deaktiviert</p>
                <p className="text-xs text-slate-500">
                  Tastaturkürzel sind auf dem Handy automatisch ausgeschaltet, um versehentliche Eingaben zu vermeiden.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <ToggleRow
                id="keyboard-shortcuts"
                label="Tastaturkürzel aktivieren"
                description={
                  isElectron
                    ? "Globale Shortcuts für RigFlow Desktop. Deaktiviere sie bei Konflikten mit anderen Programmen."
                    : "Shortcuts im Browser. Deaktiviere sie, wenn es Konflikte mit Browser-Shortcuts gibt."
                }
                checked={keyboardShortcuts}
                onCheckedChange={setKeyboardShortcuts}
              />

              <div className="flex items-start gap-3 rounded-xl bg-[#34d399]/5 border border-[#34d399]/15 p-3.5">
                <Info className="w-4 h-4 text-[#34d399] mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-slate-300">
                    Alle verfügbaren Shortcuts findest du in der{" "}
                    <span className="font-semibold text-white">Command Palette</span>.
                  </p>
                  <kbd className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1a2535] border border-white/15 text-[11px] text-slate-300 font-mono">
                    Strg <span className="opacity-40">+</span> K
                  </kbd>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── RESET CARD ────────────────────────────────────────────────────── */}
        <div className="glass-card p-5 border-amber-500/20 bg-amber-500/5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Alle Einstellungen zurücksetzen
          </p>

          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Setzt alle Einstellungen dieser Seite auf die Standardwerte zurück:
          </p>

          <ul className="text-xs text-slate-400 space-y-1 mb-4 pl-4">
            <li>• Farbschema: Dunkel</li>
            <li>• Akzentfarbe: Mint</li>
            <li>• Schriftgröße: 16px (Standard)</li>
            <li>• Hoher Kontrast: Aus</li>
            <li>• Farbenblindheits-Modus: Keine</li>
            <li>• Tastaturkürzel: An</li>
          </ul>

          <Button
            variant="outline"
            className="w-full gap-2 border-amber-500/30 hover:bg-amber-500/10"
            onClick={handleReset}
          >
            <RotateCcw className="h-4 w-4" />
            Auf Standard zurücksetzen
          </Button>
        </div>

      </div>
    </div>
  );
}

// ─── Hilfskomponenten ─────────────────────────────────────────────────────────

function ToggleRow({
  id, label, description, checked, onCheckedChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-0.5 flex-1">
        <Label htmlFor={id} className="text-sm font-medium text-white cursor-pointer">
          {label}
        </Label>
        <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}