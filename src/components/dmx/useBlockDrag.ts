import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import type { PatchplanRow } from "@/lib/dmxPatchplan";
import { logger } from "@/lib/logger";
import { DMX_UNIVERSE_SIZE } from "@/components/dmx/dmxFormat";

interface DragSession {
  row: PatchplanRow;
  startX: number;
  trackWidth: number;
}

/**
 * Desktop drag-to-repatch: drag a block horizontally along its universe track.
 * The new start address is committed on mouseup via `onCommit`.
 */
export function useBlockDrag(onCommit?: (row: PatchplanRow, newAddress: number) => Promise<void>) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [previewAddr, setPreviewAddr] = useState<number | null>(null);

  const sessionRef = useRef<DragSession | null>(null);
  const previewRef = useRef<number | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanupRef.current?.();
    };
  }, []);

  const startDrag = useCallback((e: ReactMouseEvent, row: PatchplanRow, track: HTMLElement) => {
    if (!commitRef.current || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    sessionRef.current = { row, startX: e.clientX, trackWidth: track.getBoundingClientRect().width || 1 };
    previewRef.current = row.startAddress;
    setDraggingId(row.id);
    setPreviewAddr(row.startAddress);

    const onMove = (me: MouseEvent) => {
      const s = sessionRef.current;
      if (!s) return;
      const delta = Math.round(((me.clientX - s.startX) / s.trackWidth) * DMX_UNIVERSE_SIZE);
      const next = Math.max(1, Math.min(DMX_UNIVERSE_SIZE - s.row.channels + 1, s.row.startAddress + delta));
      if (next !== previewRef.current) {
        previewRef.current = next;
        setPreviewAddr(next);
      }
    };

    const onUp = () => {
      cleanup();
      const s = sessionRef.current;
      const finalAddr = previewRef.current;
      sessionRef.current = null;
      previewRef.current = null;
      if (mountedRef.current) {
        setDraggingId(null);
        setPreviewAddr(null);
      }
      if (s && finalAddr !== null && finalAddr !== s.row.startAddress && commitRef.current) {
        commitRef.current(s.row, finalAddr).catch((err) => logger.error("DMXTimeline", "Drag commit failed", err));
      }
    };

    const cleanup = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      cleanupRef.current = null;
    };

    cleanupRef.current?.();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    cleanupRef.current = cleanup;
  }, []);

  return { draggingId, previewAddr, startDrag, canDrag: !!onCommit };
}
