import { ReactNode, useRef, useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, Sliders, FolderKanban, HandCoins, MoreHorizontal } from "lucide-react";
import { UserMenu } from "@/components/UserMenu";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { UndoRedoButtons } from "@/components/UndoRedoButtons";
import { useUndoRedoContext } from "@/contexts/UndoRedoContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { injectSpeedInsights } from '@vercel/speed-insights';
import { Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { hapticFeedback } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

injectSpeedInsights();

interface AppLayoutProps {
  children: ReactNode;
}

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  mobileLabel: string;
}

function getNavItems(t: TFunction): NavItem[] {
  return [
    { to: "/",          icon: LayoutDashboard, label: t("nav.dashboard"), mobileLabel: t("nav.home")      },
    { to: "/inventory", icon: Package,         label: t("nav.inventory"), mobileLabel: t("nav.inventory") },
    { to: "/projects",  icon: FolderKanban,    label: t("nav.projects"),  mobileLabel: t("nav.projects")  },
    { to: "/lending",   icon: HandCoins,       label: t("nav.lending"),   mobileLabel: t("nav.lending")   },
    { to: "/dmx",       icon: Sliders,         label: t("nav.dmx"),       mobileLabel: t("nav.dmx")       },
  ];
}

const MOBILE_NAV_COUNT = 5;

interface LiquidGlassNavProps {
  navItems: NavItem[];
}

function LiquidGlassNav({ navItems }: LiquidGlassNavProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [bubbleStyle, setBubbleStyle] = useState<{ left: number; width: number } | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  const mobileItems = navItems.slice(0, MOBILE_NAV_COUNT);
  const moreItems = navItems.slice(MOBILE_NAV_COUNT);

  const isMoreActive = moreItems.some((item) =>
    item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to)
  );

  const activeIndex = (() => {
    const mainIdx = mobileItems.findIndex((item) =>
      item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to)
    );
    if (mainIdx >= 0) return mainIdx;
    if (isMoreActive) return MOBILE_NAV_COUNT;
    return -1;
  })();

  useEffect(() => {
    const el = itemRefs.current[activeIndex];
    const nav = navRef.current;
    if (el && nav) {
      const navRect = nav.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      setBubbleStyle({ left: elRect.left - navRect.left, width: elRect.width });
    }
  }, [activeIndex]);

  useEffect(() => { setMoreOpen(false); }, [location.pathname]);

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-[env(safe-area-inset-bottom)]">
      <div className="mb-3 mx-3">
        {/* More popover */}
        <div
          className="absolute bottom-full mb-2 right-3 rounded-2xl p-2 min-w-[160px] space-y-0.5 overflow-hidden"
          style={{
            background: "var(--mob-more-bg)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            border: "1px solid var(--mob-more-border)",
            boxShadow: "var(--mob-more-shadow)",
            transition: "opacity 0.25s ease, transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
            opacity: moreOpen ? 1 : 0,
            transform: moreOpen ? "translateY(0)" : "translateY(12px)",
            pointerEvents: moreOpen ? "auto" : "none",
          }}
        >
          {moreItems.map((item, i) => {
            const isActive = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={() => { setMoreOpen(false); hapticFeedback(20); }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive ? "text-primary bg-primary/10" : "text-muted-foreground/80 active:bg-muted/30"
                )}
                style={{
                  transition: `opacity 0.2s ease ${i * 0.06}s, transform 0.25s cubic-bezier(0.32, 0.72, 0, 1) ${i * 0.06}s`,
                  opacity: moreOpen ? 1 : 0,
                  transform: moreOpen ? "translateY(0)" : "translateY(8px)",
                }}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </div>

        <nav
          ref={navRef}
          className="relative flex items-center gap-0.5 px-2 py-2 rounded-[22px]"
          style={{
            background: "var(--mob-nav-bg)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            border: "1px solid var(--mob-nav-border)",
            boxShadow: "var(--mob-nav-shadow)",
          }}
        >
          {bubbleStyle !== null && (
            <div
              className="absolute top-1.5 bottom-1.5 rounded-[16px] pointer-events-none"
              style={{
                left: bubbleStyle.left,
                width: bubbleStyle.width,
                background: "hsl(var(--primary) / 0.15)",
                border: "1px solid hsl(var(--primary) / 0.25)",
                boxShadow: "0 0 12px hsl(var(--primary) / 0.12), inset 0 1px 0 rgba(255,255,255,0.05)",
                transition: "left 0.4s cubic-bezier(0.32, 0.72, 0, 1), width 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
              }}
            />
          )}

          {mobileItems.map((item, i) => {
            const isActive = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                ref={(el) => { itemRefs.current[i] = el; }}
                onClick={() => hapticFeedback(8)}
                className={cn(
                  "relative z-10 flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-[16px] text-[10px] font-medium transition-all duration-300 min-w-[52px]",
                  isActive ? "text-primary" : "text-muted-foreground/70 active:scale-95"
                )}
              >
                <item.icon
                  className={cn("h-[22px] w-[22px] transition-all duration-300", isActive && "drop-shadow-[0_0_6px_hsl(var(--primary)/0.4)]")}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                <span className={cn("transition-all duration-300", isActive ? "opacity-100" : "opacity-60")}>
                  {item.mobileLabel}
                </span>
              </NavLink>
            );
          })}

          {moreItems.length > 0 && (
            <button
              ref={(el) => { itemRefs.current[MOBILE_NAV_COUNT] = el as any; }}
              onClick={() => setMoreOpen((v) => !v)}
              className={cn(
                "relative z-10 flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-[16px] text-[10px] font-medium transition-all duration-300 min-w-[52px]",
                isMoreActive || moreOpen ? "text-primary" : "text-muted-foreground/70 active:scale-95"
              )}
            >
              <MoreHorizontal
                className={cn("h-[22px] w-[22px] transition-all duration-300", (isMoreActive || moreOpen) && "drop-shadow-[0_0_6px_hsl(var(--primary)/0.4)]")}
                strokeWidth={isMoreActive || moreOpen ? 2.2 : 1.8}
              />
              <span className={cn("transition-all duration-300", isMoreActive || moreOpen ? "opacity-100" : "opacity-60")}>
                {t("nav.more")}
              </span>
            </button>
          )}
        </nav>
      </div>
    </div>
  );
}

