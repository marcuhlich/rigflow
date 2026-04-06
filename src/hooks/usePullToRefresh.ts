import { useRef, useState, useCallback } from "react";

interface Options {
  onRefresh: () => Promise<void> | void;
  threshold?: number; // px zum Auslösen
  disabled?: boolean;
}

export function usePullToRefresh({ onRefresh, threshold = 72, disabled = false }: Options) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const pullDistanceRef = useRef(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    // Nur auslösen wenn ganz oben
    if (window.scrollY > 0) return;
    startY.current = e.touches[0].clientY;
    pulling.current = true;
  }, [disabled, isRefreshing]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current || disabled || isRefreshing) return;
    if (window.scrollY > 0) {
        pulling.current = false;
        // Indicator direkt zurücksetzen
        if (indicatorRef.current) indicatorRef.current.style.height = "0px";
        return;
    }

    const dy = e.touches[0].clientY - startY.current;
    if (dy < 0) {
        pullDistanceRef.current = 0;
        if (indicatorRef.current) indicatorRef.current.style.height = "0px";
        return;
    }

    const dist = Math.min(dy * 0.45, threshold * 1.3);
    pullDistanceRef.current = dist;

    // Direkt ins DOM schreiben — kein Re-render
    if (indicatorRef.current) {
        indicatorRef.current.style.height = `${dist}px`;
        indicatorRef.current.style.opacity = `${Math.min(dist / threshold, 1)}`;
    }
    }, [disabled, isRefreshing, threshold]);

  const onTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      setPullDistance(threshold); // eingerastet
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, threshold, onRefresh]);

  return { pullDistance, isRefreshing, onTouchStart, onTouchMove, onTouchEnd };
}