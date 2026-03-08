import { ReactNode, useRef, useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, Sliders, CheckSquare, Boxes } from "lucide-react";
import { UserMenu } from "@/components/UserMenu";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", mobileLabel: "Home" },
  { to: "/inventory", icon: Package, label: "Inventar", mobileLabel: "Inventar" },
  { to: "/sets", icon: Boxes, label: "Sets", mobileLabel: "Sets" },
  { to: "/checklists", icon: CheckSquare, label: "Checklisten", mobileLabel: "Checks" },
  { to: "/dmx", icon: Sliders, label: "DMX Patchplan", mobileLabel: "DMX" },
];

function LiquidGlassNav() {
  const location = useLocation();
  const navRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [bubbleStyle, setBubbleStyle] = useState({ left: 0, width: 0 });

  const activeIndex = navItems.findIndex((item) =>
    item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to)
  );

  useEffect(() => {
    const el = itemRefs.current[activeIndex];
    const nav = navRef.current;
    if (el && nav) {
      const navRect = nav.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      setBubbleStyle({
        left: elRect.left - navRect.left,
        width: elRect.width,
      });
    }
  }, [activeIndex]);

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-[env(safe-area-inset-bottom)]">
      <div className="mb-3 mx-3">
        <nav
          ref={navRef}
          className="relative flex items-center gap-0.5 px-2 py-2 rounded-[22px]"
          style={{
            background: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow:
              "0 8px 32px rgba(0, 0, 0, 0.35), 0 2px 8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
          }}
        >
          {/* Animated highlight bubble */}
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

          {navItems.map((item, i) => {
            const isActive =
              item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                ref={(el) => { itemRefs.current[i] = el; }}
                className={cn(
                  "relative z-10 flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-[16px] text-[10px] font-medium transition-all duration-300 min-w-[52px]",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground/70 active:scale-95"
                )}
              >
                <item.icon
                  className={cn(
                    "h-[22px] w-[22px] transition-all duration-300",
                    isActive && "drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]"
                  )}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                <span className={cn(
                  "transition-all duration-300",
                  isActive ? "opacity-100" : "opacity-60"
                )}>
                  {item.mobileLabel}
                </span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="/pwa-192x192.png"
              alt="Rigflow Logo"
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover"
            />
            <div>
              <h1 className="text-sm sm:text-base font-semibold tracking-tight leading-tight">
                Rigflow
              </h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Inventarverwaltung</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/20 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <UserMenu />
        </div>
      </header>

      {/* Liquid Glass Mobile Navigation */}
      <LiquidGlassNav />

      {/* Main Content */}
      <main className="flex-1 p-3 sm:p-4 md:p-8 overflow-x-hidden pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto w-full">{children}</div>
      </main>

      {/* Offline Indicator */}
      <OfflineIndicator />
    </div>
  );
}