export function AppLayout({ children }: AppLayoutProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { canUndo, canRedo, onUndo, onRedo } = useUndoRedoContext();
  const isMobile = useIsMobile();
  const showUndoRedo = onUndo !== null && onRedo !== null;
  const location = useLocation();
  const isSettingsRoute = location.pathname.startsWith("/settings");
  const isActive = isSettingsRoute;

  const navItems = getNavItems(t);

  return (
    <div className="h-screen flex flex-col relative overflow-hidden">
      {/* ── Header ── */}
      <header
        className="shrink-0 top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 pt-[env(safe-area-inset-top)]"
        style={{
          '--header-h': 'calc(3rem + env(safe-area-inset-top))',
        } as React.CSSProperties}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-12 lg:h-14 flex items-center justify-between gap-2">

          {/* Left: Logo */}
          <div className="flex items-center gap-2 shrink-0 lg:w-[180px]">
            <img
              src="/pwa-192x192.png"
              alt="RigFlow"
              className="w-7 h-7 sm:w-7 sm:h-7 rounded-lg object-cover"
            />
            <span className="text-sm font-semibold tracking-tight xs:block">RigFlow</span>

            {showUndoRedo && isMobile && (
              <div className="ml-1 scale-90 origin-left">
                <UndoRedoButtons
                  canUndo={canUndo}
                  canRedo={canRedo}
                  onUndo={onUndo!}
                  onRedo={onRedo!}
                  isMobile
                />
              </div>
            )}
          </div>

          {/* Center: Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors duration-200",
                    "after:absolute after:bottom-0 after:left-3 after:right-3 after:h-px after:rounded-full after:transition-all after:duration-200",
                    isActive
                      ? "text-primary after:bg-primary"
                      : "text-muted-foreground hover:text-foreground after:bg-transparent"
                  )
                }
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Right: UserMenu */}
          <div className="flex items-center justify-end gap-1 shrink-0 lg:w-[180px]">
            {showUndoRedo && !isMobile && (
              <>
                <UndoRedoButtons
                  canUndo={canUndo}
                  canRedo={canRedo}
                  onUndo={onUndo!}
                  onRedo={onRedo!}
                />
                <div className="w-px h-4 bg-border/60 mx-1" />
              </>
            )}
            {isMobile ? (
              <button
                onClick={() => navigate("/settings")}
                className={cn(
                  "p-2 rounded-lg transition-all active:scale-90",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Settings className="h-5 w-5" />
              </button>
            ) : (
              <UserMenu />
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Nav */}
      <LiquidGlassNav navItems={navItems} />

      {/* Main Content */}
      <main
        className={cn(
          "flex-1 overflow-x-hidden pb-24 lg:pb-8",
          !isSettingsRoute && "px-3 sm:px-4 lg:px-8"
        )}
      >
        {isSettingsRoute ? (
          children
        ) : (
          <div
            key={location.pathname}
            className="max-w-7xl mx-auto w-full animate-page"
          >
            <div className="max-w-7xl mx-auto w-full">{children}</div>
          </div>
        )}
      </main>

      <OfflineIndicator />
    </div>
  );
}