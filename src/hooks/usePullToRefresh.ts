import { useRef, useState, useCallback } from "react";

interface Options {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  disabled?: boolean;
}

export function usePullToRefresh({ onRefresh, threshold = 72, disabled = false }: Options) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pulling = useRef(false);
  const distRef = useRef(0);

  const setIndicator = useCallback((dist: number) => {
    distRef.current = dist;
    if (!indicatorRef.current) return;
    indicatorRef.current.style.height = `${dist}px`;
    indicatorRef.current.style.opacity = `${Math.min(dist / threshold, 1)}`;
  }, [threshold]);

  const reset = useCallback(() => {
    pulling.current = false;
    distRef.current = 0;
    if (indicatorRef.current) {
      indicatorRef.current.style.transition = "height 0.3s cubic-bezier(0.34,1.56,0.64,1)";
      indicatorRef.current.style.height = "0px";
      indicatorRef.current.style.opacity = "0";
    }
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    startY.current = e.touches[0].clientY;
    pulling.current = true;
    // Transition entfernen während des Ziehens
    if (indicatorRef.current) {
      indicatorRef.current.style.transition = "none";
    }
  }, [disabled, isRefreshing]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current || disabled || isRefreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy <= 0) {
      // Negativ = nach oben scrollen → Indicator ausblenden aber pulling NICHT abbrechen
      setIndicator(0);
      return;
    }
    setIndicator(Math.min(dy * 0.45, threshold * 1.3));
  }, [disabled, isRefreshing, threshold, setIndicator]);

  const onTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    const dist = distRef.current;
    pulling.current = false;

    if (dist >= threshold) {
      if (indicatorRef.current) {
        indicatorRef.current.style.transition = "height 0.2s ease";
        indicatorRef.current.style.height = `${threshold}px`;
      }
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        reset();
      }
    } else {
      reset();
    }
  }, [threshold, onRefresh, reset]);

  // Wichtig: TouchCancel abfangen (Android feuert das manchmal statt TouchEnd)
  const onTouchCancel = useCallback(() => {
    reset();
  }, [reset]);

  return { indicatorRef, isRefreshing, onTouchStart, onTouchMove, onTouchEnd, onTouchCancel };
}