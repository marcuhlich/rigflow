import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RotateCcw } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { CategorySettingsPanel } from "@/components/CategorySettingsPanel";
import { SettingsPage, SettingsRow, SettingsSection } from "@/components/settings/SettingsSection";
import { SegmentedControl } from "@/components/settings/SegmentedControl";
import { ThemePicker } from "@/components/settings/appearance/ThemePicker";
import { AccentPicker } from "@/components/settings/appearance/AccentPicker";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";
import { changeLanguage } from "@/i18n";
import {
  DEFAULT_ACCENT,
  applyAccent,
  applyTheme,
  getStoredAccent,
  type AccentColor,
  type Theme,
} from "@/lib/appearanceUtils";

type ColorBlindMode = "none" | "deuteranopia" | "protanopia" | "tritanopia";
type Language = "de" | "en";

const KEY_THEME = "rigflow:theme";
const KEY_FONT_SIZE = "rigflow:fontSize";
const KEY_HIGH_CONTRAST = "rigflow:highContrast";
const KEY_COLOR_BLIND = "rigflow:colorBlindMode";
const KEY_ACCENT = "rigflow:accentColor";
const KEY_SHORTCUTS = "rigflow:keyboardShortcuts";

const THEMES: Theme[] = ["hell", "dunkel", "system"];
const DEFAULT_THEME: Theme = "system";
const DEFAULT_FONT_SIZE = 16;
const COLOR_BLIND_MODES: ColorBlindMode[] = ["none", "deuteranopia", "protanopia", "tritanopia"];

function readTheme(): Theme {
  const v = localStorage.getItem(KEY_THEME) as Theme | null;
  return v && THEMES.includes(v) ? v : DEFAULT_THEME;
}

function readColorBlind(): ColorBlindMode {
  const v = localStorage.getItem(KEY_COLOR_BLIND) as ColorBlindMode | null;
  return v && COLOR_BLIND_MODES.includes(v) ? v : "none";
}

function readFontSize(): number {
  const n = Number(localStorage.getItem(KEY_FONT_SIZE));
  return Number.isFinite(n) && n >= 12 && n <= 22 ? n : DEFAULT_FONT_SIZE;
}

function emitShortcuts(enabled: boolean) {
  window.dispatchEvent(new CustomEvent("rigflow:shortcuts-changed", { detail: { enabled } }));
}

