import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { logger } from "@/lib/logger";

export type CameraStatus = "idle" | "starting" | "scanning" | "error";
export type CameraError = "unsupported" | "denied" | "not_found" | "in_use" | "unknown";

interface Options {
  /** Camera stream runs while enabled. */
  enabled: boolean;
  /** Keep the stream alive but stop decoding (e.g. while a result is shown). */
  paused?: boolean;
  /** Called with the raw QR content. */
  onDecode: (raw: string) => void;
}

/** Decode at most every N ms – plenty for handheld scanning, cheap on battery. */
const DECODE_INTERVAL_MS = 120;
/** Max width of the frame we feed to jsQR. */
const MAX_DECODE_WIDTH = 720;
/** The same code is ignored until it was out of view for this long. */
const SAME_CODE_GAP_MS = 1500;

function classifyError(err: unknown): CameraError {
  const name = err instanceof DOMException || err instanceof Error ? err.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "denied";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "not_found";
  if (name === "NotReadableError" || name === "AbortError") return "in_use";
  return "unknown";
}

/**
 * Camera + jsQR scanning loop.
 * - Stops all tracks on disable/unmount, also when getUserMedia resolves late.
 * - Ignores a code that stays in view, so a held label is not reported twice.
 */
export function useCameraScanner({ enabled, paused = false, onDecode }: Options) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<CameraError | null>(null);
  const [attempt, setAttempt] = useState(0);

  const onDecodeRef = useRef(onDecode);
  const pausedRef = useRef(paused);
  useEffect(() => { onDecodeRef.current = onDecode; }, [onDecode]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return;
    }

    let cancelled = false;
    let stream: MediaStream | null = null;
    let timer: number | undefined;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    let lastCode = "";
    let lastSeenAt = 0;

    const stop = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
      const video = videoRef.current;
      if (video) video.srcObject = null;
    };

    const tick = () => {
      if (cancelled) return;
      const video = videoRef.current;
      // Decoding continues while paused so a code that stays in view is not
      // reported again right after resuming.
      if (video && ctx && video.readyState >= 2 && video.videoWidth > 0) {
        const scale = Math.min(1, MAX_DECODE_WIDTH / video.videoWidth);
        const w = Math.round(video.videoWidth * scale);
        const h = Math.round(video.videoHeight * scale);
        if (canvas.width !== w) canvas.width = w;
        if (canvas.height !== h) canvas.height = h;
        ctx.drawImage(video, 0, 0, w, h);
        const image = ctx.getImageData(0, 0, w, h);
        const code = jsQR(image.data, w, h, { inversionAttempts: "dontInvert" });
        const now = performance.now();
        if (code?.data) {
          const isRepeat = code.data === lastCode && now - lastSeenAt < SAME_CODE_GAP_MS;
          lastCode = code.data;
          lastSeenAt = now;
          if (!isRepeat && !pausedRef.current) onDecodeRef.current(code.data);
        }
      }
      timer = window.setTimeout(tick, DECODE_INTERVAL_MS);
    };

    const start = async () => {
      setError(null);
      setStatus("starting");
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("unsupported");
        setStatus("error");
        return;
      }
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = media;
        const video = videoRef.current;
        if (!video) throw new Error("Video element missing");
        video.srcObject = media;
        await video.play().catch(() => {
          // Autoplay may be blocked until metadata arrives; muted + playsInline usually succeeds later.
        });
        if (cancelled) return;
        setStatus("scanning");
        tick();
      } catch (err) {
        if (cancelled) return;
        logger.error("useCameraScanner", "Camera start failed", err instanceof Error ? err.message : err);
        stop();
        setError(classifyError(err));
        setStatus("error");
      }
    };

    void start();

    return () => {
      cancelled = true;
      stop();
    };
  }, [enabled, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { videoRef, status, error, retry };
}
