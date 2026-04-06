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

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    // Nur auslösen wenn ganz oben
    if (window.scrollY > 0) return;
    startY.current = e.touches[0].clientY;
    pulling.current = true;
  }, [disabled, isRefreshing]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current || disabled || isRefreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy < 0) { setPullDistance(0); return; }
    // Widerstand simulieren
    setPullDistance(Math.min(dy * 0.45, threshold * 1.3));
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