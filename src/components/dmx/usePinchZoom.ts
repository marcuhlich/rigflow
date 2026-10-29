import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

/** Attribute marking the horizontally scrollable track container a pinch acts on. */
export const DMX_SCROLL_ATTR = "data-dmx-scroll";

/**
 * Two-finger pinch zoom for the DMX timeline (mobile). Listeners are attached
 * natively (non-passive touchmove) so the browser's own page zoom is suppressed.
 * The pinch midpoint stays anchored by adjusting the scroll container's scrollLeft.
 */
export function usePinchZoom(enabled: boolean) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoomState] = useState(MIN_ZOOM);
  const zoomRef = useRef(MIN_ZOOM);
  const pendingScrollRef = useRef<{ el: HTMLElement; left: number } | null>(null);

  const setZoom = useCallback((v: number) => {
    zoomRef.current = v;
    setZoomState(v);
  }, []);

  // Re-position the scroll container after the zoomed layout is committed
  useLayoutEffect(() => {
    const pending = pendingScrollRef.current;
    if (pending) {
      pending.el.scrollLeft = pending.left;
      pendingScrollRef.current = null;
    }
  }, [zoom]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!enabled || !wrapper) return;

    const distance = (a: Touch, b: Touch) => Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);

    let pinching = false;
    let startDist = 1;
    let startScale = MIN_ZOOM;
    let startMidX = 0;
    let startScrollLeft = 0;
    let container: HTMLElement | null = null;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      pinching = true;
      startDist = distance(e.touches[0], e.touches[1]) || 1;
      startScale = zoomRef.current;
      startMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      container = (e.target as HTMLElement).closest<HTMLElement>(`[${DMX_SCROLL_ATTR}]`);
      startScrollLeft = container?.scrollLeft ?? 0;
    };

    const onMove = (e: TouchEvent) => {
      if (!pinching || e.touches.length !== 2) return;
      e.preventDefault();
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, startScale * (distance(e.touches[0], e.touches[1]) / startDist)));

      if (container) {
        const rect = container.getBoundingClientRect();
        const pinchRelX = startMidX - rect.left;
        const anchor = startScrollLeft + pinchRelX;
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const pan = midX - startMidX;
        pendingScrollRef.current = {
          el: container,
          left: Math.max(0, anchor * (next / startScale) - pinchRelX - pan),
        };
      }
      setZoom(next);
    };

    const onEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinching = false;
        container = null;
      }
    };

    wrapper.addEventListener("touchstart", onStart, { passive: true });
    wrapper.addEventListener("touchmove", onMove, { passive: false });
    wrapper.addEventListener("touchend", onEnd, { passive: true });
    wrapper.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      wrapper.removeEventListener("touchstart", onStart);
      wrapper.removeEventListener("touchmove", onMove);
      wrapper.removeEventListener("touchend", onEnd);
      wrapper.removeEventListener("touchcancel", onEnd);
    };
  }, [enabled, setZoom]);

  // Reset zoom when pinch gets disabled (e.g. rotating to desktop width)
  useEffect(() => {
    if (!enabled) setZoom(MIN_ZOOM);
  }, [enabled, setZoom]);

  return { wrapperRef, zoom, setZoom, resetZoom: () => setZoom(MIN_ZOOM) };
}
