import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, Loader2, Download, ChevronLeft, KeyRound, ShieldCheck, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

function getAuthErrorMessage(rawMessage: string): string {
  const map: Record<string, string> = {
    "Email rate limit exceeded": "Zu viele Versuche. Bitte warte einen Moment.",
    "Email not confirmed": "Bitte bestätige zuerst deine E-Mail-Adresse.",
    "Invalid login credentials": "E-Mail oder Passwort ist falsch.",
  };
  for (const [key, value] of Object.entries(map)) {
    if (rawMessage.includes(key)) return value;
  }
  return "Ein unbekannter Fehler ist aufgetreten. Bitte versuche es erneut.";
}

const authSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(6, "Passwort muss mindestens 6 Zeichen lang sein"),
});

// ─── Logo Header ──────────────────────────────────────────────────────────────

const LogoHeader = () => (
  <div className="flex items-center justify-center gap-3 mb-8">
    <div className="p-2.5 rounded-xl bg-primary/10 pulse-glow">
      <img src="/logo-transparent.png" className="h-7 w-7 text-primary" />
    </div>
    <div className="text-center">
      <h1 className="text-2xl font-bold tracking-tight">
        RigFlow <span className="gradient-text">Inventory</span>
      </h1>
    </div>
  </div>
);

// ─── Step 1: Email + Password ─────────────────────────────────────────────────

interface LoginStepProps {
  onMfaRequired: () => void;
  onSuccess: () => void;
}

