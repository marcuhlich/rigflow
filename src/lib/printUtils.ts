import { InventoryItem } from '@/types/inventory';
import { PatchplanRow } from '@/lib/dmxPatchplan';

/** Escape user content before interpolating it into print HTML (prevents markup/script injection). */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const printStyles = `
  @page {
    size: A4 landscape;
    margin: 15mm;
  }
  
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 12px;
    line-height: 1.4;
    color: #1a1a1a;
    margin: 0;
    padding: 0;
  }
  
  .print-header {
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 2px solid #333;
  }
  
  .print-header h1 {
    font-size: 24px;
    margin: 0 0 5px 0;
    font-weight: 600;
  }
  
  .print-header .subtitle {
    color: #666;
    font-size: 12px;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
  }
  
  th, td {
    padding: 8px 10px;
    text-align: left;
    border-bottom: 1px solid #ddd;
  }
  
  th {
    background-color: #f5f5f5;
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #555;
  }
  
  tr:nth-child(even) {
    background-color: #fafafa;
  }
  
  .status-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 500;
  }
  
  .status-verfügbar { background: #d1fae5; color: #065f46; }
  .status-verliehen { background: #fef3c7; color: #92400e; }
  .status-in-einsatz { background: #dbeafe; color: #1e40af; }
  .status-defekt { background: #fee2e2; color: #991b1b; }
  
  .print-footer {
    margin-top: 20px;
    padding-top: 10px;
    border-top: 1px solid #ddd;
    font-size: 10px;
    color: #888;
    text-align: center;
  }
  
  .dmx-address {
    font-family: monospace;
    background: #f0f0f0;
    padding: 2px 6px;
    border-radius: 3px;
  }
  
  .conflict-warning {
    background: #fee2e2;
  }
`;

function getStatusClass(condition: string): string {
  const map: Record<string, string> = {
    'verfügbar': 'status-verfügbar',
    'verliehen': 'status-verliehen',
    'in-einsatz': 'status-in-einsatz',
    'defekt': 'status-defekt',
  };
  return map[condition] || '';
}

function getStatusLabel(condition: string): string {
  const map: Record<string, string> = {
    'verfügbar': 'Verfügbar',
    'verliehen': 'Verliehen',
    'in-einsatz': 'In Einsatz',
    'defekt': 'Defekt',
  };
  return map[condition] || condition;
}