export default function Appearance() {
  const { t, i18n } = useTranslation();
  const { isMobile } = useDeviceDetection();
  const isElectron = navigator.userAgent.includes("RigFlowDesktop");

  const [theme, setThemeState] = useState<Theme>(readTheme);
  const [accent, setAccentState] = useState<AccentColor>(getStoredAccent);
  const [fontSize, setFontSizeState] = useState<number>(readFontSize);
  const [highContrast, setHighContrastState] = useState(() => localStorage.getItem(KEY_HIGH_CONTRAST) === "true");
  const [colorBlind, setColorBlindState] = useState<ColorBlindMode>(readColorBlind);
  const [shortcuts, setShortcutsState] = useState(() => localStorage.getItem(KEY_SHORTCUTS) !== "false");
  const [showCategorySettings, setShowCategorySettings] = useState(false);

  const language: Language = i18n.language?.startsWith("de") ? "de" : "en";

  // Each setter persists and applies immediately — no effects, so nothing is written on mount.
  const setTheme = (v: Theme) => {
    setThemeState(v);
    localStorage.setItem(KEY_THEME, v);
    applyTheme(v);
  };
  const setAccent = (v: AccentColor) => {
    setAccentState(v);
    localStorage.setItem(KEY_ACCENT, v);
    applyAccent(v);
  };
  const setFontSize = (v: number) => {
    setFontSizeState(v);
    localStorage.setItem(KEY_FONT_SIZE, String(v));
    document.documentElement.style.fontSize = `${v}px`;
  };
  const setHighContrast = (v: boolean) => {
    setHighContrastState(v);
    localStorage.setItem(KEY_HIGH_CONTRAST, String(v));
    document.documentElement.classList.toggle("high-contrast", v);
  };
  const setColorBlind = (v: ColorBlindMode) => {
    setColorBlindState(v);
    localStorage.setItem(KEY_COLOR_BLIND, v);
    document.documentElement.dataset.colorBlind = v;
  };
  const setShortcuts = (v: boolean) => {
    setShortcutsState(v);
    localStorage.setItem(KEY_SHORTCUTS, String(v));
    emitShortcuts(v);
  };

  const handleReset = () => {
    [KEY_THEME, KEY_FONT_SIZE, KEY_HIGH_CONTRAST, KEY_COLOR_BLIND, KEY_ACCENT, KEY_SHORTCUTS].forEach((k) =>
      localStorage.removeItem(k)
    );
    setThemeState(DEFAULT_THEME);
    setAccentState(DEFAULT_ACCENT);
    setFontSizeState(DEFAULT_FONT_SIZE);
    setHighContrastState(false);
    setColorBlindState("none");
    setShortcutsState(true);

    const root = document.documentElement;
    root.style.fontSize = "";
    root.classList.remove("high-contrast");
    root.dataset.colorBlind = "none";
    applyTheme(DEFAULT_THEME);
    applyAccent(DEFAULT_ACCENT);
    emitShortcuts(true);
  };

  const fontSizeLabel = (v: number): string => {
    if (v <= 13) return t("appearance.font_size.very_small");
    if (v <= 15) return t("appearance.font_size.small");
    if (v <= 17) return t("appearance.font_size.default");
    if (v <= 19) return t("appearance.font_size.large");
    return t("appearance.font_size.very_large");
  };

  const resetItems = [
    `${t("appearance.section.color_scheme")}: ${t(`appearance.theme.${DEFAULT_THEME}`)}`,
    `${t("appearance.section.accent_color")}: ${t(`appearance.accent.${DEFAULT_ACCENT}`)}`,
    t("appearance.reset.item_font"),
    t("appearance.reset.item_contrast"),
    t("appearance.reset.item_colorblind"),
    ...(isMobile ? [] : [t("appearance.reset.item_shortcuts")]),
  ];

  return (
    <SettingsPage>
      <PageHeader title={t("settings.appearance")} />

      <SettingsSection title={t("appearance.section.color_scheme")}>
        <div className="p-4">
          <ThemePicker value={theme} onChange={setTheme} />
        </div>
        <SettingsRow label={t("appearance.section.accent_color")} description={t("appearance.accent_hint")}>
          <div className="mt-3">
            <AccentPicker value={accent} onChange={setAccent} />
          </div>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection>
        <SettingsRow
          stack
          label={t("appearance.section.language")}
          control={
            <SegmentedControl<Language>
              ariaLabel={t("appearance.section.language")}
              value={language}
              onChange={(v) => changeLanguage(v)}
              options={[
                { value: "de", label: t("appearance.language.de") },
                { value: "en", label: t("appearance.language.en") },
              ]}
            />
          }
        />
        <SettingsRow
          label={t("appearance.section.font_size")}
          control={
            <span className="text-[13px] text-muted-foreground">
              {fontSizeLabel(fontSize)} <span className="tech ml-1 text-foreground">{fontSize}px</span>
            </span>
          }
        >
          <div className="mt-4 flex items-center gap-3">
            <span aria-hidden className="text-xs text-muted-foreground">
              A
            </span>
            <Slider
              min={12}
              max={22}
              step={1}
              value={[fontSize]}
              onValueChange={([v]) => setFontSize(v)}
              aria-label={t("appearance.section.font_size")}
              className="flex-1"
            />
            <span aria-hidden className="text-lg text-muted-foreground">
              A
            </span>
          </div>
          <div
            className="mt-4 rounded-md border border-border bg-surface-sunken px-3 py-2.5"
            style={{ fontSize: `${fontSize}px` }}
          >
            <p className="font-medium text-foreground">{t("appearance.preview.title")}</p>
            <p className="text-muted-foreground">{t("appearance.preview.subtitle")}</p>
            <p className="tech mt-0.5 text-muted-foreground" style={{ fontSize: `${Math.max(fontSize - 3, 10)}px` }}>
              {t("appearance.preview.changed")}
            </p>
          </div>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title={t("appearance.section.accessibility")}>
        <SettingsRow
          htmlFor="high-contrast"
          label={t("appearance.high_contrast.label")}
          description={t("appearance.high_contrast.description")}
          control={<Switch id="high-contrast" checked={highContrast} onCheckedChange={setHighContrast} />}
        />
        <SettingsRow
          stack
          label={t("appearance.color_blind.label")}
          description={t("appearance.color_blind.description")}
          control={
            <Select value={colorBlind} onValueChange={(v) => setColorBlind(v as ColorBlindMode)}>
              <SelectTrigger className="w-full sm:w-52" aria-label={t("appearance.color_blind.label")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLOR_BLIND_MODES.map((id) => (
                  <SelectItem key={id} value={id}>
                    <span className="block">{t(`appearance.color_blind.modes.${id}.label`)}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        >
          {colorBlind !== "none" && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t(`appearance.color_blind.modes.${colorBlind}.desc`)}
            </p>
          )}
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title={t("appearance.section.shortcuts")}>
        {isMobile ? (
          <SettingsRow
            disabled
            label={t("appearance.shortcuts.mobile_title")}
            description={t("appearance.shortcuts.mobile_desc")}
          />
        ) : (
          <>
            <SettingsRow
              htmlFor="keyboard-shortcuts"
              label={t("appearance.shortcuts.toggle_label")}
              description={
                isElectron
                  ? t("appearance.shortcuts.toggle_desc_electron")
                  : t("appearance.shortcuts.toggle_desc_browser")
              }
              control={<Switch id="keyboard-shortcuts" checked={shortcuts} onCheckedChange={setShortcuts} />}
            />
            <SettingsRow
              label={t("appearance.shortcuts.palette_hint_name")}
              description={
                <>
                  {t("appearance.shortcuts.palette_hint_pre")} {t("appearance.shortcuts.palette_hint_name")}
                  {t("appearance.shortcuts.palette_hint_post")}
                </>
              }
              control={
                <kbd className="rounded border border-border bg-surface-sunken px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                  {t("appearance.shortcuts.shortcut_key")}
                </kbd>
              }
            />
          </>
        )}
      </SettingsSection>

      <SettingsSection>
        <SettingsRow
          stack
          label={t("category_settings.title")}
          description={t("category_settings.description")}
          control={
            <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => setShowCategorySettings(true)}>
              {t("common.edit")}
            </Button>
          }
        />
      </SettingsSection>

      <SettingsSection title={t("appearance.section.reset")}>
        <SettingsRow
          stack
          label={t("appearance.reset.description")}
          description={
            <ul className="mt-1 space-y-0.5">
              {resetItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          }
          control={
            <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={handleReset}>
              <RotateCcw />
              {t("common.reset")}
            </Button>
          }
        />
      </SettingsSection>

      <CategorySettingsPanel isOpen={showCategorySettings} onClose={() => setShowCategorySettings(false)} />
    </SettingsPage>
  );
}
