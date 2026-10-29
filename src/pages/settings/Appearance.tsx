import { useState, useEffect, useCallback } from "react";
import {
  Sun, Moon, Monitor, Palette, Eye,
  Keyboard, Info, ChevronLeft, RotateCcw, Tags,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";
import {
  applyAccent, applyTheme, applyStoredAppearance,
  type Theme, type AccentColor,
} from "@/lib/appearanceUtils";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { CategorySettingsPanel } from "@/components/CategorySettingsPanel";
import { useTranslation } from 'react-i18next';

// ─── Lokale Types ─────────────────────────────────────────────────────────────

type ColorBlindMode = "none" | "deuteranopia" | "protanopia" | "tritanopia";

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const STORAGE_KEY_THEME         = "rigflow:theme";
const STORAGE_KEY_FONT_SIZE     = "rigflow:fontSize";
const STORAGE_KEY_HIGH_CONTRAST = "rigflow:highContrast";
const STORAGE_KEY_COLOR_BLIND   = "rigflow:colorBlindMode";
const STORAGE_KEY_ACCENT        = "rigflow:accentColor";
const STORAGE_KEY_SHORTCUTS     = "rigflow:keyboardShortcuts";

// ─── Statische Daten (ohne Labels – kommen aus t()) ──────────────────────────

const THEMES = [
  {
    id: "hell" as Theme,
    icon: <Sun className="w-3.5 h-3.5" />,
    bg: "#f1f5f9", bar1: "#cbd5e1", dot: "#2d9f6e", btn: "#2d9f6e",
  },
  {
    id: "dunkel" as Theme,
    icon: <Moon className="w-3.5 h-3.5" />,
    bg: "#151e2d", bar1: "#2d3f55", dot: "#34d399", btn: "#34d399",
  },
  {
    id: "system" as Theme,
    icon: <Monitor className="w-3.5 h-3.5" />,
    bg: null, bar1: "", dot: "", btn: "",
  },
] as const;

const ACCENT_COLOR_IDS: { id: AccentColor; hex: string }[] = [
  { id: "mint",   hex: "#34d399" },
  { id: "amber",  hex: "#f59e0b" },
  { id: "sky",    hex: "#38bdf8" },
  { id: "violet", hex: "#a78bfa" },
  { id: "rose",   hex: "#fb7185" },
];

const COLOR_BLIND_MODE_IDS: ColorBlindMode[] = [
  "none", "deuteranopia", "protanopia", "tritanopia",
];

// ─── Theme-Mockup ─────────────────────────────────────────────────────────────

function ThemeMockup({ theme }: { theme: (typeof THEMES)[number] }) {
  const border = { border: "1px solid rgba(128,128,128,0.2)" };

  if (theme.id === "system") {
    return (
      <div className="w-full h-[72px] rounded-lg overflow-hidden flex" style={border}>
        <div className="flex-1 flex flex-col gap-1.5 p-2" style={{ background: "#f1f5f9" }}>
          <div className="flex gap-1 items-center">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#2d9f6e" }} />
            <div className="h-1 rounded flex-1" style={{ background: "#cbd5e1" }} />
          </div>
          <div className="h-1 rounded w-3/4" style={{ background: "#cbd5e1" }} />
          <div className="h-1 rounded w-1/2" style={{ background: "#cbd5e1" }} />
          <div className="mt-auto h-3 rounded" style={{ background: "#2d9f6e" }} />
        </div>
        <div className="w-px" style={{ background: "rgba(128,128,128,0.25)" }} />
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
      className="w-full h-[72px] rounded-lg overflow-hidden flex flex-col gap-1.5 p-2"
      style={{ background: theme.bg ?? undefined, ...border }}
    >
      <div className="flex gap-1 items-center">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: theme.dot }} />
        <div className="h-1 rounded flex-1" style={{ background: theme.bar1 }} />
      </div>
      <div className="h-1 rounded w-3/4" style={{ background: theme.bar1 }} />
      <div className="h-1 rounded w-1/2" style={{ background: theme.bar1 }} />
      <div className="mt-auto h-3 rounded" style={{ background: theme.btn }} />
    </div>
  );
}

