import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Link2Off } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PageLoader } from "@/components/QueryState";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthStatus } from "@/components/auth/FormFields";
import { EMAIL_REDIRECT_NATIVE } from "@/components/auth/authUtils";

type Status = "loading" | "success" | "error";
const REDIRECT_DELAY_MS = 1500;

export default function AuthCallback() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;

    const handleCallback = async () => {
      try {
        const code = new URLSearchParams(window.location.search).get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            // The client may already have exchanged the code (detectSessionInUrl).
            const { data } = await supabase.auth.getSession();
            if (!cancelled) setStatus(data.session ? "success" : "error");
            return;
          }
        }
        const { data } = await supabase.auth.getSession();
        if (!cancelled) setStatus(data.session ? "success" : "error");
      } catch {
        if (!cancelled) setStatus("error");
      }
    };

    void handleCallback();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status !== "success") return;
    const id = window.setTimeout(() => navigate("/", { replace: true }), REDIRECT_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [status, navigate]);

  return (
    <AuthShell>
      {status === "loading" && <PageLoader className="min-h-[200px]" />}

      {status === "error" && (
        <AuthStatus
          icon={<Link2Off className="h-[18px] w-[18px] text-destructive" strokeWidth={1.75} />}
          title={t("auth.callback_error")}
        >
          <Button className="w-full" asChild>
            <Link to="/auth">{t("auth.back_to_login")}</Link>
          </Button>
        </AuthStatus>
      )}

      {status === "success" && (
        <AuthStatus
          icon={<CheckCircle2 className="h-[18px] w-[18px] text-success" strokeWidth={1.75} />}
          title={t("auth.email_verified_title")}
          description={t("auth.redirect_info")}
        >
          <a
            href={EMAIL_REDIRECT_NATIVE}
            className="text-[13px] text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            {t("auth.open_app_fallback")}
          </a>
        </AuthStatus>
      )}
    </AuthShell>
  );
}
