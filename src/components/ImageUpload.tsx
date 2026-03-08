import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  currentImageUrl?: string | null;
  onImageChange: (url: string | null) => void;
  className?: string;
}

// We store pending file in a module-level variable so it survives React re-renders
// that happen when the mobile camera app returns and the page "reloads"
let pendingFile: File | null = null;
let pendingPreview: string | null = null;

export function ImageUpload({ currentImageUrl, onImageChange, className }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  // On mount, check if there's a pending file from before the page "reloaded"
  useEffect(() => {
    if (pendingPreview) {
      setPreview(pendingPreview);
    }
    if (pendingFile && user && !uploading) {
      const file = pendingFile;
      pendingFile = null;
      const cachedPreview = pendingPreview;
      pendingPreview = null;
      uploadFile(file).then(() => {
        // preview is set inside uploadFile
      });
    }
  }, [user]);

  // Sync with prop changes
  useEffect(() => {
    if (currentImageUrl !== undefined) {
      setPreview(currentImageUrl || null);
    }
  }, [currentImageUrl]);

  const uploadFile = useCallback(async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      // Determine extension, default to jpg for camera captures
      let ext = file.name.split('.').pop()?.toLowerCase();
      if (!ext || ext === file.name.toLowerCase()) ext = 'jpg';
      const fileName = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('item-images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('item-images')
        .getPublicUrl(fileName);

      setPreview(publicUrl);
      onImageChange(publicUrl);
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  }, [user, onImageChange]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview immediately using object URL (faster than FileReader)
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    // Store in module-level vars in case the page reloads (mobile camera)
    pendingFile = file;
    pendingPreview = objectUrl;

    // Upload right away
    uploadFile(file).then(() => {
      pendingFile = null;
      pendingPreview = null;
    });

    // Reset the input so the same file can be re-selected
    e.target.value = '';
  }, [uploadFile]);

  const handleRemove = useCallback(() => {
    setPreview(null);
    onImageChange(null);
    pendingFile = null;
    pendingPreview = null;
  }, [onImageChange]);

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
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            Kamera
          </Button>
        </div>
      )}

      {/* File picker - placed outside any conditional rendering */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
      {/* Camera capture - using capture="environment" for back camera */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
