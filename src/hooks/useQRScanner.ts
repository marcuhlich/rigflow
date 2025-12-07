import { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import jsQR from 'jsqr';

export interface QRScannerResult {
  itemId: string;
  isValid: boolean;
}

/**
 * Hook für QR-Code Scanning mit HTML5 Camera API
 * Nutzt jsQR Bibliothek für Dekodierung
 */
export function useQRScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const isScanningRef = useRef(false);
  const { toast } = useToast();

  /**
   * Startet den Kamera-Stream
   */
  const startScanning = useCallback(async () => {
    try {
      setError(null);

      // Prüfe Browser-Unterstützung
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Kamera wird von diesem Browser nicht unterstützt');
      }

      // Fordere Kamerazugriff an
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Rückkamera auf Mobilgeräten
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (!videoRef.current) {
        throw new Error('Video-Element nicht gefunden');
      }

      videoRef.current.srcObject = stream;
      streamRef.current = stream;

      // Starte Scanning, wenn Video geladen ist
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play();
        setIsScanning(true);
        isScanningRef.current = true;
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Kamera konnte nicht geöffnet werden';
      setError(errorMessage);
      setIsScanning(false);
      isScanningRef.current = false;
      toast({
        title: 'Fehler',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [toast]);

  /**
   * Stoppt den Kamera-Stream
   */
  const stopScanning = useCallback(() => {
    setIsScanning(false);
    isScanningRef.current = false;

    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  /**
   * Scanne einen Frame und suche nach QR-Code
   */
  const scanFrame = useCallback(
    (onScan: (result: QRScannerResult) => void): void => {
      if (!videoRef.current || !canvasRef.current || !isScanningRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      // Warte bis Video Dimensionen hat
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        if (isScanningRef.current) {
          animationIdRef.current = requestAnimationFrame(() => scanFrame(onScan));
        }
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.drawImage(video, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Verwende jsQR für QR-Code Dekodierung
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code) {
        // QR-Code gefunden!
        const result = code.data;
        const isValidId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          result
        );

        onScan({ itemId: result, isValid: isValidId });

        if (isValidId) {
          toast({
            title: 'Erfolg',
            description: `Item gescannt: ${result.slice(0, 8)}...`,
          });
        } else {
          toast({
            title: 'Warnung',
            description: 'QR-Code gescannt, aber keine gültige Item-ID',
            variant: 'destructive',
          });
        }
        return; // Stop scanning after successful scan
      }

      // Weiter scannen
      if (isScanningRef.current) {
        animationIdRef.current = requestAnimationFrame(() => scanFrame(onScan));
      }
    },
    [toast]
  );

  // Cleanup bei Unmount
  useEffect(() => {
    return () => {
      isScanningRef.current = false;
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
    };
  }, []);

  return {
    videoRef,
    canvasRef,
    isScanning,
    error,
    startScanning,
    stopScanning,
    scanFrame,
  };
}

/**
 * Alternativer Hook für QR-Scanning ohne Kamera
 * Ermöglicht manuelles Eingeben oder Upload von QR-Code Bildern
 */
export function useQRInput() {
  const [itemId, setItemId] = useState('');
  const [isValid, setIsValid] = useState(false);
  const { toast } = useToast();

  const validateItemId = useCallback((id: string) => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const valid = uuidRegex.test(id);
    setIsValid(valid);
    return valid;
  }, []);

  const handleInputChange = useCallback((value: string) => {
    setItemId(value);
    if (value.trim()) {
      validateItemId(value.trim());
    } else {
      setIsValid(false);
    }
  }, [validateItemId]);

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent<HTMLInputElement>) => {
      const text = e.clipboardData.getData('text');
      if (text) {
        handleInputChange(text);
      }
    },
    [handleInputChange]
  );

  const handleImageUpload = useCallback(
    async (file: File) => {
      try {
        // Einfache Implementierung für Demo
        // Für echte QR-Code Dekodierung: jsQR oder ähnliche Bibliothek verwenden
        toast({
          title: 'Info',
          description: 'QR-Code Bild-Upload wird in dieser Version nicht unterstützt. Bitte scannen Sie mit der Kamera oder geben Sie die ID manuell ein.',
        });
      } catch (error) {
        toast({
          title: 'Fehler',
          description: 'Bild konnte nicht verarbeitet werden',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  const clear = useCallback(() => {
    setItemId('');
    setIsValid(false);
  }, []);

  return {
    itemId,
    isValid,
    handleInputChange,
    handlePaste,
    handleImageUpload,
    validateItemId,
    clear,
  };
}
