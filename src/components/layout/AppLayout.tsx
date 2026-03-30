import { ReactNode, useRef, useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, Sliders, CheckSquare, Boxes, HandCoins, MoreHorizontal, Search } from "lucide-react";
import { UserMenu } from "@/components/UserMenu";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { UndoRedoButtons } from "@/components/UndoRedoButtons";
import { useUndoRedoContext } from "@/contexts/UndoRedoContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", mobileLabel: "Home" },
  { to: "/inventory", icon: Package, label: "Inventar", mobileLabel: "Inventar" },
  { to: "/lending", icon: HandCoins, label: "Verleih", mobileLabel: "Verleih" },
  { to: "/sets", icon: Boxes, label: "Sets", mobileLabel: "Sets" },
  { to: "/checklists", icon: CheckSquare, label: "Checklisten", mobileLabel: "Checks" },
  { to: "/dmx", icon: Sliders, label: "DMX", mobileLabel: "DMX" },
];

const MOBILE_NAV_COUNT = 4;

function LiquidGlassNav() {
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
            background: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
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
                onClick={() => setMoreOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive ? "text-primary bg-primary/10" : "text-muted-foreground/80 active:bg-white/5"
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
            background: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35), 0 2px 8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
          }}
        >
          {bubbleStyle !== null && (
            <div
              className="absolute top-1.5 bottom-1.5 rounded-[16px] pointer-events-none"
              style={{
                left: bubbleStyle.left,
                width: bubbleStyle.width,
                background: "rgba(52, 211, 153, 0.15)",
                border: "1px solid rgba(52, 211, 153, 0.2)",
                boxShadow: "0 0 12px rgba(52, 211, 153, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
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
                className={cn(
                  "relative z-10 flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-[16px] text-[10px] font-medium transition-all duration-300 min-w-[52px]",
                  isActive ? "text-primary" : "text-muted-foreground/70 active:scale-95"
                )}
              >
                <item.icon
                  className={cn("h-[22px] w-[22px] transition-all duration-300", isActive && "drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]")}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                <span className={cn("transition-all duration-300", isActive ? "opacity-100" : "opacity-60")}>
                  {item.mobileLabel}
                </span>
              </NavLink>
            );
          })}

          <button
            ref={(el) => { itemRefs.current[MOBILE_NAV_COUNT] = el as any; }}
            onClick={() => setMoreOpen((v) => !v)}
            className={cn(
              "relative z-10 flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-[16px] text-[10px] font-medium transition-all duration-300 min-w-[52px]",
              isMoreActive || moreOpen ? "text-primary" : "text-muted-foreground/70 active:scale-95"
            )}
          >
            <MoreHorizontal
              className={cn("h-[22px] w-[22px] transition-all duration-300", (isMoreActive || moreOpen) && "drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]")}
              strokeWidth={isMoreActive || moreOpen ? 2.2 : 1.8}
            />
            <span className={cn("transition-all duration-300", isMoreActive || moreOpen ? "opacity-100" : "opacity-60")}>
              Mehr
            </span>
          </button>
        </nav>
      </div>
    </div>
  );
}

export function AppLayout({ children }: AppLayoutProps) {
  const { canUndo, canRedo, onUndo, onRedo } = useUndoRedoContext();
  const isMobile = useIsMobile();
  const showUndoRedo = onUndo !== null && onRedo !== null;

  return (
    <div className="h-screen flex flex-col relative overflow-hidden">
      {/* ── Header ── */}
      <header className="shrink-0 top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 pt-[env(safe-area-inset-top)]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-12 lg:h-14 flex items-center justify-between gap-2">

          {/* Left: Logo — Auf Mobile flexibel, auf Desktop fest */}
          <div className="flex items-center gap-2 shrink-0 lg:w-[180px]">
            <img
              src="/pwa-192x192.png"
              alt="Rigflow Logo"
              className="w-7 h-7 sm:w-7 sm:h-7 rounded-lg object-cover"
            />
            <span className="text-sm font-semibold tracking-tight xs:block">Rigflow</span>

            {/* Undo/Redo: Kompakteres Layout für Mobile */}
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

          {/* Center: Desktop Navigation (bleibt unverändert) */}
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

          {/* Right: UserMenu — Auf Mobile shrink-0 */}
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
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Mobile Bottom Nav */}
      <LiquidGlassNav />

      {/* Main Content */}
      <main className="flex-1 p-3 sm:p-4 lg:p-8 overflow-x-hidden pb-24 lg:pb-8">
        <div className="max-w-7xl mx-auto w-full">{children}</div>
      </main>

      <OfflineIndicator />
    </div>
  );
}