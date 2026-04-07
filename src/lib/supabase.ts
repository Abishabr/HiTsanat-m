import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;

// Prefer the newer publishable key format; fall back to anon key
const key =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url) throw new Error('Missing env var: VITE_SUPABASE_URL');
if (!key) throw new Error('Missing env var: VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY or VITE_SUPABASE_ANON_KEY');

export const supabase = createClient(url, key, {
  auth: { persistSession: true },
});
