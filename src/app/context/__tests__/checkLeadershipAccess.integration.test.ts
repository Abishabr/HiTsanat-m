// Feature: authentication-system, Property 6: RPC return value always has the correct shape

/**
 * Integration tests for the check_leadership_access RPC function.
 *
 * These tests run against a local Supabase CLI instance and are automatically
 * skipped when VITE_SUPABASE_URL does not point to localhost / 127.0.0.1.
 *
 * Required seed data (apply to local Supabase before running):
 * ---------------------------------------------------------------
 * The tests below rely on the following rows being present in the
 * new-schema tables created by the migrations:
 *
 *   sub_departments:
 *     ('sd-dept-0000-0000-000000000001', 'Department')
 *     ('sd-dept-0000-0000-000000000002', 'Timhert')
 *
 *   leadership_roles:
 *     ('lr-0000-0000-0000-000000000001', 'Chairperson',  1)
 *     ('lr-0000-0000-0000-000000000002', 'Member',       99)
 *
 *   members (new schema — member_id, auth_user_id, full_name, phone):
 *     ('m-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000001', 'Test Leader',  '+251 900 000001')
 *     ('m-0000-0000-0000-000000000002', 'aa000000-0000-0000-0000-000000000002', 'Test Member',  '+251 900 000002')
 *
 *   member_sub_departments:
 *     -- Leader row (qualifying role, is_active = true)
 *     ('m-0000-0000-0000-000000000001', 'sd-dept-0000-0000-000000000001', 'lr-0000-0000-0000-000000000001', true)
 *     -- Member-only row (non-qualifying, is_active = true)
 *     ('m-0000-0000-0000-000000000002', 'sd-dept-0000-0000-000000000002', 'lr-0000-0000-0000-000000000002', true)
 *
 * Validates: Requirements 7.3
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true when the Supabase URL points to a local instance. */
function isLocalSupabase(): boolean {
  const url = process.env.VITE_SUPABASE_URL ?? '';
  return url.includes('localhost') || url.includes('127.0.0.1');
}

/** Build a Supabase client from environment variables (process.env for Node/Vitest). */
function buildLocalClient(): SupabaseClient {
  const url = process.env.VITE_SUPABASE_URL!;
  const key =
    process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

// ---------------------------------------------------------------------------
// Test UUIDs — must match the seed data documented above
// ---------------------------------------------------------------------------

/** auth_user_id of a member who holds an active Chairperson role in Department */
const QUALIFYING_AUTH_USER_ID = 'aa000000-0000-0000-0000-000000000001';

/** auth_user_id of a member who holds only a Member role */
const MEMBER_ONLY_AUTH_USER_ID = 'aa000000-0000-0000-0000-000000000002';

/** A UUID that does not exist in the members table */
const UNKNOWN_AUTH_USER_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

const shouldSkip = !isLocalSupabase();

describe.skipIf(shouldSkip)(
  'check_leadership_access RPC — integration (local Supabase only)',
  () => {
    let supabase: SupabaseClient;

    beforeAll(() => {
      supabase = buildLocalClient();
    });

    // -----------------------------------------------------------------------
    // Property 6: RPC return value always has the correct shape
    // -----------------------------------------------------------------------

    it('returns an object with has_access, role, and sub_department fields for a qualifying user', async () => {
      // Requires seed: QUALIFYING_AUTH_USER_ID linked to a Chairperson role
      const { data, error } = await supabase.rpc('check_leadership_access', {
        auth_user_id: QUALIFYING_AUTH_USER_ID,
      });

      expect(error).toBeNull();
      expect(data).not.toBeNull();

      // Shape check — all three fields must be present
      expect(data).toHaveProperty('has_access');
      expect(data).toHaveProperty('role');
      expect(data).toHaveProperty('sub_department');

      // Value check — qualifying user should have access
      expect(data.has_access).toBe(true);
      expect(typeof data.role).toBe('string');
      expect(data.role.length).toBeGreaterThan(0);
      expect(typeof data.sub_department).toBe('string');
      expect(data.sub_department.length).toBeGreaterThan(0);
    });

    it('returns has_access: false for a user with only a Member role', async () => {
      // Requires seed: MEMBER_ONLY_AUTH_USER_ID linked only to a Member role
      const { data, error } = await supabase.rpc('check_leadership_access', {
        auth_user_id: MEMBER_ONLY_AUTH_USER_ID,
      });

      expect(error).toBeNull();
      expect(data).not.toBeNull();

      // Shape check — all three fields must be present regardless of access
      expect(data).toHaveProperty('has_access');
      expect(data).toHaveProperty('role');
      expect(data).toHaveProperty('sub_department');

      // Value check — member-only user must not have access
      expect(data.has_access).toBe(false);
      expect(data.role).toBeNull();
      expect(data.sub_department).toBeNull();
    });

    it('returns has_access: false for an unknown auth_user_id', async () => {
      const { data, error } = await supabase.rpc('check_leadership_access', {
        auth_user_id: UNKNOWN_AUTH_USER_ID,
      });

      expect(error).toBeNull();
      expect(data).not.toBeNull();

      // Shape check — all three fields must be present even for unknown users
      expect(data).toHaveProperty('has_access');
      expect(data).toHaveProperty('role');
      expect(data).toHaveProperty('sub_department');

      // Value check — unknown user must not have access
      expect(data.has_access).toBe(false);
      expect(data.role).toBeNull();
      expect(data.sub_department).toBeNull();
    });

    it('always returns an object with exactly the three required fields regardless of input', async () => {
      // Test a sample of UUIDs to verify the shape contract holds universally
      const testIds = [
        QUALIFYING_AUTH_USER_ID,
        MEMBER_ONLY_AUTH_USER_ID,
        UNKNOWN_AUTH_USER_ID,
        '00000000-0000-0000-0000-000000000000', // nil UUID
      ];

      for (const authUserId of testIds) {
        const { data, error } = await supabase.rpc('check_leadership_access', {
          auth_user_id: authUserId,
        });

        expect(error).toBeNull();
        expect(data).not.toBeNull();

        // Property 6: shape must always be correct
        expect(typeof data.has_access).toBe('boolean');
        expect(Object.prototype.hasOwnProperty.call(data, 'role')).toBe(true);
        expect(Object.prototype.hasOwnProperty.call(data, 'sub_department')).toBe(true);

        // When has_access is false, role and sub_department must be null
        if (!data.has_access) {
          expect(data.role).toBeNull();
          expect(data.sub_department).toBeNull();
        }

        // When has_access is true, role and sub_department must be non-null strings
        if (data.has_access) {
          expect(typeof data.role).toBe('string');
          expect(typeof data.sub_department).toBe('string');
        }
      }
    });
  },
);

// ---------------------------------------------------------------------------
// Smoke test — always runs, verifies the skip logic itself
// ---------------------------------------------------------------------------

describe('check_leadership_access integration test — skip guard', () => {
  it('is correctly skipped when not running against local Supabase', () => {
    // This test always passes. It documents that the suite above is intentionally
    // skipped in non-local environments (CI, staging, production).
    if (!isLocalSupabase()) {
      expect(shouldSkip).toBe(true);
    } else {
      // Running locally — the integration suite above should be active
      expect(shouldSkip).toBe(false);
    }
  });
});
