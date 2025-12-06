/**
 * Generiert einen QR-Code mit einer externen API (Quick Response API)
 * Der QR-Code enthält die eindeutige Item-ID
 */
export async function generateQRCodeDataUrl(
  itemId: string,
  options?: {
    width?: number;
    margin?: number;
    color?: { dark?: string; light?: string };
  }
): Promise<string> {
  try {
    const width = options?.width || 300;
    const margin = options?.margin || 1;
    const darkColor = (options?.color?.dark || '#000000').replace('#', '');
    const lightColor = (options?.color?.light || '#FFFFFF').replace('#', '');

    // Nutze api.qrserver.com für QR-Code Generierung
    // Dieser Service benötigt keine Installation
    const encodedId = encodeURIComponent(itemId);
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=${width}x${width}&data=${encodedId}&margin=${margin}&color=${darkColor}&bgcolor=${lightColor}`;

    return url;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('QR-Code konnte nicht generiert werden');
  }
}

/**
 * Generiert einen QR-Code als Canvas (für lokale Verarbeitung)
 * Nutzt canvas API zur Erstellung von einfachen QR-ähnlichen Mustern
 * Für vollständige QR-Codes sollte qrcode Bibliothek installiert werden
 */
export async function generateQRCodeCanvas(
  itemId: string,
  canvas: HTMLCanvasElement
): Promise<void> {
  try {
    // Externe Lösung: Lade das QR-Bild und zeichne es auf den Canvas
    const dataUrl = await generateQRCodeDataUrl(itemId);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context nicht verfügbar');

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      canvas.width = 300;
      canvas.height = 300;
      ctx.drawImage(img, 0, 0, 300, 300);
    };

    img.onerror = () => {
      throw new Error('QR-Code Bild konnte nicht geladen werden');
    };

    img.src = dataUrl;
  } catch (error) {
    console.error('Error generating QR code on canvas:', error);
    throw error;
  }
}

/**
 * Lädt einen QR-Code herunter
 */
export async function downloadQRCode(
  itemId: string,
  itemName: string
): Promise<void> {
  try {
    const dataUrl = await generateQRCodeDataUrl(itemId);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `QR-Code-${itemName}-${itemId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error downloading QR code:', error);
    throw error;
  }
}

/**
 * Druckt einen QR-Code
 */
export async function printQRCode(
  itemId: string,
  itemName: string,
  itemDetails?: { quantity?: number; location?: string; category?: string }
): Promise<void> {
  try {
    const dataUrl = await generateQRCodeDataUrl(itemId);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Pop-up konnte nicht geöffnet werden');
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR-Code: ${itemName}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: white;
            }
            .container {
              text-align: center;
              padding: 20px;
              border: 1px solid #ddd;
              border-radius: 8px;
              background: white;
            }
            .qr-code {
              margin: 20px 0;
            }
            .qr-code img {
              max-width: 400px;
              height: auto;
            }
            h2 {
              margin: 10px 0;
              color: #333;
            }
            .details {
              text-align: left;
              font-size: 12px;
              color: #666;
              margin-top: 20px;
              border-top: 1px solid #ddd;
              padding-top: 10px;
            }
            @media print {
              body {
                background: white;
              }
              .container {
                border: none;
                box-shadow: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>${itemName}</h2>
            <div class="qr-code">
              <img src="${dataUrl}" alt="QR-Code for ${itemName}" />
            </div>
            <p style="margin: 10px 0; color: #666; font-size: 12px;">
              ID: ${itemId}
            </p>
            ${
              itemDetails
                ? `
              <div class="details">
                ${itemDetails.category ? `<p><strong>Kategorie:</strong> ${itemDetails.category}</p>` : ''}
                ${itemDetails.quantity ? `<p><strong>Menge:</strong> ${itemDetails.quantity}</p>` : ''}
                ${itemDetails.location ? `<p><strong>Standort:</strong> ${itemDetails.location}</p>` : ''}
              </div>
            `
                : ''
            }
          </div>
          <script>
            window.addEventListener('load', () => {
              setTimeout(() => {
                window.print();
              }, 250);
            });
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  } catch (error) {
    console.error('Error printing QR code:', error);
    throw error;
  }
}

/**
 * Dekodiert einen gescannten QR-Code
 * In diesem Fall ist der Inhalt einfach die Item-ID
 */
export function decodeQRCode(qrContent: string): string {
  // Der QR-Code enthält nur die Item-ID
  return qrContent.trim();
}

/**
 * Validiert ob ein String eine gültige Item-ID ist (UUID)
 */
export function isValidItemId(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Generiert mehrere QR-Codes für Batch-Druck
 */
export async function generateBatchQRCodes(
  items: Array<{ id: string; name: string }>
): Promise<Array<{ id: string; name: string; dataUrl: string }>> {
  const results = [];

  for (const item of items) {
    try {
      const dataUrl = await generateQRCodeDataUrl(item.id);
      results.push({
        id: item.id,
        name: item.name,
        dataUrl,
      });
    } catch (error) {
      console.error(`Error generating QR code for ${item.name}:`, error);
    }
  }

  return results;
}

/**
 * Erstellt ein Druck-Layout für mehrere QR-Codes (z.B. 4x4 Grid)
 */
export async function generateBatchPrintHTML(
  items: Array<{ id: string; name: string; category?: string }>,
  gridCols: number = 4
): Promise<string> {
  const qrCodes = await generateBatchQRCodes(items);

  const rows = [];
  for (let i = 0; i < qrCodes.length; i += gridCols) {
    rows.push(qrCodes.slice(i, i + gridCols));
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>QR-Code Batch Print</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 10px;
            background: white;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(${gridCols}, 1fr);
            gap: 10px;
            margin-bottom: 20px;
          }
          .qr-item {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: center;
            page-break-inside: avoid;
            border-radius: 4px;
          }
          .qr-item img {
            width: 100%;
            height: auto;
            margin-bottom: 5px;
          }
          .qr-item-name {
            font-size: 11px;
            font-weight: bold;
            margin-bottom: 2px;
            word-break: break-word;
          }
          .qr-item-id {
            font-size: 8px;
            color: #666;
            word-break: break-all;
          }
          @media print {
            body {
              margin: 0;
              padding: 5px;
            }
            .grid {
              gap: 5px;
            }
            .qr-item {
              padding: 5px;
            }
          }
        </style>
      </head>
      <body>
        ${rows
          .map(
            row => `
          <div class="grid">
            ${row
              .map(
                item => `
              <div class="qr-item">
                <img src="${item.dataUrl}" alt="QR-Code for ${item.name}" />
                <div class="qr-item-name">${item.name}</div>
                <div class="qr-item-id">${item.id}</div>
              </div>
            `
              )
              .join('')}
          </div>
        `
          )
          .join('')}
        <script>
          window.addEventListener('load', () => {
            setTimeout(() => {
              window.print();
            }, 500);
          });
        </script>
      </body>
    </html>
  `;

  return html;
}
