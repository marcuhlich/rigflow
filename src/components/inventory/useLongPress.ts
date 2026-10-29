import { useCallback, useEffect, useRef } from "react";
import { hapticFeedback } from "@/lib/utils";

const LONG_PRESS_MS = 500;
const MOVE_TOLERANCE_PX = 8;

/**
 * Touch long-press detection. Returns pointer handlers to spread on an element
 * and `consumeLongPress()` which tells a click handler to ignore the click that
 * follows a completed long press.
 */
export function useLongPress(onLongPress: (id: string) => void, disabled = false) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);
  const callback = useRef(onLongPress);

  useEffect(() => {
    callback.current = onLongPress;
  }, [onLongPress]);

  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    start.current = null;
  }, []);

  useEffect(() => cancel, [cancel]);

  const bind = useCallback(
    (id: string) => ({
      onPointerDown: (e: React.PointerEvent) => {
        if (disabled || e.pointerType === "mouse") return;
        fired.current = false;
        start.current = { x: e.clientX, y: e.clientY };
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          fired.current = true;
          timer.current = null;
          hapticFeedback(30);
          callback.current(id);
        }, LONG_PRESS_MS);
      },
      onPointerMove: (e: React.PointerEvent) => {
        if (!start.current) return;
        const dx = Math.abs(e.clientX - start.current.x);
        const dy = Math.abs(e.clientY - start.current.y);
        if (dx > MOVE_TOLERANCE_PX || dy > MOVE_TOLERANCE_PX) cancel();
      },
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
      onContextMenu: (e: React.MouseEvent) => {
        // Suppress the native touch callout so the long press is ours.
        if (fired.current || timer.current) e.preventDefault();
      },
    }),
    [cancel, disabled]
  );

  const consumeLongPress = useCallback(() => {
    if (!fired.current) return false;
    fired.current = false;
    return true;
  }, []);

  return { bind, consumeLongPress };
}
