// src/hooks/useLatestRelease.ts
import { useState, useEffect } from "react";
import { logger } from "@/lib/logger";

export interface ReleaseInfo {
  version: string;
  downloadUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  releaseUrl: string;
}

interface UseLatestReleaseResult {
  release: ReleaseInfo | null;
  loading: boolean;
  error: string | null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const SUPABASE_API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/latestRelease`;

export function useLatestRelease(): UseLatestReleaseResult {
  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchLatestRelease() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(SUPABASE_API_URL, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Fehler beim Abrufen der Release-Daten (${response.status})`);
        }

        const data: ReleaseInfo & { error?: string } = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }
        if (controller.signal.aborted) return;

        setRelease({
          version: data.version,
          downloadUrl: data.downloadUrl,
          fileName: data.fileName,
          fileSize: data.fileSize,
          releaseUrl: data.releaseUrl,
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        logger.error("useLatestRelease", "Failed to fetch latest release", err);
        setError(err instanceof Error ? err.message : "Fehler beim Abrufen der Release-Daten");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetchLatestRelease();
    return () => controller.abort();
  }, []);

  return { release, loading, error };
}

export { formatFileSize };