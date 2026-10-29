import { Outlet, NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, User, Bell, Shield, Palette, Settings2, LogOut, Loader2, Info } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  labelKey: string;
  icon: React.ElementType;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/settings",                  labelKey: "settings.general",       icon: User, end: true },
  { to: "/settings/account-info",     labelKey: "settings.account_info",  icon: Settings2 },
  { to: "/settings/notifications",    labelKey: "settings.notifications", icon: Bell },
  { to: "/settings/privacy-security", labelKey: "settings.privacy",       icon: Shield },
  { to: "/settings/appearance",       labelKey: "settings.appearance",    icon: Palette },
  { to: "/settings/about",            labelKey: "settings.about_link",    icon: Info },
];

const FOOTER_LINKS = [
  { to: "/help",                labelKey: "settings.help_link" },
  { to: "/nutzungsbedingungen", labelKey: "settings.terms_link" },
  { to: "/impressum",           labelKey: "settings.imprint_link" },
  { to: "/datenschutz",         labelKey: "settings.privacy_policy_link" },
];

export default function SettingsLayout() {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { toast } = useToast();
  const [loggingOut, setLoggingOut] = useState(false);

  const activeSubItem = NAV_ITEMS.find((item) => !item.end && item.to === pathname);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      toast({ title: t("user_menu.logout_success_title") });
      navigate("/auth");
    } catch {
      toast({ title: t("common.error"), description: t("user_menu.logout_error"), variant: "destructive" });
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
      {/* Mobile: back link on sub pages */}
      {activeSubItem && (
        <Link
          to="/settings"
          className="mb-4 inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground lg:hidden"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("settings.title")}
        </Link>
      )}

      {/* Desktop: section nav */}
      <aside className="hidden lg:block">
        <div className="sticky top-0 space-y-6">
          <div>
            <h1 className="px-2.5 pb-3 text-[22px] font-semibold tracking-tight">{t("settings.title")}</h1>
            <nav className="space-y-px">
              {NAV_ITEMS.map(({ to, labelKey, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition-colors",
                      isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {t(labelKey)}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="space-y-1.5 border-t border-border px-2.5 pt-4">
            {FOOTER_LINKS.map(({ to, labelKey }) => (
              <Link key={to} to={to} className="block text-xs text-muted-foreground hover:text-foreground">
                {t(labelKey)}
              </Link>
            ))}
          </div>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
          >
            {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            {t("auth.logout")}
          </button>
        </div>
      </aside>

      <div className="min-w-0 max-w-3xl">
        <Outlet />
      </div>
    </div>
  );
}

/** Mobile settings index: grouped list linking to each section. Used by AccountSettings on small screens. */
export function SettingsMobileNav() {
  const { t } = useTranslation();
  return (
    <nav className="surface divide-y divide-border overflow-hidden lg:hidden">
      {NAV_ITEMS.filter((item) => !item.end).map(({ to, labelKey, icon: Icon }) => (
        <Link key={to} to={to} className="flex h-12 items-center gap-3 px-4 text-sm active:bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1">{t(labelKey)}</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      ))}
    </nav>
  );
}
