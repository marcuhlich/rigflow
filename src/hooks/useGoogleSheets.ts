import { useState, useCallback } from "react";
import { logger } from "@/lib/logger";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

interface InventoryRow {
  name: string;
  category?: string;
  quantity?: number;
  status?: string;
  location?: string;
  notes?: string;
  [key: string]: unknown;
}

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleTokenClient {
  requestAccessToken: () => void;
}

interface GoogleIdentityServices {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (response: GoogleTokenResponse) => void;
        error_callback?: (error: { type?: string; message?: string }) => void;
      }) => GoogleTokenClient;
    };
  };
}

export function useGoogleSheets() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OAuth Popup öffnen und access_token holen
  const getAccessToken = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      const google = (window as Window & { google?: GoogleIdentityServices }).google;
      if (!google?.accounts?.oauth2) {
        reject(new Error("Google-Anmeldung ist nicht verfügbar (Skript nicht geladen)"));
        return;
      }
      if (!GOOGLE_CLIENT_ID) {
        reject(new Error("Google Client-ID fehlt"));
        return;
      }
      const client = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SHEETS_SCOPE,
        callback: (response) => {
          if (response.error || !response.access_token) {
            reject(new Error(response.error_description || response.error || "Kein Zugriffstoken erhalten"));
          } else {
            resolve(response.access_token);
          }
        },
        // Popup closed / blocked – otherwise the promise would never settle
        error_callback: (err) => reject(new Error(err?.message || err?.type || "Google-Anmeldung abgebrochen")),
      });
      client.requestAccessToken();
    });
  }, []);

  // Neues Sheet erstellen und Daten einfügen
  const exportToSheets = useCallback(async (inventory: InventoryRow[], sheetTitle?: string) => {
    setIsExporting(true);
    setError(null);

    try {
      const accessToken = await getAccessToken();

      const title = sheetTitle ?? `RigFlow Export – ${new Date().toLocaleDateString("de-DE")}`;

      // 1. Spreadsheet erstellen
      const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties: { title },
          sheets: [{ properties: { title: "Inventar" } }],
        }),
      });

      if (!createRes.ok) throw new Error("Spreadsheet konnte nicht erstellt werden");
      const sheet = await createRes.json();
      const spreadsheetId: string = sheet.spreadsheetId;
      const spreadsheetUrl: string = sheet.spreadsheetUrl;
      // The generated sheet id is not guaranteed to be 0
      const sheetId: number = sheet.sheets?.[0]?.properties?.sheetId ?? 0;

      // 2. Header + Daten vorbereiten
      const headers = ["Name", "Kategorie", "Menge", "Status", "Standort", "Notizen"];
      const rows = inventory.map((item) => [
        item.name ?? "",
        item.category ?? "",
        item.quantity ?? "",
        item.status ?? "",
        item.location ?? "",
        item.notes ?? "",
      ]);
      const values = [headers, ...rows];

      // 3. Daten einfügen
      const valuesRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Inventar!A1:F${values.length}?valueInputOption=RAW`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ values }),
        }
      );
      if (!valuesRes.ok) throw new Error("Daten konnten nicht in das Spreadsheet geschrieben werden");

      // 4. Header formatieren (fett + Hintergrundfarbe) – rein kosmetisch, Fehler nicht fatal
      const formatRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requests: [
              {
                repeatCell: {
                  range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
                  cell: {
                    userEnteredFormat: {
                      backgroundColor: { red: 0.2, green: 0.83, blue: 0.6 },
                      textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                    },
                  },
                  fields: "userEnteredFormat(backgroundColor,textFormat)",
                },
              },
              {
                autoResizeDimensions: {
                  dimensions: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: 6 },
                },
              },
            ],
          }),
        }
      );

      if (!formatRes.ok) logger.warn("useGoogleSheets", "Header formatting failed", { status: formatRes.status });

      // Sheet in neuem Tab öffnen
      window.open(spreadsheetUrl, "_blank");

      return spreadsheetUrl;
    } catch (err) {
      logger.error("useGoogleSheets", "Export to Google Sheets failed", err);
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      setError(message);
      throw err;
    } finally {
      setIsExporting(false);
    }
  }, [getAccessToken]);

  return { exportToSheets, isExporting, error };
}