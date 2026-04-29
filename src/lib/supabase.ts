import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;

// Prefer the newer publishable key format; fall back to anon key
const key =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

// Warn in development but don't crash — on GitHub Pages the env vars come
// from GitHub Secrets baked in at build time. If they're missing the app
// will show auth errors rather than a blank white screen.
if (!url) console.error('Missing env var: VITE_SUPABASE_URL');
if (!key) console.error('Missing env var: VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY or VITE_SUPABASE_ANON_KEY');

export const supabase = createClient(url ?? '', key ?? '', {
  auth: { persistSession: true },
});
