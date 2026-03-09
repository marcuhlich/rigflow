import { useState, useRef, useEffect, useCallback } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";

interface ImageUploadProps {
  currentImageUrl?: string | null;
  onImageChange: (url: string | null) => void;
  className?: string;
}

const PENDING_UPLOAD_KEY = 'pending-image-upload-url';

export function ImageUpload({ currentImageUrl, onImageChange, className }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { user } = useAuth();

  // Clean up pending upload state when the dialog opens with a different/no image
  useEffect(() => {
    sessionStorage.removeItem(PENDING_UPLOAD_KEY);
  }, []);

  useEffect(() => {
    if (currentImageUrl !== undefined) {
      setPreview(currentImageUrl || null);
    }
  }, [currentImageUrl]);

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

  const handleRemove = useCallback(() => {
    setPreview(null);
    onImageChange(null);
    sessionStorage.removeItem(PENDING_UPLOAD_KEY);
  }, [onImageChange]);

  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      style={{ display: 'none', position: 'absolute', pointerEvents: 'none' }}
      onChange={handleFileSelect}
    />
  );

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
            className="absolute top-1 right-1 h-7 w-7 p-0"
            onClick={handleRemove}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full gap-1.5 h-9 text-xs"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Bild auswählen
        </Button>
      )}
      {typeof document !== 'undefined' && createPortal(fileInput, document.body)}
    </div>
  );
}
