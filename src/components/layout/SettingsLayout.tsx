import { Outlet, NavLink, Link, useLocation } from "react-router-dom";
import {
  ChevronLeft,
  User, Bell, Shield, Palette, Settings2,
  LogOut, Loader2,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  end?: boolean;
}

function getNavItems(t: TFunction): NavItem[] {
  return [
    { to: "/settings",                  label: t("settings.general"),       icon: User,     end: true },
    { to: "/settings/account-info",     label: t("settings.account_info"),  icon: Settings2           },
    { to: "/settings/notifications",    label: t("settings.notifications"), icon: Bell                },
    { to: "/settings/privacy-security", label: t("settings.privacy"),       icon: Shield              },
    { to: "/settings/appearance",       label: t("settings.appearance"),    icon: Palette             },
  ];
}

export default function SettingsLayout() {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [loggingOut, setLoggingOut] = useState(false);

  const navItems = getNavItems(t);

  // Derive sub-page title from navItems — no separate lookup object needed
  const activeSubItem = navItems.find(
    (item) => !item.end && item.to === location.pathname
  );
  const isSubPage = !!activeSubItem;

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      toast({ title: t("user_menu.logout_success_title") });
      navigate("/auth");
    } catch {
      toast({
        title: t("common.error"),
        description: t("user_menu.logout_error"),
        variant: "destructive",
      });
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100dvh-var(--header-h))]">

      {/* ── Mobile Sub-Header ── */}
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
              <span className="text-sm hidden sm:inline">{t("settings.title")}</span>
            </Link>
            <span className="text-sm font-medium text-foreground">
              {activeSubItem.label}
            </span>
          </div>
        </div>
      )}

      {/* ── Desktop Sidebar ── */}
      <aside
        className="hidden lg:flex flex-col fixed w-60 xl:w-64 border-r border-border/40 bg-background z-20 overflow-y-auto"
        style={{ top: "var(--header-h)", bottom: 0, left: 0 }}
      >
        {/* Nav */}
        <div className="flex-1 overflow-y-auto px-3 pt-6 pb-2">
          <p className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-widest mb-3 px-2">
            {t("settings.title")}
          </p>
          <nav className="space-y-0.5">
            {navItems.map(({ to, label, icon: Icon, end }) => (
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
              {t("settings.help_link")}
            </Link>
            <Link
              to="/settings/about"
              className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              {t("settings.about_link")}
            </Link>
            <Link
              to="/nutzungsbedingungen"
              className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              {t("settings.terms_link")}
            </Link>
            <Link
              to="/impressum"
              className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              {t("settings.imprint_link")}
            </Link>
            <Link
              to="/datenschutz"
              className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              {t("settings.privacy_policy_link")}
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
            {t("auth.logout")}
          </button>
        </div>
      </aside>

      {/* ── Desktop spacer ── */}
      <div className="hidden lg:block w-60 xl:w-64 shrink-0" />

      {/* ── Content ── */}
      <div className="flex-1 min-w-0 px-3 sm:px-4 lg:px-8">
        {isSubPage && <div className="h-11 mb-2 lg:hidden" />}
        <div key={location.pathname} className="animate-page">
          <Outlet />
        </div>
      </div>

    </div>
  );
}