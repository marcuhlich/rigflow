import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScanRevealOverlay
 *
 * Einbindung im Dashboard:
 *   import { ScanRevealOverlay } from '@/components/ScanRevealOverlay';
 *   // Einfach irgendwo im Dashboard-JSX einfügen:
 *   <ScanRevealOverlay />
 *
 * Wird nur aktiv wenn navigate('/', { state: { scanReveal: true } }) aufgerufen wurde.
 * Nach Abschluss entfernt es sich selbst.
 */
export function ScanRevealOverlay() {
  const location = useLocation();
  const state = location.state as { scanReveal?: boolean; userName?: string } | null;

  const [active, setActive] = useState(false);
  const [done, setDone] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (state?.scanReveal) {
      // Small delay so dashboard has rendered
      const t = setTimeout(() => setActive(true), 80);
      return () => clearTimeout(t);
    }
  }, [state?.scanReveal]);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    startRef.current = performance.now();

    // Total animation: 2.8s scan + 0.6s fade-out
    const SCAN_DURATION = 2800;
    const FADE_DURATION = 600;
    const TOTAL = SCAN_DURATION + FADE_DURATION;

    function draw(now: number) {
      const elapsed = now - startRef.current;
      const t = Math.min(elapsed / SCAN_DURATION, 1);

      // Ease-in-out for the scan line
      const scanY = easeInOut(t) * H;

      ctx!.clearRect(0, 0, W, H);

      if (elapsed < SCAN_DURATION) {
        // Black overlay above the scan line (fades as scan progresses)
        const overlayOpacity = Math.max(0, 0.92 - t * 0.92);
        ctx!.fillStyle = `rgba(2,4,8,${overlayOpacity})`;
        ctx!.fillRect(0, 0, W, H);

        // Scan line glow (wide soft band)
        const bandH = 48;
        const bandGrad = ctx!.createLinearGradient(0, scanY - bandH, 0, scanY + bandH);
        bandGrad.addColorStop(0, 'rgba(0,229,255,0)');
        bandGrad.addColorStop(0.4, `rgba(0,229,255,${0.12 * Math.sin(Math.PI * t)})`);
        bandGrad.addColorStop(0.5, `rgba(0,229,255,${0.22 * Math.sin(Math.PI * t)})`);
        bandGrad.addColorStop(0.6, `rgba(0,229,255,${0.12 * Math.sin(Math.PI * t)})`);
        bandGrad.addColorStop(1, 'rgba(0,229,255,0)');
        ctx!.fillStyle = bandGrad;
        ctx!.fillRect(0, scanY - bandH, W, bandH * 2);

        // Hard bright core line
        const lineOpacity = 0.85 * Math.sin(Math.PI * t);
        ctx!.save();
        ctx!.beginPath();
        ctx!.moveTo(0, scanY);
        ctx!.lineTo(W, scanY);
        ctx!.strokeStyle = `rgba(140,255,255,${lineOpacity})`;
        ctx!.lineWidth = 1.5;
        ctx!.shadowColor = 'rgba(0,229,255,0.9)';
        ctx!.shadowBlur = 12;
        ctx!.stroke();
        ctx!.restore();

        // "Already revealed" area: subtle cyan tint below line
        if (t > 0.02) {
          const revealGrad = ctx!.createLinearGradient(0, scanY, 0, scanY + 80);
          revealGrad.addColorStop(0, `rgba(0,229,255,${0.04 * Math.sin(Math.PI * t)})`);
          revealGrad.addColorStop(1, 'rgba(0,229,255,0)');
          ctx!.fillStyle = revealGrad;
          ctx!.fillRect(0, scanY, W, 80);
        }
      }

      // Fade out after scan completes
      if (elapsed >= SCAN_DURATION && elapsed < TOTAL) {
        const fadeT = (elapsed - SCAN_DURATION) / FADE_DURATION;
        ctx!.fillStyle = `rgba(2,4,8,${0 * fadeT})`; // already transparent, just let it linger
        // Flash of cyan at the bottom to signal "done"
        if (fadeT < 0.3) {
          const flashOpacity = (0.3 - fadeT) / 0.3 * 0.15;
          ctx!.fillStyle = `rgba(0,229,255,${flashOpacity})`;
          ctx!.fillRect(0, H - 80, W, 80);
        }
      }

      if (elapsed < TOTAL) {
        rafRef.current = requestAnimationFrame(draw);
      } else {
        setDone(true);
      }
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active]);

  if (!active || done) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    />
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}