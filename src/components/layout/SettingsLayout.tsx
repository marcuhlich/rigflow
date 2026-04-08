import { Outlet, NavLink, Link } from "react-router-dom";
import {
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

export default function SettingsLayout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loggingOut, setLoggingOut] = useState(false);

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
    // Bricht aus AppLayouts px-Padding und max-w-Wrapper aus
    <div className="-mx-3 sm:-mx-4 lg:-mx-8 flex min-h-[calc(100vh-3.5rem)]">

      {/* ── Sidebar: fixed left-0 → immer flush am Rand, nie scrollend ── */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-14 bottom-0 w-60 xl:w-64 border-r border-border/40 bg-background z-20">

        {/* Nav-Bereich: füllt verbleibenden Platz, scrollt bei Bedarf */}
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

        {/* Footer: shrink-0 → klebt immer am unteren Rand */}
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
            <button
              onClick={() => toast({ title: "Nutzungsbedingungen", description: "Diese Funktion kommt bald." })}
              className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              Nutzungsbedingungen
            </button>
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

      {/* Spacer hält exakt den Platz frei den die fixed Sidebar belegt */}
      <div className="hidden lg:block w-60 xl:w-64 shrink-0" />

      {/* Content — nur dieser Bereich scrollt */}
      <div className="flex-1 min-w-0 px-3 sm:px-4 lg:px-8">
        <Outlet />
      </div>

    </div>
  );
}