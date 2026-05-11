import { Outlet, NavLink, Link, useLocation } from "react-router-dom";
import {
  ChevronLeft,
  User, Bell, Shield, Palette, Settings2,
  LogOut, ExternalLink, Loader2,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/settings",                  label: "Allgemein",                icon: User,     end: true },
  { to: "/settings/account-info",     label: "Kontoinformationen",       icon: Settings2           },
  { to: "/settings/notifications",    label: "Benachrichtigungen",       icon: Bell                },
  { to: "/settings/privacy-security", label: "Datenschutz & Sicherheit", icon: Shield              },
  { to: "/settings/appearance",       label: "Erscheinungsbild",         icon: Palette             },
];

const SUB_PAGE_TITLES: Record<string, string> = {
  "/settings/account-info":     "Kontoinformationen",
  "/settings/notifications":    "Benachrichtigungen",
  "/settings/privacy-security": "Datenschutz & Sicherheit",
  "/settings/appearance":       "Erscheinungsbild",
};

export default function SettingsLayout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [loggingOut, setLoggingOut] = useState(false);

  const subTitle = SUB_PAGE_TITLES[location.pathname];
  const isSubPage = !!subTitle;

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      toast({ title: "Abgemeldet" });
      navigate("/auth");
    } catch {
      toast({ title: "Fehler", description: "Abmeldung fehlgeschlagen", variant: "destructive" });
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100dvh-var(--header-h))]">

      {/* ── Mobile Sub-Header ─────────────────────────────────────────────
          Rendered here — outside any animated/transformed wrapper — so that
          position:fixed is always relative to the viewport.
          Sub-page components (AccountInfo, Notifications, etc.) must NOT
          render their own sub-header or spacer any more. */}
      {isSubPage && (
        <div
          className="fixed left-0 right-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/40 lg:hidden"
          style={{ top: "var(--header-h)" }}
        >
          <div className="px-3 sm:px-4 h-11 flex items-center justify-center relative">
            <Link
              to="/settings"
              className="absolute left-3 sm:left-4 inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="text-sm hidden sm:inline">Einstellungen</span>
            </Link>
            <span className="text-sm font-medium text-foreground">{subTitle}</span>
          </div>
        </div>
      )}

      {/* ── Desktop Sidebar ───────────────────────────────────────────────
          Uses position:fixed so top:var(--header-h) is relative to the
          viewport directly.  The old sticky approach had a double-offset
          bug: sticky top:N is measured from the scroll container (main),
          which itself already starts N px below the header, putting the
          sidebar N px too low on scrollable pages.  Fixed + an explicit
          spacer div below is the clean solution. */}
      <aside
        className="hidden lg:flex flex-col fixed w-60 xl:w-64 border-r border-border/40 bg-background z-20 overflow-y-auto"
        style={{ top: "var(--header-h)", bottom: 0, left: 0 }}
      >
        {/* Nav */}
        <div className="flex-1 overflow-y-auto px-3 pt-6 pb-2">
          <p className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-widest mb-3 px-2">
            Einstellungen
          </p>
          <nav className="space-y-0.5">
            {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  )
                }
              >
                <Icon className="h-[1.05rem] w-[1.05rem] shrink-0" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-3 py-4 border-t border-border/40">
          <div className="px-2 pb-3 space-y-2">
            <Link
              to="/help"
              className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              Anleitung
            </Link>
            <a
              href="https://github.com/marcuhlich/rigflow"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              Informationen zur App
              <ExternalLink className="h-2.5 w-2.5 shrink-0" />
            </a>
            <Link to="/nutzungsbedingungen" className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">
              Nutzungsbedingungen
            </Link>
            <Link to="/impressum" className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">
              Impressum
            </Link>
            <Link to="/datenschutz" className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">
              Datenschutzerklärung
            </Link>
          </div>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all duration-150 disabled:opacity-50"
          >
            {loggingOut
              ? <Loader2 className="h-[1.05rem] w-[1.05rem] shrink-0 animate-spin" />
              : <LogOut className="h-[1.05rem] w-[1.05rem] shrink-0" />
            }
            Abmelden
          </button>
        </div>
      </aside>

      {/* ── Desktop spacer ────────────────────────────────────────────────
          Reserves the sidebar's width in the flex row so the content
          column starts to the right of the fixed sidebar. */}
      <div className="hidden lg:block w-60 xl:w-64 shrink-0" />

      {/* ── Content ───────────────────────────────────────────────────────
          Only the Outlet re-animates on navigation. Sidebar and sub-header
          stay mounted. */}
      <div className="flex-1 min-w-0 px-3 sm:px-4 lg:px-8">
        {/* Mobile spacer: pushes content below the fixed sub-header */}
        {isSubPage && <div className="h-11 mb-2 lg:hidden" />}

        <div key={location.pathname} className="animate-page">
          <Outlet />
        </div>
      </div>

    </div>
  );
}