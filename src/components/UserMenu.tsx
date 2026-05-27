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

import { Button } from "@/components/ui/button";
import { User, Settings, LogOut } from "lucide-react";
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>

          <span className="hidden sm:inline text-sm">
            {user?.email?.split("@")[0]}
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
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