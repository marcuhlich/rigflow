import { useState, useCallback } from "react";

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

export function useGoogleSheets() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OAuth Popup öffnen und access_token holen
  const getAccessToken = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SHEETS_SCOPE,
        callback: (response: any) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response.access_token);
          }
        },
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
      const spreadsheetId = sheet.spreadsheetId;
      const spreadsheetUrl = sheet.spreadsheetUrl;

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
      await fetch(
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

      // 4. Header formatieren (fett + Hintergrundfarbe)
      await fetch(
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
                  range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
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
                  dimensions: { sheetId: 0, dimension: "COLUMNS", startIndex: 0, endIndex: 6 },
                },
              },
            ],
          }),
        }
      );

      // Sheet in neuem Tab öffnen
      window.open(spreadsheetUrl, "_blank");

      return spreadsheetUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      setError(message);
      throw err;
    } finally {
      setIsExporting(false);
    }
  }, [getAccessToken]);

  return { exportToSheets, isExporting, error };
}