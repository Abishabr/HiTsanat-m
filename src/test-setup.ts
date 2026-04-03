// Provide stub Supabase env vars so supabase.ts can be imported in tests
// without throwing "Missing env var" errors.
import { vi } from 'vitest';

// Set env vars before any module imports them
Object.defineProperty(import.meta, 'env', {
  value: {
    ...import.meta.env,
    VITE_SUPABASE_URL: 'https://test.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    VITE_DEMO_MODE: 'true',
  },
  writable: true,
});

// Mock the supabase module so tests don't make real network calls
vi.mock('./lib/supabase', () => {
  const mockSubscription = { unsubscribe: vi.fn() };
  const mockAuth = {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: mockSubscription } }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  };
  return {
    supabase: {
      auth: mockAuth,
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ data: [], error: null }),
        insert: vi.fn().mockReturnValue({ data: [], error: null }),
        update: vi.fn().mockReturnValue({ data: [], error: null }),
        delete: vi.fn().mockReturnValue({ data: [], error: null }),
      }),
      channel: vi.fn().mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(),
      }),
      removeChannel: vi.fn(),
    },
  };
});
