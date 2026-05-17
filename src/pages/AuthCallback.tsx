import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const error = params.get("error");
      const errorDescription = params.get("error_description");

      if (error) {
        console.error("Auth error:", errorDescription);
        navigate(`/auth?error=${encodeURIComponent(errorDescription ?? error)}`, { replace: true });
        return;
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.error("Code exchange failed:", exchangeError.message);
          navigate("/auth?error=link_expired", { replace: true });
          return;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      navigate(session ? "/" : "/auth", { replace: true });
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}