// src/hooks/useMaintenanceRecords.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MaintenanceRecord } from '@/types/maintenance';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/logger';

// ── Canvas-based image compressor ─────────────────────────────────────────────
// Ziel: < 200 KB je Bild (Freeplan Supabase Storage)
async function compressImage(file: File, maxWidth = 1200, quality = 0.65): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale  = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas 2D context not available')); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
        'image/jpeg',
        quality,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Image could not be decoded'));
    };
    img.src = objectUrl;
  });
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useMaintenanceRecords(itemId: string) {
  const { user } = useAuth();
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError  ] = useState<string | null>(null);

  const db = supabase;

  // Guards against out-of-order responses (item switch) and updates after unmount
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchRecords = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const isCurrent = () => mountedRef.current && requestId === requestIdRef.current;
    if (!itemId) {
      setRecords([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: err } = await db
      .from('maintenance_records')
      .select('*')
      .eq('item_id', itemId)
      .order('performed_at', { ascending: false })
      .order('created_at',   { ascending: false });

    if (!isCurrent()) return;
    if (err) {
      logger.error('useMaintenanceRecords', 'Failed to load maintenance records', err, { itemId });
      setError(err.message);
    } else {
      setError(null);
      setRecords((data ?? []) as MaintenanceRecord[]);
    }
    setLoading(false);
  }, [itemId, db]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // ── Sort helper (descending by date, then by created_at) ──────────────────
  function sortDesc(arr: MaintenanceRecord[]): MaintenanceRecord[] {
    return [...arr].sort(
      (a, b) =>
        b.performed_at.localeCompare(a.performed_at) ||
        b.created_at.localeCompare(a.created_at),
    );
  }

  // ── Add ───────────────────────────────────────────────────────────────────
  async function addRecord(
    payload: Omit<MaintenanceRecord, 'id' | 'user_id' | 'created_at'>,
  ): Promise<{ data: MaintenanceRecord | null; error: string | null }> {
    if (!user) return { data: null, error: 'Not authenticated' };

    const { data, error: err } = await db
      .from('maintenance_records')
      .insert({ ...payload, user_id: user.id })
      .select()
      .single();

    if (err) {
      logger.error('useMaintenanceRecords', 'Failed to add maintenance record', err);
      return { data: null, error: err.message };
    }

    const record = data as MaintenanceRecord;
    setRecords(prev => sortDesc([...prev, record]));
    return { data: record, error: null };
  }

  // ── Update (used to patch image_url after upload) ─────────────────────────
  async function updateRecord(
    id: string,
    patch: Partial<Pick<MaintenanceRecord, 'image_url' | 'notes' | 'cost'>>,
  ): Promise<{ error: string | null }> {
    const { error: err } = await db
      .from('maintenance_records')
      .update(patch)
      .eq('id', id);

    if (err) logger.error('useMaintenanceRecords', 'Failed to update maintenance record', err);
    else setRecords(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
    return { error: err?.message ?? null };
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function deleteRecord(id: string): Promise<{ error: string | null }> {
    const { error: err } = await db
      .from('maintenance_records')
      .delete()
      .eq('id', id);

    if (err) logger.error('useMaintenanceRecords', 'Failed to delete maintenance record', err);
    else setRecords(prev => prev.filter(r => r.id !== id));
    return { error: err?.message ?? null };
  }

  // ── Upload photo → compressed JPEG → Supabase Storage → public URL ────────
  async function uploadPhoto(file: File, recordId: string): Promise<string | null> {
    try {
      const blob = await compressImage(file);
      const path = `maintenance/${recordId}/${Date.now()}.jpg`;

      const { error: uploadErr } = await supabase.storage
        .from('item-images')
        .upload(path, blob, { contentType: 'image/jpeg' });

      if (uploadErr) {
        logger.error('useMaintenanceRecords', 'Photo upload failed', uploadErr);
        return null;
      }

      const { data } = supabase.storage.from('item-images').getPublicUrl(path);
      return data.publicUrl;
    } catch (e) {
      logger.error('useMaintenanceRecords', 'Photo compression/upload error', e);
      return null;
    }
  }

  return {
    records,
    loading,
    error,
    addRecord,
    updateRecord,
    deleteRecord,
    uploadPhoto,
    refresh: fetchRecords,
  };
}