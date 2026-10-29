import { useTranslation } from "react-i18next";
import { Monitor, Moon, Sun } from "lucide-react";
import type { Theme } from "@/lib/appearanceUtils";
import { cn } from "@/lib/utils";

interface Palette {
  bg: string;
  side: string;
  card: string;
  line: string;
}

const LIGHT: Palette = { bg: "#fafafa", side: "#f1f1f3", card: "#ffffff", line: "#e4e4e7" };
const DARK: Palette = { bg: "#0f0f11", side: "#141417", card: "#19191c", line: "#2a2a2e" };

const OPTIONS: { id: Theme; icon: React.ElementType }[] = [
  { id: "hell", icon: Sun },
  { id: "dunkel", icon: Moon },
  { id: "system", icon: Monitor },
];

/** Miniature app window: sidebar, title bar and a card with an accent button. */
function MiniApp({ p }: { p: Palette }) {
  return (
    <div className="flex h-full w-full" style={{ background: p.bg }}>
      <div className="w-1/4 space-y-1 p-1.5" style={{ background: p.side, borderRight: `1px solid ${p.line}` }}>
        <div className="h-1 w-full rounded-sm" style={{ background: "hsl(var(--primary))" }} />
        <div className="h-1 w-3/4 rounded-sm" style={{ background: p.line }} />
        <div className="h-1 w-3/4 rounded-sm" style={{ background: p.line }} />
      </div>
      <div className="flex-1 space-y-1.5 p-1.5">
        <div className="h-1.5 w-1/2 rounded-sm" style={{ background: p.line }} />
        <div className="space-y-1 rounded-[3px] p-1.5" style={{ background: p.card, border: `1px solid ${p.line}` }}>
          <div className="h-1 w-full rounded-sm" style={{ background: p.line }} />
          <div className="h-1 w-2/3 rounded-sm" style={{ background: p.line }} />
          <div className="ml-auto mt-1 h-1.5 w-1/3 rounded-sm" style={{ background: "hsl(var(--primary))" }} />
        </div>
      </div>
    </div>
  );
}

function Preview({ theme }: { theme: Theme }) {
  if (theme === "system") {
    return (
      <div className="relative h-full w-full">
        <MiniApp p={LIGHT} />
        <div className="absolute inset-0" style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }}>
          <MiniApp p={DARK} />
        </div>
      </div>
    );
  }
  return <MiniApp p={theme === "dunkel" ? DARK : LIGHT} />;
}

interface Props {
  value: Theme;
  onChange: (theme: Theme) => void;
}

export function ThemePicker({ value, onChange }: Props) {
  const { t } = useTranslation();
  return (
    <div role="radiogroup" aria-label={t("appearance.section.color_scheme")} className="grid grid-cols-3 gap-2 sm:gap-3">
      {OPTIONS.map(({ id, icon: Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(id)}
            className={cn(
              "group overflow-hidden rounded-md border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              active ? "border-primary ring-1 ring-primary" : "border-border hover:border-border-strong"
            )}
          >
            <div className="aspect-[16/10] w-full border-b border-border">
              <Preview theme={id} />
            </div>
            <div
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-2 text-[13px] font-medium",
                active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {t(`appearance.theme.${id}`)}
            </div>
          </button>
        );
      })}
    </div>
  );
}
