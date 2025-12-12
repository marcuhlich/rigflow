import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Zap, Mail, Lock, User, Loader2, Download, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

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
              description: error.message,
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
              description: error.message,
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      {/* Back Button */}
      <div className="absolute top-4 left-4">
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
              <Zap className="h-7 w-7 text-primary" />
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
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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

        {/* Info */}
        <div className="mt-6 text-center text-xs text-muted-foreground">
          <p>💡 Tipp: Registriere dich zuerst, dann zeigen wir dir wie die App installiert wird</p>
        </div>
      </div>
    </div>
  );
};

export default Auth;