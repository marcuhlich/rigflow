import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { MfaForm } from "@/components/auth/MfaForm";
import { getPostLoginRoute } from "@/components/auth/authUtils";

const Auth = () => {
  const [step, setStep] = useState<"login" | "mfa">("login");
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Already signed in with the required assurance level: skip the form.
  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    supabase.auth.mfa
      .getAuthenticatorAssuranceLevel()
      .then(({ data }) => {
        if (cancelled || !data) return;
        const requiredLevel = data.nextLevel === "aal2" ? "aal2" : "aal1";
        if (data.currentLevel === requiredLevel) navigate(getPostLoginRoute(), { replace: true });
        else setStep("mfa");
      })
      .catch(() => {
        // Stay on the login form; the user can sign in again.
      });
    return () => {
      cancelled = true;
    };
  }, [user, loading, navigate]);

  const backToLogin = async () => {
    // Drop the half-authenticated (aal1) session so it can't linger.
    await supabase.auth.signOut().catch(() => undefined);
    setStep("login");
  };

  return (
    <AuthShell back={step === "login" ? { to: "/landing", label: t("common.back") } : undefined}>
      {step === "login" ? (
        <LoginForm onMfaRequired={() => setStep("mfa")} onSuccess={() => navigate(getPostLoginRoute())} />
      ) : (
        <MfaForm
          onSuccess={(method) => navigate(method === "recovery" ? "/settings/privacy-security" : getPostLoginRoute())}
          onBack={backToLogin}
        />
      )}
    </AuthShell>
  );
};

export default Auth;
