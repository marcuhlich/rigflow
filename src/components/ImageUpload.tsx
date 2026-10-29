import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ImagePlus, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { isNative } from '@/services/platform';
import { pickImage } from '@/services/native';

interface ImageUploadProps {
  currentImageUrl?: string | null;
  onImageChange: (url: string | null) => void;
  className?: string;
}

const PENDING_UPLOAD_KEY = 'pending-image-upload-url';

export function ImageUpload({ currentImageUrl, onImageChange, className }: ImageUploadProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  // Local preview (object URL) while an upload is running
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    sessionStorage.removeItem(PENDING_UPLOAD_KEY);
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Release object URLs once they are no longer shown
  useEffect(() => {
    if (!localPreview) return;
    return () => URL.revokeObjectURL(localPreview);
  }, [localPreview]);

  const preview = localPreview ?? currentImageUrl ?? null;

  const uploadFile = useCallback(async (file: File, objectUrl: string) => {
    if (!user) return;
    setLocalPreview(objectUrl);
    setUploading(true);
    try {
      let ext = file.name.split('.').pop()?.toLowerCase();
      if (!ext || ext === file.name.toLowerCase()) ext = 'jpg';
      const fileName = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('item-images')
        .upload(fileName, file, { contentType: file.type || 'image/jpeg' });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('item-images').getPublicUrl(fileName);
      sessionStorage.setItem(PENDING_UPLOAD_KEY, publicUrl);
      onImageChange(publicUrl);
    } catch (err) {
      logger.error('ImageUpload', 'Upload failed', err);
      toast({ title: t('common.error'), description: t('image_upload.error'), variant: 'destructive' });
    } finally {
      // Fall back to the parent's URL (the new one on success, the old one on failure)
      if (mountedRef.current) {
        setLocalPreview(null);
        setUploading(false);
      }
    }
  }, [user, onImageChange, toast, t]);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    void uploadFile(file, URL.createObjectURL(file));
  };

  const handlePick = async () => {
    if (!isNative()) {
      fileInputRef.current?.click();
      return;
    }
    try {
      const result = await pickImage();
      if (result) void uploadFile(result.file, result.objectUrl);
    } catch (err) {
      logger.error('ImageUpload', 'Native image pick failed', err);
    }
  };

  const handleRemove = () => {
    onImageChange(null);
    sessionStorage.removeItem(PENDING_UPLOAD_KEY);
  };

  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={handleFileSelect}
    />
  );

  return (
    <div className={cn('space-y-2', className)}>
      {preview ? (
        <>
          <div className="relative overflow-hidden rounded-md border border-border bg-surface-sunken">
            <img
              src={preview}
              alt={t('image_upload.preview_alt')}
              className="aspect-[4/3] w-full object-cover"
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handlePick}
              disabled={uploading}
            >
              <RefreshCw />
              {t('image_upload.replace')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={handleRemove}
              disabled={uploading}
              aria-label={t('image_upload.remove')}
              title={t('image_upload.remove')}
            >
              <Trash2 />
            </Button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={handlePick}
          disabled={uploading || !user}
          className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border-strong bg-background text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {t('image_upload.select_button')}
        </button>
      )}
      {typeof document !== 'undefined' && createPortal(fileInput, document.body)}
    </div>
  );
}
