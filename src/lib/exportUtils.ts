import { InventoryItem } from '@/types/inventory';
import { PatchplanRow } from '@/lib/dmxPatchplan';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// CSV Export for Inventory
export function exportInventoryAsCSV(items: InventoryItem[]): string {
  const headers = [
    'Name',
    'Kategorie',
    'Menge',
    'Zustand',
    'Standort',
    'Stückpreis',
    'Verliehen an',
    'Verliehen bis',
    'DMX Universe',
    'DMX Start',
    'DMX Kanäle',
    'Notizen',
  ];

  const rows = items.map(item => [
    item.name,
    item.category,
    item.quantity.toString(),
    item.condition,
    item.location,
    item.unit_price?.toString() || '',
    item.lent_to || '',
    item.lent_until || '',
    item.dmx_universe?.toString() || '',
    item.dmx_start_address?.toString() || '',
    item.dmx_channels?.toString() || '',
    item.notes || '',
  ]);

  return [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
}

// PDF Export for Inventory
export function exportInventoryAsPDF(items: InventoryItem[]): void {
  const doc = new jsPDF('l', 'mm', 'a4');
  
  doc.setFontSize(18);
  doc.text('Inventarliste', 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Erstellt am ${new Date().toLocaleDateString('de-DE')}`, 14, 30);

  const tableData = items.map(item => [
    item.name,
    item.category,
    item.quantity.toString(),
    item.condition,
    item.location,
    item.unit_price ? `${item.unit_price.toFixed(2)} €` : '-',
    item.notes?.substring(0, 30) || '-',
  ]);

  autoTable(doc, {
    head: [['Name', 'Kategorie', 'Menge', 'Zustand', 'Standort', 'Preis', 'Notizen']],
    body: tableData,
    startY: 35,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [59, 130, 246] },
  });

  doc.save(`inventar-${new Date().toISOString().split('T')[0]}.pdf`);
}

// CSV Export for Patchplan (reusing existing function pattern)
export function exportPatchplanCSV(rows: PatchplanRow[]): string {
  const headers = [
    'Name',
    'Instanz',
    'Universe',
    'Start-Adresse',
    'End-Adresse',
    'Kanäle',
    'Standort',
    'Zustand',
  ];

  const data = rows.map(row => [
    row.itemName,
    row.instanceNumber.toString(),
    row.universe.toString(),
    row.startAddress.toString(),
    row.endAddress.toString(),
    row.channels.toString(),
    row.location,
    row.condition,
  ]);

  return [headers.join(';'), ...data.map(r => r.join(';'))].join('\n');
}

// PDF Export for Patchplan
export function exportPatchplanAsPDF(rows: PatchplanRow[]): void {
  const doc = new jsPDF('l', 'mm', 'a4');
  
  doc.setFontSize(18);
  doc.text('DMX Patchplan', 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Erstellt am ${new Date().toLocaleDateString('de-DE')}`, 14, 30);

  const tableData = rows.map(row => [
    row.itemName,
    `#${row.instanceNumber}`,
    `U${row.universe}`,
    row.startAddress.toString(),
    row.endAddress.toString(),
    row.channels.toString(),
    row.location,
    row.condition,
  ]);

  autoTable(doc, {
    head: [['Name', 'Instanz', 'Universe', 'Start', 'Ende', 'Kanäle', 'Standort', 'Zustand']],
    body: tableData,
    startY: 35,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [59, 130, 246] },
  });

  doc.save(`dmx-patchplan-${new Date().toISOString().split('T')[0]}.pdf`);
}

// Helper to download CSV
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Event Set Packing List PDF
export function exportEventSetPDF(set: { name: string; description?: string | null; event_date_start?: string | null; event_date_end?: string | null; notes?: string | null; items: { item_name?: string; item_category?: string; item_location?: string; quantity: number; available_quantity?: number }[] }): void {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text(`Packliste: ${set.name}`, 14, 20);
  
  let y = 28;
  doc.setFontSize(10);
  if (set.description) {
    doc.text(set.description, 14, y);
    y += 6;
  }
  if (set.event_date_start) {
    const dateStr = set.event_date_start + (set.event_date_end ? ` – ${set.event_date_end}` : '');
    doc.text(`Datum: ${dateStr}`, 14, y);
    y += 6;
  }
  if (set.notes) {
    doc.text(`Notizen: ${set.notes}`, 14, y);
    y += 6;
  }
  y += 4;

  const headers = [['✓', 'Artikel', 'Kategorie', 'Standort', 'Menge', 'Verfügbar']];
  const rows = set.items.map(i => [
    '☐',
    i.item_name || 'Unbekannt',
    i.item_category || '',
    i.item_location || '',
    i.quantity.toString(),
    (i.available_quantity ?? 0).toString(),
  ]);

  autoTable(doc, {
    startY: y,
    head: headers,
    body: rows,
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [60, 60, 60] },
  });

  doc.save(`packliste-${set.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`);
}
