import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Loader2, ChevronLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({
          title: "Fehler",
          description: "E-Mail konnte nicht gesendet werden. Bitte versuche es erneut.",
          variant: "destructive",
        });
      } else {
        setSent(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex justify-center p-4 pt-[calc(env(safe-area-inset-top)+4rem)] sm:items-center sm:pt-4 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="absolute left-4 top-[calc(env(safe-area-inset-top)+1rem)] z-50">
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="text-sm">Zurück zum Login</span>
        </Link>
      </div>

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

          {sent ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
              <h2 className="text-xl font-semibold">E-Mail gesendet!</h2>
              <p className="text-sm text-muted-foreground">
                Wir haben dir einen Link zum Zurücksetzen deines Passworts an{" "}
                <span className="font-medium text-foreground">{email}</span> gesendet.
                Bitte überprüfe auch deinen Spam-Ordner.
              </p>
              <Button variant="outline" className="w-full mt-4" asChild>
                <Link to="/auth">Zurück zum Login</Link>
              </Button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-center mb-2">Passwort vergessen?</h2>
              <p className="text-sm text-muted-foreground text-center mb-6">
                Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum Zurücksetzen.
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
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Wird gesendet...
                    </>
                  ) : (
                    "Link senden"
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

export default ForgotPassword;