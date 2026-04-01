import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const passwordSchema = z
  .object({
    password: z.string().min(6, "Passwort muss mindestens 6 Zeichen lang sein"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwörter stimmen nicht überein",
    path: ["confirm"],
  });

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [sessionReady, setSessionReady] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  // Supabase sends the user back with an access_token in the URL hash.
  // We need to wait for the SIGNED_IN event that fires automatically.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const validate = () => {
    try {
      passwordSchema.parse({ password, confirm });
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: { password?: string; confirm?: string } = {};
        err.errors.forEach((e) => {
          if (e.path[0] === "password") fieldErrors.password = e.message;
          if (e.path[0] === "confirm") fieldErrors.confirm = e.message;
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast({
          title: "Fehler",
          description: "Passwort konnte nicht geändert werden. Bitte fordere einen neuen Link an.",
          variant: "destructive",
        });
      } else {
        setDone(true);
        setTimeout(() => navigate("/auth"), 3000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex justify-center p-4 pt-[calc(env(safe-area-inset-top)+4rem)] sm:items-center sm:pt-4 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="w-full max-w-md animate-scale-in">
        <div className="glass-card p-8">
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

          {done ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
              <h2 className="text-xl font-semibold">Passwort geändert!</h2>
              <p className="text-sm text-muted-foreground">
                Du wirst in wenigen Sekunden zum Login weitergeleitet…
              </p>
            </div>
          ) : !sessionReady ? (
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Link wird überprüft…</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-center mb-2">Neues Passwort</h2>
              <p className="text-sm text-muted-foreground text-center mb-6">
                Gib dein neues Passwort ein.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Neues Passwort</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 glass-input"
                      required
                    />
                  </div>
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm">Passwort bestätigen</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                    <Input
                      id="confirm"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="pl-10 glass-input"
                      required
                    />
                  </div>
                  {errors.confirm && <p className="text-sm text-destructive">{errors.confirm}</p>}
                </div>

                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? "Passwörter verbergen" : "Passwörter anzeigen"}
                </button>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Bitte warten...
                    </>
                  ) : (
                    "Passwort speichern"
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;