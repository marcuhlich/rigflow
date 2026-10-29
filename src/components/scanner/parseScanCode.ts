import { decodeQRPayload, extractItemId } from "@/lib/qrPayload";

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const UUID_EXACT_RE = new RegExp(`^${UUID_RE.source}$`, "i");

/**
 * Extracts an item id from any supported QR content:
 * - JSON payload (`{"v":1,"id":"…"}`)
 * - bare UUID
 * - URL containing the id (e.g. `/item/<uuid>` or `/inventory/<uuid>`)
 * Returns null when no valid item id is found.
 */
export function parseScanCode(raw: string): string | null {
  const content = raw.trim();
  if (!content) return null;

  const payload = decodeQRPayload(content);
  const id = typeof payload?.id === "string" ? extractItemId(payload).trim() : "";
  if (UUID_EXACT_RE.test(id)) return id.toLowerCase();

  // URLs or other wrappers that contain an id
  if (/^https?:\/\//i.test(content) || content.startsWith("/")) {
    const match = content.match(UUID_RE);
    if (match) return match[0].toLowerCase();
  }
  return null;
}

/** Short, human-friendly representation of an item id for display. */
export const shortId = (id: string) => id.slice(0, 8);