// ─── Hilfskomponenten ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
      {children}
    </p>
  );
}

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
        <Label htmlFor={id} className="text-sm font-medium text-foreground cursor-pointer">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────────

export default function Appearance() {
  const { t } = useTranslation();
  const { isMobile } = useDeviceDetection();
  const isElectron = navigator.userAgent.includes("RigFlowDesktop");

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
  const [showCategorySettings, setShowCategorySettings] = useState(false);

  // ── Init ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    applyStoredAppearance();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effekte ────────────────────────────────────────────────────────────────

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_THEME, theme);
    applyTheme(theme);
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
    applyAccent(accentColor);
  }, [accentColor]);

  useEffect(() => {
    if (!isMobile) localStorage.setItem(STORAGE_KEY_SHORTCUTS, String(keyboardShortcuts));
    window.dispatchEvent(
      new CustomEvent("rigflow:shortcuts-changed", { detail: { enabled: keyboardShortcuts } })
    );
  }, [keyboardShortcuts, isMobile]);

  // ── Reset ──────────────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setTheme("dunkel");
    setFontSize(16);
    setHighContrast(false);
    setColorBlindMode("none");
    setAccentColor("mint");
    if (!isMobile) setKeyboardShortcuts(true);

    [
      STORAGE_KEY_THEME, STORAGE_KEY_FONT_SIZE, STORAGE_KEY_HIGH_CONTRAST,
      STORAGE_KEY_COLOR_BLIND, STORAGE_KEY_ACCENT, STORAGE_KEY_SHORTCUTS,
    ].forEach((k) => localStorage.removeItem(k));

    const root = document.documentElement;
    root.style.removeProperty("--primary");
    root.style.removeProperty("--ring");
    root.style.removeProperty("--primary-foreground");
    root.style.fontSize = "16px";
    root.classList.remove("high-contrast");
    root.dataset.colorBlind = "none";
    applyTheme("dunkel");
    applyAccent("mint");
  }, [isMobile]);

  // ── Hilfsfunktionen ────────────────────────────────────────────────────────

  const fontSizeLabel = useCallback((v: number): string => {
    if (v <= 13) return t('appearance.font_size.very_small');
    if (v <= 15) return t('appearance.font_size.small');
    if (v <= 17) return t('appearance.font_size.default');
    if (v <= 19) return t('appearance.font_size.large');
    return t('appearance.font_size.very_large');
  }, [t]);

  const currentAccentHex =
    ACCENT_COLOR_IDS.find((c) => c.id === accentColor)?.hex ?? "#34d399";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-5">

        {/* ── FARBSCHEMA ─────────────────────────────────────────────────────── */}
        <div className="glass-card p-5">
          <SectionLabel>{t('appearance.section.color_scheme')}</SectionLabel>

          <div className="grid grid-cols-3 gap-3">
            {THEMES.map((th) => (
              <button
                key={th.id}
                onClick={() => setTheme(th.id)}
                className={cn(
                  "flex flex-col gap-2 p-2.5 rounded-xl border transition-all duration-200 text-left group",
                  theme === th.id
                    ? "border-primary bg-primary/5"
                    : "border-border/50 bg-muted/30 hover:border-border hover:bg-muted/50"
                )}
                style={
                  theme === th.id
                    ? { boxShadow: `0 0 0 1px hsl(var(--primary))` }
                    : undefined
                }
              >
                <ThemeMockup theme={th} />

                <div className="flex items-center justify-center gap-1 px-0.5">
                  <span className={cn(
                    "transition-colors shrink-0",
                    theme === th.id ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}>
                    {th.icon}
                  </span>
                  <span className={cn(
                    "text-[10px] font-medium",
                    theme === th.id ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                  )}>
                    {t(`appearance.theme.${th.id}`)}
                  </span>
                </div>
                {theme === th.id && (
                  <div className="flex justify-center mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-primary"
                      style={{ boxShadow: `0 0 6px ${currentAccentHex}` }} />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── SPRACHE ─────────────────────────────────────────────────────────── */}
        <div className="glass-card p-5">
          <SectionLabel>{t('appearance.section.language')}</SectionLabel>
          <LanguageSwitcher />
        </div>

        {/* ── AKZENTFARBE ────────────────────────────────────────────────────── */}
        <div className="glass-card p-5">
          <SectionLabel>{t('appearance.section.accent_color')}</SectionLabel>

          <div className="flex gap-5 flex-wrap">
            {ACCENT_COLOR_IDS.map((c) => (
              <button
                key={c.id}
                onClick={() => setAccentColor(c.id)}
                title={t(`appearance.accent.${c.id}`)}
                className="flex flex-col items-center gap-1.5"
              >
                <div
                  className={cn(
                    "w-9 h-9 rounded-full transition-all duration-200",
                    accentColor === c.id
                      ? "scale-110"
                      : "opacity-60 hover:opacity-100 hover:scale-105"
                  )}
                  style={{
                    background: c.hex,
                    border: accentColor === c.id
                      ? "2.5px solid rgba(255,255,255,0.85)"
                      : "2.5px solid transparent",
                    boxShadow: accentColor === c.id
                      ? `0 0 14px ${c.hex}90`
                      : undefined,
                  }}
                />
                <span className={cn(
                  "text-[10px] font-medium",
                  accentColor === c.id ? "text-foreground" : "text-muted-foreground"
                )}>
                  {t(`appearance.accent.${c.id}`)}
                </span>
              </button>
            ))}
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            {t('appearance.accent_hint')}
          </p>
        </div>

        {/* ── TEXTGRÖSSE ─────────────────────────────────────────────────────── */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t('appearance.section.font_size')}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{fontSizeLabel(fontSize)}</span>
              <Badge variant="outline" className="text-primary border-primary/30 text-xs font-mono">
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
          <div className="flex justify-between text-muted-foreground/40 select-none mt-2">
            <span className="text-xs">A</span>
            <span className="text-base">A</span>
            <span className="text-xl">A</span>
          </div>

          <div
            className="rounded-xl bg-muted/40 border border-border p-4 mt-4 transition-all duration-150"
            style={{ fontSize: `${fontSize}px` }}
          >
            <p className="font-semibold text-foreground mb-1">{t('appearance.preview.title')}</p>
            <p className="text-muted-foreground leading-relaxed">
              {t('appearance.preview.subtitle')}
            </p>
            <p
              className="text-primary mt-1"
              style={{ fontSize: `${Math.max(fontSize - 2, 10)}px` }}
            >
              {t('appearance.preview.changed')}
            </p>
          </div>
        </div>

        {/* ── BARRIEREFREIHEIT ───────────────────────────────────────────────── */}
        <div className="glass-card p-5 space-y-5">
          <SectionLabel>{t('appearance.section.accessibility')}</SectionLabel>

          <ToggleRow
            id="high-contrast"
            label={t('appearance.high_contrast.label')}
            description={t('appearance.high_contrast.description')}
            checked={highContrast}
            onCheckedChange={setHighContrast}
          />

          <div className="border-t border-border/50 pt-5 space-y-3">
            <div>
              <Label className="text-sm font-medium text-foreground">
                {t('appearance.color_blind.label')}
              </Label>
              <p className="text-xs text-muted-foreground mt-1 mb-3">
                {t('appearance.color_blind.description')}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {COLOR_BLIND_MODE_IDS.map((id) => (
                <button
                  key={id}
                  onClick={() => setColorBlindMode(id)}
                  className={cn(
                    "flex flex-col items-start gap-0.5 p-3 rounded-lg border text-left transition-all duration-150",
                    colorBlindMode === id
                      ? "border-primary/60 bg-primary/5"
                      : "border-border/50 bg-muted/30 hover:border-border hover:bg-muted/50"
                  )}
                >
                  <span className={cn(
                    "text-xs font-medium",
                    colorBlindMode === id ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {t(`appearance.color_blind.modes.${id}.label`)}
                  </span>
                  <span className="text-[10px] text-muted-foreground/70">
                    {t(`appearance.color_blind.modes.${id}.desc`)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── KATEGORIE-EIGENSCHAFTEN ────────────────────────────────────────── */}
        <div className="glass-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Tags className="w-4 h-4 text-primary" />
                <SectionLabel>
                  {t('category_settings.title')}
                </SectionLabel>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {t('category_settings.description')}
              </p>
            </div>
            <Button 
              onClick={() => setShowCategorySettings(true)}
              variant="outline"
              size="sm"
              className="mt-0.5 shrink-0"
            >
              {t('common.edit')}
            </Button>
          </div>
        </div>

        {/* ── TASTATURKÜRZEL ─────────────────────────────────────────────────── */}
        <div className="glass-card p-5">
          <SectionLabel>{t('appearance.section.shortcuts')}</SectionLabel>

          {isMobile ? (
            <div className="rounded-xl bg-muted/40 border border-border p-4 flex gap-3">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {t('appearance.shortcuts.mobile_title')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('appearance.shortcuts.mobile_desc')}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <ToggleRow
                id="keyboard-shortcuts"
                label={t('appearance.shortcuts.toggle_label')}
                description={
                  isElectron
                    ? t('appearance.shortcuts.toggle_desc_electron')
                    : t('appearance.shortcuts.toggle_desc_browser')
                }
                checked={keyboardShortcuts}
                onCheckedChange={setKeyboardShortcuts}
              />

              <div className="flex items-start gap-3 rounded-xl bg-primary/5 border border-primary/20 p-3.5">
                <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-foreground/80">
                    {t('appearance.shortcuts.palette_hint_pre')}{" "}
                    <span className="font-semibold text-foreground">
                      {t('appearance.shortcuts.palette_hint_name')}
                    </span>
                    {t('appearance.shortcuts.palette_hint_post')}
                  </p>
                  <kbd className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted border border-border text-[11px] text-foreground/70 font-mono">
                    {t('appearance.shortcuts.shortcut_key')}
                  </kbd>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── RESET ──────────────────────────────────────────────────────────── */}
        <div className="glass-card p-5" style={{ borderColor: "hsl(var(--warning) / 0.25)" }}>
          <SectionLabel>{t('appearance.section.reset')}</SectionLabel>

          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            {t('appearance.reset.description')}
          </p>
          <ul className="text-xs text-muted-foreground space-y-1 mb-4 pl-3 border-l-2 border-border">
            <li>{t('appearance.reset.item_theme')}</li>
            <li>{t('appearance.reset.item_accent')}</li>
            <li>{t('appearance.reset.item_font')}</li>
            <li>{t('appearance.reset.item_contrast')}</li>
            <li>{t('appearance.reset.item_colorblind')}</li>
            {!isMobile && <li>{t('appearance.reset.item_shortcuts')}</li>}
          </ul>

          <Button
            variant="outline"
            className="w-full gap-2 border-warning/30 text-foreground hover:bg-warning/10 hover:border-warning/50"
            onClick={handleReset}
          >
            <RotateCcw className="h-4 w-4" />
            {t('appearance.reset.button')}
          </Button>
        </div>

      </div>

      {/* ── Category Settings Dialog ── */}
      <CategorySettingsPanel 
        isOpen={showCategorySettings} 
        onClose={() => setShowCategorySettings(false)} 
      />
    </div>
  );
}