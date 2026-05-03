import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { isNative } from '@/services/platform';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: !isNative(), // Auf Native keine URL-Callbacks
    flowType: isNative() ? 'pkce' : 'implicit',
  }
});