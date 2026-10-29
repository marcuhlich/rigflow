import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Settings, LogOut, ChevronsUpDown } from "lucide-react";
import posthog from "posthog-js";
import { ANALYTICS_CONSENT_KEY } from "@/lib/constants";

export function UserMenu() {
  const { t } = useTranslation();

  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();

      toast({
        title: t("user_menu.logout_success_title"),
        description: t("user_menu.logout_success_description"),
      });

      const consent = localStorage.getItem(ANALYTICS_CONSENT_KEY);

      if (consent === "true") {
        posthog.capture("user_logged_out");
      }

      navigate("/auth");
    } catch {
      toast({
        title: t("common.error"),
        description: t("user_menu.logout_error"),
        variant: "destructive",
      });
    }
  };

  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || t("user_menu.default_name");
  const initial = displayName.charAt(0);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-10 w-full items-center gap-2.5 rounded-md px-2 text-left transition-colors hover:bg-sidebar-accent/60 data-[state=open]:bg-sidebar-accent"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-sidebar-border bg-background text-xs font-semibold uppercase text-foreground">
            {initial}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium">{displayName}</span>
            <span className="block truncate text-2xs text-muted-foreground">{user?.email}</span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" side="top" className="w-56">
        <div className="px-2 py-1.5 text-sm">
          <p className="font-medium text-foreground">
            {user?.email}
          </p>

          <p className="text-xs text-muted-foreground">
            {user?.user_metadata?.display_name ||
              t("user_menu.default_name")}
          </p>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => navigate("/settings")}
          className="gap-2 cursor-pointer"
        >
          <Settings className="h-4 w-4" />

          <span>{t("user_menu.settings")}</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleLogout}
          className="gap-2 cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />

          <span>{t("user_menu.logout")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}