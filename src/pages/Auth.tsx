import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Zap, Mail, Lock, User, Loader2, Download, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { lovable } from "@/integrations/lovable/index";
import { z } from "zod";

function getAuthErrorMessage(rawMessage: string): string {
  const map: Record<string, string> = {
    "Email rate limit exceeded": "Zu viele Versuche. Bitte warte einen Moment.",
    "Email not confirmed": "Bitte bestätige zuerst deine E-Mail-Adresse.",
    "Invalid login credentials": "E-Mail oder Passwort ist falsch.",
    "User already registered": "Diese E-Mail-Adresse ist bereits registriert.",
    "Signup requires a valid password": "Bitte gib ein gültiges Passwort ein.",
    "Password should be at least 6 characters": "Passwort muss mindestens 6 Zeichen lang sein.",
  };
  for (const [key, value] of Object.entries(map)) {
    if (rawMessage.includes(key)) return value;
  }
  return "Ein unbekannter Fehler ist aufgetreten. Bitte versuche es erneut.";
}

const authSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(6, "Passwort muss mindestens 6 Zeichen lang sein"),
  displayName: z.string().optional(),
});

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(searchParams.get("step") !== "register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && user) {
      // Nach erfolgreichem Login/Register - gehe zu Install Prompt
      navigate("/install-prompt");
    }
  }, [user, loading, navigate]);

  const validateForm = () => {
    try {
      authSchema.parse({ email, password, displayName });
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
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({
              title: "Anmeldung fehlgeschlagen",
              description: "E-Mail oder Passwort ist falsch.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Fehler",
              description: getAuthErrorMessage(error.message),
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Willkommen zurück!",
            description: "Du wurdest erfolgreich angemeldet.",
          });
          // Navigation erfolgt automatisch über useEffect
        }
      } else {
        const { error } = await signUp(email, password, displayName);
        if (error) {
          if (error.message.includes("User already registered")) {
            toast({
              title: "Registrierung fehlgeschlagen",
              description: "Diese E-Mail-Adresse ist bereits registriert.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Fehler",
              description: getAuthErrorMessage(error.message),
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Konto erstellt!",
            description: "Dein Konto wurde erfolgreich erstellt.",
          });
          // Navigation erfolgt automatisch über useEffect
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex justify-center p-4 pt-[calc(env(safe-area-inset-top)+4rem)] sm:items-center sm:pt-4 bg-gradient-to-br from-background via-background to-primary/5">
      {/* Back Button */}
      <div className="absolute left-4 top-[calc(env(safe-area-inset-top)+1rem)] z-50">
        <Link
          to="/landing"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="text-sm">Zurück</span>
        </Link>
      </div>

      <div className="w-full max-w-md animate-scale-in">
        <div className="glass-card p-8">
          {/* Header */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="p-2.5 rounded-xl bg-primary/10 pulse-glow">
              <img src="/logo-transparent.png" className="h-7 w-7 text-primary"/>
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight">
                RigFlow <span className="gradient-text">Inventory</span>
              </h1>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-center mb-2">
            {isLogin ? "Anmelden" : "Registrieren"}
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-6">
            {isLogin 
              ? "Melde dich an um dein Equipment zu verwalten"
              : "Erstelle ein Konto um RigFlow zu nutzen"
            }
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="displayName">Name (optional)</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Dein Name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="pl-10 glass-input"
                  />
                </div>
              </div>
            )}

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
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 glass-input"
                  required
                />
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Bitte warten...
                </>
              ) : isLogin ? (
                "Anmelden"
              ) : (
                "Registrieren & Installieren"
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">oder</span>
            </div>
          </div>

          {/* Social Sign-In */}
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              disabled={isGoogleLoading}
              onClick={async () => {
                setIsGoogleLoading(true);
                try {
                  const { error } = await lovable.auth.signInWithOAuth("google", {
                    redirect_uri: window.location.origin,
                  });
                  if (error) {
                    toast({
                      title: "Fehler",
                      description: "Google-Anmeldung fehlgeschlagen. Bitte versuche es erneut.",
                      variant: "destructive",
                    });
                  }
                } finally {
                  setIsGoogleLoading(false);
                }
              }}
            >
              {isGoogleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              Mit Google anmelden
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              disabled={isGoogleLoading}
              onClick={async () => {
                setIsGoogleLoading(true);
                try {
                  const { error } = await lovable.auth.signInWithOAuth("apple", {
                    redirect_uri: window.location.origin,
                  });
                  if (error) {
                    toast({
                      title: "Fehler",
                      description: "Apple-Anmeldung fehlgeschlagen. Bitte versuche es erneut.",
                      variant: "destructive",
                    });
                  }
                } finally {
                  setIsGoogleLoading(false);
                }
              }}
            >
              {isGoogleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
              )}
              Mit Apple anmelden
            </Button>
          </div>


          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrors({});
                setEmail("");
                setPassword("");
                setDisplayName("");
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin ? (
                <>
                  Noch kein Konto?{" "}
                  <span className="text-primary font-medium">Registrieren</span>
                </>
              ) : (
                <>
                  Bereits registriert?{" "}
                  <span className="text-primary font-medium">Anmelden</span>
                </>
              )}
            </button>
          </div>

          {isLogin && (
            <div className="mt-4 text-center">
              <Link
                to="/install"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                App installieren
              </Link>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Auth;