export function printInventory(items: InventoryItem[]): void {
  const dateStr = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const rows = items.map(item => `
    <tr>
      <td><strong>${escapeHtml(item.name)}</strong></td>
      <td>${escapeHtml(item.category)}</td>
      <td style="text-align: center;">${item.quantity}</td>
      <td><span class="status-badge ${getStatusClass(item.condition)}">${escapeHtml(getStatusLabel(item.condition))}</span></td>
      <td>${escapeHtml(item.location)}</td>
      <td>${item.unit_price ? `${Number(item.unit_price).toFixed(2)} €` : '-'}</td>
      <td>${escapeHtml(item.lent_to || '-')}</td>
      <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(item.notes || '-')}</td>
    </tr>
  `).join('');

  const totalValue = items.reduce((sum, item) => sum + (item.unit_price || 0) * item.quantity, 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Inventarliste</title>
      <style>${printStyles}</style>
    </head>
    <body>
      <div class="print-header">
        <h1>Inventarliste</h1>
        <div class="subtitle">
          ${items.length} Artikel · ${totalQuantity} Einheiten · Gesamtwert: ${totalValue.toFixed(2)} € · Stand: ${dateStr}
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Kategorie</th>
            <th style="text-align: center;">Menge</th>
            <th>Zustand</th>
            <th>Standort</th>
            <th>Stückpreis</th>
            <th>Verliehen an</th>
            <th>Notizen</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      
      <div class="print-footer">
        Rigflow · Gedruckt am ${dateStr}
      </div>
    </body>
    </html>
  `;

  openPrintWindow(html);
}

export function printPatchplan(rows: PatchplanRow[], conflicts: { row1: PatchplanRow; row2: PatchplanRow }[] = []): void {
  const dateStr = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Get conflict row IDs for highlighting
  const conflictIds = new Set<string>();
  conflicts.forEach(c => {
    conflictIds.add(c.row1.id);
    conflictIds.add(c.row2.id);
  });

  // Group by universe
  const byUniverse = rows.reduce((acc, row) => {
    const u = row.universe;
    if (!acc[u]) acc[u] = [];
    acc[u].push(row);
    return acc;
  }, {} as Record<number, PatchplanRow[]>);

  let tablesHtml = '';
  
  Object.entries(byUniverse)
    .sort(([a], [b]) => Number(a) - Number(b))
    .forEach(([universe, universeRows]) => {
      const usedChannels = universeRows.reduce((sum, r) => sum + r.channels, 0);
      
      const rowsHtml = universeRows
        .sort((a, b) => a.startAddress - b.startAddress)
        .map(row => `
          <tr class="${conflictIds.has(row.id) ? 'conflict-warning' : ''}">
            <td><strong>${escapeHtml(row.itemName)}</strong></td>
            <td>#${row.instanceNumber}</td>
            <td><span class="dmx-address">${row.startAddress}</span></td>
            <td><span class="dmx-address">${row.endAddress}</span></td>
            <td style="text-align: center;">${row.channels}</td>
            <td>${escapeHtml(row.location)}</td>
            <td><span class="status-badge ${getStatusClass(row.condition)}">${escapeHtml(getStatusLabel(row.condition))}</span></td>
          </tr>
        `).join('');

      tablesHtml += `
        <div style="margin-bottom: 25px;">
          <h3 style="margin: 0 0 10px 0; font-size: 14px;">
            Universe ${universe} 
            <span style="font-weight: normal; color: #666; font-size: 12px;">
              (${usedChannels}/512 Kanäle belegt)
            </span>
          </h3>
          <table>
            <thead>
              <tr>
                <th>Gerät</th>
                <th>Instanz</th>
                <th>Start</th>
                <th>Ende</th>
                <th style="text-align: center;">Kanäle</th>
                <th>Standort</th>
                <th>Zustand</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      `;
    });

  const conflictWarning = conflicts.length > 0 ? `
    <div style="background: #fee2e2; border: 1px solid #ef4444; padding: 10px; border-radius: 5px; margin-bottom: 15px;">
      <strong style="color: #991b1b;">⚠️ ${conflicts.length} Adresskonflikt(e) erkannt!</strong>
      <div style="font-size: 11px; color: #991b1b; margin-top: 5px;">
        Markierte Zeilen haben überlappende DMX-Adressen.
      </div>
    </div>
  ` : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>DMX Patchplan</title>
      <style>${printStyles}</style>
    </head>
    <body>
      <div class="print-header">
        <h1>DMX Patchplan</h1>
        <div class="subtitle">
          ${rows.length} Kanal-Zuweisungen · ${Object.keys(byUniverse).length} Universe(s) · Stand: ${dateStr}
        </div>
      </div>
      
      ${conflictWarning}
      ${tablesHtml}
      
      <div class="print-footer">
        Rigflow · DMX Patchplan · Gedruckt am ${dateStr}
      </div>
    </body>
    </html>
  `;

  openPrintWindow(html);
}

function openPrintWindow(html: string): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(html);
  printWindow.document.close();

  // Print exactly once: onload and the fallback timer used to both fire -> two print dialogs
  let printed = false;
  const print = () => {
    if (printed || printWindow.closed) return;
    printed = true;
    printWindow.focus();
    printWindow.print();
  };

  printWindow.onload = print;
  // Fallback for browsers that don't fire onload for document.write content
  setTimeout(print, 500);
}
