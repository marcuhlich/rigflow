// src/components/EmailVerifiedListener.tsx  ← eigene Datei empfohlen
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner'; // oder dein Toast-System

export function EmailVerifiedListener() {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'USER_UPDATED' && session?.user?.email_confirmed_at) {
        toast.success('E-Mail bestätigt – Willkommen bei RigFlow! 🎉', {
          description: 'Dein Lager ist eingerichtet und bereit.',
          duration: 6000,
        });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return null;
}