import { ReactNode, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Package, Sliders, FolderKanban, HandCoins, ScanLine,
  Settings, Search, Menu, LifeBuoy,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { UserMenu } from "@/components/UserMenu";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { UndoRedoButtons } from "@/components/UndoRedoButtons";
import { useUndoRedoContext } from "@/contexts/UndoRedoContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Logo } from "@/components/layout/Logo";
import { OPEN_COMMAND_PALETTE_EVENT } from "@/lib/constants";
import { cn, hapticFeedback } from "@/lib/utils";

interface NavItem {
  to: string;
  icon: React.ElementType;
  labelKey: string;
}

const WORKSPACE_NAV: NavItem[] = [
  { to: "/",          icon: LayoutDashboard, labelKey: "nav.dashboard" },
  { to: "/inventory", icon: Package,         labelKey: "nav.inventory" },
  { to: "/projects",  icon: FolderKanban,    labelKey: "nav.projects"  },
  { to: "/lending",   icon: HandCoins,       labelKey: "nav.lending"   },
];

const TOOLS_NAV: NavItem[] = [
  { to: "/dmx",     icon: Sliders,  labelKey: "nav.dmx"     },
  { to: "/scanner", icon: ScanLine, labelKey: "nav.scanner" },
];

// Mobile tab bar: four destinations + "more" sheet
const MOBILE_TABS: NavItem[] = [
  { to: "/",          icon: LayoutDashboard, labelKey: "nav.home"      },
  { to: "/inventory", icon: Package,         labelKey: "nav.inventory" },
  { to: "/scanner",   icon: ScanLine,        labelKey: "nav.scanner"   },
  { to: "/projects",  icon: FolderKanban,    labelKey: "nav.projects"  },
];

const MOBILE_MORE: NavItem[] = [
  { to: "/lending",  icon: HandCoins, labelKey: "nav.lending"  },
  { to: "/dmx",      icon: Sliders,   labelKey: "nav.dmx"      },
  { to: "/settings", icon: Settings,  labelKey: "nav.settings" },
  { to: "/help",     icon: LifeBuoy,  labelKey: "settings.help_link" },
];

const isPathActive = (pathname: string, to: string) =>
  to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);

const openCommandPalette = () => window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE_EVENT));

function SidebarLink({ item }: { item: NavItem }) {
  const { t } = useTranslation();
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      className={({ isActive }) =>
        cn(
          "group flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition-colors",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        )
      }
    >
      {({ isActive }) => (
        <>
          <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "opacity-70")} />
          {t(item.labelKey)}
        </>
      )}
    </NavLink>
  );
}

function DesktopSidebar() {
  const { t } = useTranslation();
  const { canUndo, canRedo, onUndo, onRedo } = useUndoRedoContext();
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar pt-safe">
      <div className="flex h-[var(--header-h)] items-center px-4">
        <Logo />
      </div>

      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={openCommandPalette}
          className="flex h-8 w-full items-center gap-2 rounded-md border border-sidebar-border bg-background px-2.5 text-[13px] text-muted-foreground transition-colors hover:border-border-strong"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">{t("nav.search")}</span>
          <kbd className="font-mono text-2xs text-muted-foreground/80">{isMac ? "⌘K" : "Ctrl K"}</kbd>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <p className="eyebrow px-2.5 pb-1.5">{t("nav.workspace")}</p>
        <div className="space-y-px">
          {WORKSPACE_NAV.map((item) => <SidebarLink key={item.to} item={item} />)}
        </div>
        <p className="eyebrow px-2.5 pb-1.5 pt-5">{t("nav.tools")}</p>
        <div className="space-y-px">
          {TOOLS_NAV.map((item) => <SidebarLink key={item.to} item={item} />)}
        </div>
      </nav>

      <div className="border-t border-sidebar-border p-3 space-y-2">
        {onUndo && onRedo && (
          <div className="flex items-center justify-between px-1">
            <span className="eyebrow">{t("undo_redo.history")}</span>
            <UndoRedoButtons canUndo={canUndo} canRedo={canRedo} onUndo={onUndo} onRedo={onRedo} />
          </div>
        )}
        <SidebarLink item={{ to: "/settings", icon: Settings, labelKey: "nav.settings" }} />
        <UserMenu />
      </div>
    </aside>
  );
}

function MobileTopBar() {
  const { t } = useTranslation();
  const { canUndo, canRedo, onUndo, onRedo } = useUndoRedoContext();

  return (
    <header className="lg:hidden sticky top-0 z-40 border-b border-border bg-background/95 pt-safe supports-[backdrop-filter]:bg-background/85 supports-[backdrop-filter]:backdrop-blur">
      <div className="flex h-[var(--header-h)] items-center gap-2 px-4">
        <Logo />
        <div className="ml-auto flex items-center gap-0.5">
          {onUndo && onRedo && (
            <UndoRedoButtons canUndo={canUndo} canRedo={canRedo} onUndo={onUndo} onRedo={onRedo} isMobile />
          )}
          <button
            type="button"
            onClick={openCommandPalette}
            aria-label={t("nav.search")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground active:bg-muted"
          >
            <Search className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </header>
  );
}

function MobileTabBar() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MOBILE_MORE.some((item) => isPathActive(pathname, item.to));

  useEffect(() => setMoreOpen(false), [pathname]);

  const tabClass = (active: boolean) =>
    cn(
      "relative flex flex-1 flex-col items-center justify-center gap-1 pt-2 pb-1.5 text-[10px] font-medium transition-colors",
      active ? "text-foreground" : "text-muted-foreground"
    );

  const indicator = (active: boolean) =>
    active && <span className="absolute inset-x-5 top-0 h-0.5 rounded-b bg-primary" />;

  return (
    <>
      <nav className="lg:hidden fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background pb-safe">
        {MOBILE_TABS.map((item) => {
          const active = isPathActive(pathname, item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={() => hapticFeedback(8)}
              className={tabClass(active)}
            >
              {indicator(active)}
              <item.icon className={cn("h-5 w-5", active && "text-primary")} strokeWidth={active ? 2.2 : 1.8} />
              {t(item.labelKey)}
            </NavLink>
          );
        })}
        <button type="button" onClick={() => setMoreOpen(true)} className={tabClass(moreActive)}>
          {indicator(moreActive)}
          <Menu className={cn("h-5 w-5", moreActive && "text-primary")} strokeWidth={moreActive ? 2.2 : 1.8} />
          {t("nav.more")}
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-xl px-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <SheetHeader className="px-2 pb-2 text-left">
            <SheetTitle className="text-sm">{t("nav.more")}</SheetTitle>
          </SheetHeader>
          <div className="grid gap-px">
            {MOBILE_MORE.map((item) => {
              const active = isPathActive(pathname, item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium",
                    active ? "bg-muted text-foreground" : "text-foreground/80 active:bg-muted"
                  )}
                >
                  <item.icon className={cn("h-[18px] w-[18px]", active ? "text-primary" : "text-muted-foreground")} />
                  {t(item.labelKey)}
                </NavLink>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

interface AppLayoutProps {
  /** Optional explicit content. Defaults to the nested route <Outlet />. */
  children?: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { pathname } = useLocation();

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <DesktopSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar />
        <main id="main" className="flex-1 overflow-y-auto overflow-x-hidden pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
          <div key={pathname} className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7 animate-page">
            {children ?? <Outlet />}
          </div>
        </main>
      </div>

      <MobileTabBar />
      <OfflineIndicator />
    </div>
  );
}
