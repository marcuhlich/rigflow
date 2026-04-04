// src/hooks/useExportUserData.ts
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useExportUserData() {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const exportData = async () => {
    setIsExporting(true);
    try {
      // Token direkt aus localStorage – umgeht den getSession()-Bug
      const storageKey = "sb-ntatlzrkxbrarejhwozt-auth-token";
      const stored = localStorage.getItem(storageKey);
      const token = stored ? JSON.parse(stored)?.access_token : null;

      if (!token) throw new Error("Nicht angemeldet");

      const supabaseUrl = (supabase as any).supabaseUrl as string;
      const supabaseKey = (supabase as any).supabaseKey as string;

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
      URL.revokeObjectURL(url);

      toast({ title: "Export erfolgreich", description: "Deine Daten wurden als JSON heruntergeladen." });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      toast({ title: "Export fehlgeschlagen", description: message, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  return { exportData, isExporting };
}