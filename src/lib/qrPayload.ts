/**
 * QR-Code Payload System - strukturierte Daten für QR-Codes
 * Erlaubt Encoding von vollständigen Item-Informationen
 */
import { InventoryItem } from '@/types/inventory';

export interface QRPayload {
  v: 1; // version
  id: string; // Item-ID
  n: string; // name
  c: string; // category
  s: string; // status/condition
  loc?: string; // location
  q?: number; // quantity
  dmx?: {
    addr?: number;
    uni?: number;
    ch?: number;
  };
}

/**
 * Encodiert Item-Daten in einen kompakten QR-Payload
 */
export function encodeQRPayload(item: InventoryItem): string {
  const payload: QRPayload = {
    v: 1,
    id: item.id,
    n: item.name.substring(0, 50), // Limit name length
    c: item.category,
    s: item.condition,
    loc: item.location,
    q: item.quantity,
    dmx: item.dmx_start_address ? {
      addr: item.dmx_start_address,
      uni: item.dmx_universe ?? undefined,
      ch: item.dmx_channels ?? undefined,
    } : undefined,
  };

  // Entferne undefined Felder
  (Object.keys(payload) as (keyof QRPayload)[]).forEach(key => {
    if (payload[key] === undefined) delete payload[key];
  });

  return JSON.stringify(payload);
}

/**
 * Decodiert QR-Code Inhalt zurück zu strukturierten Daten
 */
export function decodeQRPayload(content: string): QRPayload | { id: string } {
  try {
    // Versuche als JSON zu parsen (neue Format)
    const trimmed = content.trim();
    if (trimmed.startsWith('{')) {
      const parsed: unknown = JSON.parse(trimmed);
      // Malformed JSON objects without an id fall back to the raw content
      if (isValidQRPayload(parsed)) return parsed;
      return { id: trimmed };
    }
    // Fallback: Alte Format (nur UUID)
    return { id: content.trim() };
  } catch {
    // Fallback: Behandle als UUID
    return { id: content.trim() };
  }
}

/**
 * Extrahiert die Item-ID aus jedem Format
 */
export function extractItemId(payload: QRPayload | { id: string }): string {
  return payload.id;
}

/**
 * Validiert einen QR-Payload
 */
export function isValidQRPayload(payload: unknown): payload is QRPayload | { id: string } {
  return !!payload && typeof payload === 'object' && typeof (payload as { id?: unknown }).id === 'string';
}

/**
 * Erstellt eine kompakte URL-Representation für QR-Code
 * Für Fallback zu Web-Link wenn QR-Reader das JSON nicht versteht
 */
export function getQRFallbackURL(itemId: string): string {
  return `${window.location.origin}/item/${itemId}`;
}
