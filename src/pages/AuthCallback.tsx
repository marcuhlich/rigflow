import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setStatus('error');
          return;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setStatus('success');
        setTimeout(() => navigate("/", { replace: true }), 1500);
      } else {
        setStatus('error');
      }
    };

    handleCallback();
  }, [navigate]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <p className="text-destructive">
          {t("auth.callback_error")}
        </p>
        <a href="/auth" className="text-primary underline">
          {t("auth.back_to_login")}
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-6 p-6 text-center">
      <div className="text-4xl">✅</div>

      <h1 className="text-xl font-bold">
        {t("auth.email_verified_title")}
      </h1>

      <p className="text-muted-foreground">
        {t("auth.redirect_info")}
      </p>

      <a
        href="com.rigflow.app://auth/callback"
        className="text-sm text-primary underline"
      >
        {t("auth.open_app_fallback")}
      </a>
    </div>
  );
}