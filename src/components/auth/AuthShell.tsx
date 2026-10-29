import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ClipboardList, QrCode, SlidersHorizontal, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/layout/Logo";
import { tArray } from "@/components/landing/tArray";

interface AuthShellProps {
  children: ReactNode;
  /** Optional back link in the top bar */
  back?: { to: string; label: string };
}

const ASIDE_ICONS = [WifiOff, QrCode, ClipboardList, SlidersHorizontal];
// features_section.items order: offline, qr, checklists, sync, dmx, audit
const ASIDE_ITEM_INDEXES = [0, 1, 2, 4];

/** Quiet product panel on the right side of auth screens (desktop only). */
function AuthAside() {
  const { t } = useTranslation();
  const all = tArray<{ title: string; description: string }>(t, "landing.home.features_section.items");
  const items = ASIDE_ITEM_INDEXES.map((idx) => all[idx]).filter(Boolean);

  return (
    <aside className="hidden border-l border-border bg-surface-sunken lg:flex lg:flex-col lg:justify-center">
      <div className="mx-auto w-full max-w-md px-12 py-16">
        <p className="eyebrow">RigFlow</p>
        <p className="mt-3 text-2xl font-semibold leading-snug tracking-tight">
          {t("landing.home.footer.brand_desc")}
        </p>
        <ul className="mt-10 space-y-5">
          {items.map((item, i) => {
            const Icon = ASIDE_ICONS[i];
            return (
              <li key={item.title} className="flex gap-3">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{item.description}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}

/** Split auth layout: form column left, product panel right (lg+). Single column on mobile. */
export function AuthShell({ children, back }: AuthShellProps) {
  const { t } = useTranslation();

  return (
    <div className="grid min-h-[100dvh] grid-cols-1 bg-background lg:grid-cols-[minmax(440px,560px)_1fr]">
      <div className="flex min-h-[100dvh] flex-col px-5 pb-safe pt-safe sm:px-10">
        <div className="flex h-16 items-center justify-between">
          <Link
            to="/landing"
            className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Logo />
          </Link>
          {back && (
            <Link
              to={back.to}
              className="inline-flex items-center gap-1 rounded-md text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              {back.label}
            </Link>
          )}
        </div>

        <main className="flex flex-1 flex-col justify-center py-10">
          <div className="mx-auto w-full max-w-[360px]">{children}</div>
        </main>

        <div className="flex flex-wrap gap-x-4 gap-y-1 py-5 text-xs text-muted-foreground">
          <Link to="/impressum" className="hover:text-foreground">
            {t("settings.imprint_link")}
          </Link>
          <Link to="/datenschutz" className="hover:text-foreground">
            {t("landing.home.footer.privacy")}
          </Link>
          <Link to="/nutzungsbedingungen" className="hover:text-foreground">
            {t("settings.terms_link")}
          </Link>
        </div>
      </div>

      <AuthAside />
    </div>
  );
}

/** Title + subtitle block at the top of an auth form. */
export function AuthHeading({ title, description }: { title: ReactNode; description?: ReactNode }) {
  return (
    <div className="mb-7">
      <h1 className="text-[22px] font-semibold tracking-tight">{title}</h1>
      {description && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>}
    </div>
  );
}
