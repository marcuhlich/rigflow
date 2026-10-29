// src/hooks/useExportUserData.ts
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

/** Storage key used by supabase-js: sb-<project-ref>-auth-token */
function readStoredToken(supabaseUrl: string): string | null {
  try {
    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
    const stored = localStorage.getItem(`sb-${projectRef}-auth-token`);
    return stored ? (JSON.parse(stored)?.access_token ?? null) : null;
  } catch {
    return null;
  }
}

/**
 * getSession() can hang in some PWA states – race it against a short timeout
 * and fall back to the token persisted in localStorage.
 */
async function getAccessToken(supabaseUrl: string): Promise<string | null> {
  try {
    const result = await Promise.race([
      supabase.auth.getSession(),
      new Promise<null>(resolve => setTimeout(() => resolve(null), 3000)),
    ]);
    const token = result?.data.session?.access_token;
    if (token) return token;
  } catch (error) {
    logger.warn("useExportUserData", "getSession failed, falling back to stored token", error);
  }
  return readStoredToken(supabaseUrl);
}

export function useExportUserData() {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const exportData = async () => {
    setIsExporting(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

      const token = await getAccessToken(supabaseUrl);
      if (!token) throw new Error("Nicht angemeldet");

      const response = await fetch(
        `${supabaseUrl}/functions/v1/export-user-data`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: supabaseKey,
          },
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${response.status}`);
      }

      const json = await response.json();
      const blob = new Blob([JSON.stringify(json, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `rigflow-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Revoke later – revoking synchronously can abort the download in Safari/WebViews
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      toast({ title: "Export erfolgreich", description: "Deine Daten wurden als JSON heruntergeladen." });
    } catch (err: unknown) {
      logger.error("useExportUserData", "Export failed", err);
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      toast({ title: "Export fehlgeschlagen", description: message, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  return { exportData, isExporting };
}