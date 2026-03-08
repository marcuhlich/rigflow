import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";

interface ImageUploadProps {
  currentImageUrl?: string | null;
  onImageChange: (url: string | null) => void;
  className?: string;
}

// Session storage key for surviving page reloads on mobile camera
const PENDING_UPLOAD_KEY = 'pending-image-upload-url';

export function ImageUpload({ currentImageUrl, onImageChange, className }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }

    setCameraReady(false);
    setIsCameraOpen(false);
  }, []);

  // On mount, check if a previously uploaded URL was saved (survives page reload)
  useEffect(() => {
    const savedUrl = sessionStorage.getItem(PENDING_UPLOAD_KEY);
    if (savedUrl && !preview) {
      setPreview(savedUrl);
      onImageChange(savedUrl);
      sessionStorage.removeItem(PENDING_UPLOAD_KEY);
    }
  }, []);

  // Sync with prop
  useEffect(() => {
    if (currentImageUrl !== undefined) {
      setPreview(currentImageUrl || null);
    }
  }, [currentImageUrl]);

  // Attach stream once camera modal is visible
  useEffect(() => {
    if (!isCameraOpen || !cameraVideoRef.current || !streamRef.current) return;

    const video = cameraVideoRef.current;
    video.srcObject = streamRef.current;

    const start = async () => {
      try {
        await video.play();
      } catch {
        // no-op
      } finally {
        setCameraReady(true);
      }
    };

    void start();
  }, [isCameraOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const uploadFile = useCallback(async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      let ext = file.name.split('.').pop()?.toLowerCase();
      if (!ext || ext === file.name.toLowerCase()) ext = 'jpg';
      const fileName = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('item-images')
        .upload(fileName, file, { upsert: true, contentType: file.type || 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('item-images')
        .getPublicUrl(fileName);

      setPreview(publicUrl);
      onImageChange(publicUrl);
      // Save to sessionStorage in case page reloads before form is saved
      sessionStorage.setItem(PENDING_UPLOAD_KEY, publicUrl);
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  }, [user, onImageChange]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    void uploadFile(file);
    e.target.value = '';
  }, [uploadFile]);

  const handleOpenCamera = useCallback(async () => {
    if (uploading) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      toast({
        title: "Kamera nicht unterstützt",
        description: "Direkter Kamerazugriff ist hier nicht möglich. Bitte nutze 'Datei'.",
        variant: "destructive",
      });
      return;
    }

    try {
      // IMPORTANT: direct call in button gesture context
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setIsCameraOpen(true);
    } catch (error) {
      console.error('Camera open error:', error);
      toast({
        title: "Kamera konnte nicht geöffnet werden",
        description: "Bitte Browser-Kamerarechte prüfen oder stattdessen 'Datei' nutzen.",
        variant: "destructive",
      });
    }
  }, [uploading, toast]);

  const handleCapturePhoto = useCallback(async () => {
    const video = cameraVideoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.9);
    });

    if (!blob) return;

    const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    stopCamera();
    void uploadFile(file);
  }, [stopCamera, uploadFile]);

  const handleRemove = useCallback(() => {
    setPreview(null);
    onImageChange(null);
    sessionStorage.removeItem(PENDING_UPLOAD_KEY);
  }, [onImageChange]);

  // Render file inputs via portal to document.body so they survive Dialog unmount
  const fileInputs = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      style={{ display: 'none', position: 'absolute', pointerEvents: 'none' }}
      onChange={handleFileSelect}
    />
  );

  const cameraOverlay = isCameraOpen ? (
    <div className="fixed inset-0 z-[1000] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-3">
        <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-border bg-muted">
          <video
            ref={cameraVideoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
          {!cameraReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={stopCamera} disabled={uploading}>
            Abbrechen
          </Button>
          <Button
            type="button"
            className="flex-1 gap-2"
            onClick={handleCapturePhoto}
            disabled={!cameraReady || uploading}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            Foto verwenden
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className={cn("space-y-2", className)}>
      {preview ? (
        <div className="relative group">
          <img
            src={preview}
            alt="Item"
            className="w-full h-32 object-cover rounded-lg border border-border"
          />
          {uploading && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded-lg">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 gap-1 h-9 text-xs"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Datei
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 gap-1 h-9 text-xs"
            onClick={handleOpenCamera}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            Kamera
          </Button>
        </div>
      )}

      {/* Portal file inputs to body so they survive Dialog/Sheet unmount cycles */}
      {typeof document !== 'undefined' && createPortal(fileInputs, document.body)}
      {typeof document !== 'undefined' && cameraOverlay && createPortal(cameraOverlay, document.body)}
    </div>
  );
}