const LoginStep = ({ onMfaRequired, onSuccess }: LoginStepProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const { signIn } = useAuth();
  const { toast } = useToast();

  const validateForm = () => {
    try {
      authSchema.parse({ email, password });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: { email?: string; password?: string } = {};
        error.errors.forEach((err) => {
          if (err.path[0] === "email") fieldErrors.email = err.message;
          if (err.path[0] === "password") fieldErrors.password = err.message;
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast({
          title: "Fehler",
          description: getAuthErrorMessage(error.message),
          variant: "destructive",
        });
        return;
      }
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const has2FA = (factors?.totp?.length ?? 0) > 0;

      if (has2FA) {
        onMfaRequired();
      } else {
        toast({ title: "Willkommen zurück!", description: "Du wurdest erfolgreich angemeldet." });
        onSuccess();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <h2 className="text-xl font-semibold text-center mb-2">Anmelden</h2>
      <p className="text-sm text-muted-foreground text-center mb-6">
        Melde dich an um dein Equipment zu verwalten
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-Mail</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
            <Input
              id="email"
              type="email"
              placeholder="name@beispiel.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 glass-input"
              required
            />
          </div>
          {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Passwort</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              Passwort vergessen?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10 glass-input"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" />Bitte warten...</>
          ) : "Anmelden"}
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">oder</span>
        </div>
      </div>

      <div className="mt-6 text-center">
        <Link to="/register" className="text-sm text-primary font-medium hover:underline">
          Noch kein Konto? Registrieren.
        </Link>
      </div>
      <div className="mt-4 text-center">
        <Link to="/install" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <Download className="h-3.5 w-3.5" />
          App installieren
        </Link>
      </div>
    </>
  );
};

// ─── Step 2: TOTP + Recovery ──────────────────────────────────────────────────

interface MfaStepProps {
  onSuccess: (method: "totp" | "recovery") => void;
  onBack: () => void;
}

const MfaStep = ({ onSuccess, onBack }: MfaStepProps) => {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useRecovery, setUseRecovery] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Auto-submit nur bei TOTP
  useEffect(() => {
    if (!useRecovery && code.length === 6) handleVerify();
  }, [code]);

  const switchMode = (recovery: boolean) => {
    setUseRecovery(recovery);
    setCode("");
    setError(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleVerify = async () => {
    if (isLoading) return;
    if (!useRecovery && code.length !== 6) return;
    if (useRecovery && code.length < 11) return;

    setIsLoading(true);
    setError(null);

    try {
      if (useRecovery) {
        // ── Recovery Code Flow ────────────────────────────────────────────
        const { data: { session } } = await supabase.auth.getSession();
        const supabaseUrl = (supabase as any).supabaseUrl as string;
        const supabaseKey = (supabase as any).supabaseKey as string;

        const res = await fetch(`${supabaseUrl}/functions/v1/mfa-recovery-codes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${session?.access_token ?? ""}`,
          },
          body: JSON.stringify({ action: "verify", code }),
        });

        const data = await res.json();

        if (!data.valid) {
          setError("Ungültiger oder bereits verwendeter Code.");
          setCode("");
          inputRef.current?.focus();
          return;
        }

        toast({
          title: "Recovery-Code akzeptiert",
          description: "Bitte richte 2FA neu ein um dein Konto zu schützen.",
        });
        onSuccess("recovery");

      } else {
        // ── TOTP Flow ─────────────────────────────────────────────────────
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const totpFactor = factors?.totp?.[0];
        if (!totpFactor) {
          setError("Kein 2FA-Faktor gefunden.");
          return;
        }
        const { data: challenge, error: challengeError } =
          await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
        if (challengeError || !challenge) {
          setError("Challenge fehlgeschlagen. Bitte erneut versuchen.");
          return;
        }
        const { error: verifyError } = await supabase.auth.mfa.verify({
          factorId: totpFactor.id,
          challengeId: challenge.id,
          code,
        });
        if (verifyError) {
          setError("Falscher Code. Bitte erneut versuchen.");
          setCode("");
          inputRef.current?.focus();
        } else {
          toast({ title: "Willkommen zurück!", description: "Du wurdest erfolgreich angemeldet." });
          onSuccess("totp");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex justify-center mb-6">
        <div className={`p-4 rounded-2xl border ${useRecovery ? "bg-amber-500/10 border-amber-500/20" : "bg-primary/10 border-primary/20"}`}>
          {useRecovery
            ? <LifeBuoy className="h-8 w-8 text-amber-500" />
            : <ShieldCheck className="h-8 w-8 text-primary" />
          }
        </div>
      </div>

      <h2 className="text-xl font-semibold text-center mb-2">
        {useRecovery ? "Recovery-Code" : "Zwei-Faktor-Code"}
      </h2>
      <p className="text-sm text-muted-foreground text-center mb-8">
        {useRecovery
          ? "Gib einen deiner gespeicherten Recovery-Codes ein. Er wird danach ungültig."
          : "Gib den 6-stelligen Code aus deiner Authenticator-App ein."}
      </p>

      <div className="space-y-4">
        <div className="relative">
          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
          <Input
            ref={inputRef}
            type="text"
            inputMode={useRecovery ? "text" : "numeric"}
            maxLength={useRecovery ? 11 : 6}
            placeholder={useRecovery ? "XXXXX-XXXXX" : "000000"}
            value={code}
            onChange={(e) => {
              setError(null);
              if (useRecovery) {
                let val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
                // Dash nach 5 Zeichen automatisch einfügen
                if (val.length === 5 && !val.includes("-") && e.target.value.length > code.length) {
                  val += "-";
                }
                setCode(val.slice(0, 11));
              } else {
                setCode(e.target.value.replace(/\D/g, ""));
              }
            }}
            className={`pl-10 glass-input text-center font-mono text-lg ${
              useRecovery ? "tracking-widest uppercase" : "tracking-[0.5em]"
            }`}
          />
        </div>

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        <Button
          className="w-full"
          onClick={handleVerify}
          disabled={
            isLoading ||
            (!useRecovery && code.length !== 6) ||
            (useRecovery && code.length < 11)
          }
        >
          {isLoading ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" />Wird geprüft...</>
          ) : "Bestätigen"}
        </Button>

        {/* Toggle TOTP ↔ Recovery */}
        <button
          onClick={() => switchMode(!useRecovery)}
          className="w-full text-sm text-primary hover:opacity-70 transition-opacity text-center pt-1"
        >
          {useRecovery
            ? "← Zurück zum Authenticator-Code"
            : "Keinen Zugriff auf die App? Recovery-Code verwenden"}
        </button>

        <button
          onClick={onBack}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
        >
          ← Zurück zum Login
        </button>
      </div>
    </>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const Auth = () => {
  const [step, setStep] = useState<"login" | "mfa">("login");
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      if (!loading && user) {
        const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (data?.currentLevel === "aal2") {
          navigate("/install-prompt");
        }
      }
    };
    checkAuth();
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen relative flex justify-center p-4 pt-[calc(env(safe-area-inset-top)+4rem)] sm:items-center sm:pt-4 bg-gradient-to-br from-background via-background to-primary/5">
      {step === "login" && (
        <div className="absolute left-4 top-[calc(env(safe-area-inset-top)+1rem)] z-50">
          <Link
            to="/landing"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="text-sm">Zurück</span>
          </Link>
        </div>
      )}

      <div className="w-full max-w-md animate-scale-in">
        <div className="glass-card p-8">
          <LogoHeader />
          {step === "login" ? (
            <LoginStep
              onMfaRequired={() => setStep("mfa")}
              onSuccess={() => navigate("/install-prompt")}
            />
          ) : (
            <MfaStep
              onSuccess={(method) => {
                if (method === "recovery") {
                  // Nach Recovery-Code-Login direkt zu 2FA-Einstellungen
                  navigate("/settings/privacy-security");
                } else {
                  navigate("/install-prompt");
                }
              }}
              onBack={() => setStep("login")}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;