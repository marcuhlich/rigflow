import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) { setStatus('error'); return; }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setStatus('success');
        // Nach kurzer Pause zur App navigieren
        setTimeout(() => navigate("/", { replace: true }), 1500);
      } else {
        setStatus('error');
      }
    };

    handleCallback();
  }, [navigate]);

  if (status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (status === 'error') return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-4">
      <p className="text-destructive">Link abgelaufen oder ungültig.</p>
      <a href="/auth" className="text-primary underline">Zum Login</a>
    </div>
  );

  // success — im Browser anzeigen mit "In App öffnen"-Option
  return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-6 p-6 text-center">
      <div className="text-4xl">✅</div>
      <h1 className="text-xl font-bold">E-Mail bestätigt!</h1>
      <p className="text-muted-foreground">Du wirst weitergeleitet…</p>
      <a
        href="com.rigflow.app://auth/callback"
        className="text-sm text-primary underline"
      >
        Nicht weitergeleitet? App öffnen
      </a>
    </div>
  );
}