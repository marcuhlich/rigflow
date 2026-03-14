import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const githubToken = Deno.env.get("GITHUB_TOKEN"); // ← Deno, nicht process.env

  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "RigFlow-App",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    if (githubToken) {
      headers["Authorization"] = `token ${githubToken}`;
    }

    const res = await fetch(
      "https://api.github.com/repos/marcuhlich/rigflow-desktop/releases/latest",
      { headers }
    );

    if (!res.ok) {
      let errorMessage = "Fehler beim Abrufen der Release-Daten";
      if (res.status === 401) errorMessage = "GitHub Token ungültig";
      else if (res.status === 403) errorMessage = "Keine Berechtigung – Token braucht 'repo' Scope";
      else if (res.status === 404) errorMessage = "Repository oder Release nicht gefunden";

      return new Response(JSON.stringify({ error: errorMessage }), {
        status: res.status,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    const data = await res.json();

    return new Response(
      JSON.stringify({
        version: data.tag_name,
        fileName: data.assets[0]?.name ?? null,
        fileSize: data.assets[0]?.size ?? null,
        downloadUrl: data.assets[0]?.browser_download_url ?? null,
        releaseUrl: data.html_url ?? "",
        notes: data.body ?? "",
      }),
      { headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Serverfehler" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }
});