import { Camera, CameraPermissionType } from '@capacitor/camera';
import { isNative } from '@/services/platform';

export async function pickImage(): Promise<{ objectUrl: string; file: File } | null> {
  if (!isNative()) return null;

  const image = await Camera.pickImages({
    quality: 90,
    limit: 1,
  });

  const picked = image.photos?.[0];
  if (!picked?.webPath) return null;

  // webPath in echtes File-Objekt umwandeln für Supabase-Upload
  const response = await fetch(picked.webPath);
  const blob = await response.blob();
  const ext = picked.format ?? 'jpeg';
  const file = new File([blob], `upload.${ext}`, {
    type: blob.type || `image/${ext}`,
  });

  return { objectUrl: picked.webPath, file };
}

export async function requestCameraPermission(): Promise<boolean> {
  if (!isNative()) return true;

  const permissions = await Camera.requestPermissions({
    permissions: ['camera', 'photos'] as CameraPermissionType[],
  });

  return (
    permissions.camera === 'granted' &&
    permissions.photos === 'granted'
  );
}