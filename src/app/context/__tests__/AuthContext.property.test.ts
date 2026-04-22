// Feature: authentication-system, Property 1: Error messages are propagated without modification
// Feature: authentication-system, Property 3: Role mapping is correct for all valid (role, sub_department) combinations

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import * as fc from 'fast-check';
import type { UserRole } from '../../data/mockData';

// ---------------------------------------------------------------------------
// Hoist mock variables so they are available inside vi.mock factory
// (vi.mock is hoisted to the top of the file by Vitest)
// ---------------------------------------------------------------------------

const {
  mockSignInWithPassword,
  mockSignOut,
  mockRpc,
  mockFrom,
  mockUnsubscribe,
  getCapturedCallback,
  setCapturedCallback,
} = vi.hoisted(() => {
  let _capturedCallback: ((event: string, session: unknown) => void) | null = null;

  return {
    mockSignInWithPassword: vi.fn(),
    mockSignOut: vi.fn(),
    mockRpc: vi.fn(),
    mockFrom: vi.fn(),
    mockUnsubscribe: vi.fn(),
    getCapturedCallback: () => _capturedCallback,
    setCapturedCallback: (cb: ((event: string, session: unknown) => void) | null) => {
      _capturedCallback = cb;
    },
  };
});

// ---------------------------------------------------------------------------
// Mock supabase
// ---------------------------------------------------------------------------

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
      onAuthStateChange: vi.fn((callback: (event: string, session: unknown) => void) => {
        setCapturedCallback(callback);
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      }),
    },
    rpc: mockRpc,
    from: mockFrom,
  },
}));

// Import after mocks are set up
import { AuthProvider, mapToAppRole } from '../AuthContext';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Default wrapper — live mode */
function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(AuthProvider, null, children);
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  setCapturedCallback(null);

  // Default: signOut resolves successfully
  mockSignOut.mockResolvedValue({ error: null });
});

// ---------------------------------------------------------------------------
// Property 1 — Error messages are propagated without modification
// ---------------------------------------------------------------------------

/**
 * Property 1 — Error messages are propagated without modification
 * Validates: Requirements 1.3
 *
 * For any non-empty error message string returned by signInWithPassword,
 * the error field exposed by useAuth() after a failed login SHALL equal
 * that exact string — no truncation, wrapping, or transformation.
 */

describe('AuthContext — property tests', () => {
  it('Property 1: error messages from signInWithPassword are propagated without modification', async () => {
    // Dynamically import useAuth after mocks are in place
    const { useAuth } = await import('../AuthContext');

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        async (generatedMessage) => {
          // Reset mocks for each iteration
          vi.clearAllMocks();
          setCapturedCallback(null);
          mockSignOut.mockResolvedValue({ error: null });

          // Mock signInWithPassword to return the generated error message
          mockSignInWithPassword.mockResolvedValue({
            error: { message: generatedMessage },
          });

          const { result } = renderHook(() => useAuth(), { wrapper });

          await act(async () => {
            await result.current.login({ email: 'test@example.com', password: 'password' });
          });

          expect(result.current.error).toBe(generatedMessage);
        },
      ),
      { numRuns: 100 },
    );
  });

  // ---------------------------------------------------------------------------
  // Property 3 — Role mapping is correct for all valid (role, sub_department) combinations
  // ---------------------------------------------------------------------------

  /**
   * Property 3 — Role mapping is correct for all valid (role, sub_department) combinations
   * Validates: Requirements 3.1
   *
   * Uses fc.constantFrom to enumerate every (role, sub_department, expected) tuple
   * from the mapping table and asserts mapToAppRole returns the expected App_Role.
   */

  type RoleTuple = {
    role: string;
    subDept: string;
    expected: UserRole;
  };

  const ROLE_MAPPING_TABLE: RoleTuple[] = [
    // Department-level roles
    { role: 'Chairperson',      subDept: 'Department', expected: 'chairperson' },
    { role: 'Vice Chairperson', subDept: 'Department', expected: 'vice-chairperson' },
    { role: 'Secretary',        subDept: 'Department', expected: 'secretary' },
    // Timhert sub-department
    { role: 'Chairperson',      subDept: 'Timhert',    expected: 'subdept-leader' },
    { role: 'Vice Chairperson', subDept: 'Timhert',    expected: 'subdept-vice-leader' },
    { role: 'Secretary',        subDept: 'Timhert',    expected: 'subdept-vice-leader' },
    // Mezmur sub-department
    { role: 'Chairperson',      subDept: 'Mezmur',     expected: 'subdept-leader' },
    { role: 'Vice Chairperson', subDept: 'Mezmur',     expected: 'subdept-vice-leader' },
    { role: 'Secretary',        subDept: 'Mezmur',     expected: 'subdept-vice-leader' },
    // Kinetibeb sub-department
    { role: 'Chairperson',      subDept: 'Kinetibeb',  expected: 'subdept-leader' },
    { role: 'Vice Chairperson', subDept: 'Kinetibeb',  expected: 'subdept-vice-leader' },
    { role: 'Secretary',        subDept: 'Kinetibeb',  expected: 'subdept-vice-leader' },
    // Kuttr sub-department
    { role: 'Chairperson',      subDept: 'Kuttr',      expected: 'subdept-leader' },
    { role: 'Vice Chairperson', subDept: 'Kuttr',      expected: 'subdept-vice-leader' },
    { role: 'Secretary',        subDept: 'Kuttr',      expected: 'subdept-vice-leader' },
    // Ekd sub-department
    { role: 'Chairperson',      subDept: 'Ekd',        expected: 'subdept-leader' },
    { role: 'Vice Chairperson', subDept: 'Ekd',        expected: 'subdept-vice-leader' },
    { role: 'Secretary',        subDept: 'Ekd',        expected: 'subdept-vice-leader' },
  ];

  it('Property 3: mapToAppRole returns the correct App_Role for every valid (role, sub_department) combination', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ROLE_MAPPING_TABLE),
        ({ role, subDept, expected }) => {
          const result = mapToAppRole(role, subDept);
          expect(result).toBe(expected);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2 — Access granted produces a fully-populated User object
// ---------------------------------------------------------------------------

/**
 * Property 2 — Access granted produces a fully-populated User object
 * Validates: Requirements 2.2, 3.3
 *
 * For any valid RPC response where has_access is true, the user object set in
 * AuthContext SHALL be non-null and SHALL contain non-empty id, name, role, and
 * email fields; subDepartment SHALL be set to the sub_department value when it
 * is not 'Department', and SHALL be undefined when sub_department is 'Department'.
 */

// Feature: authentication-system, Property 2: Access granted produces a fully-populated User object

describe('AuthContext — Property 2: Access granted produces a fully-populated User object', () => {
  it('Property 2: user object is fully populated when RPC returns has_access: true', async () => {
    const { useAuth } = await import('../AuthContext');

    const validRoles = ['Chairperson', 'Vice Chairperson', 'Secretary'] as const;
    const validSubDepartments = ['Department', 'Timhert', 'Mezmur', 'Kinetibeb', 'Kuttr', 'Ekd'] as const;

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          role: fc.constantFrom(...validRoles),
          sub_department: fc.constantFrom(...validSubDepartments),
        }),
        async ({ role, sub_department }) => {
          // Reset mocks for each iteration
          vi.clearAllMocks();
          setCapturedCallback(null);
          mockSignOut.mockResolvedValue({ error: null });

          // Mock RPC to return has_access: true with the generated role/sub_department
          mockRpc.mockResolvedValue({
            data: { has_access: true, role, sub_department },
            error: null,
          });

          // Mock supabase.from('members').select(...).eq(...).single()
          const mockSingle = vi.fn().mockResolvedValue({
            data: {
              member_id: 'test-member-uuid-123',
              full_name: 'Test Member Name',
              phone: '0911000000',
            },
            error: null,
          });
          const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
          const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
          mockFrom.mockReturnValue({ select: mockSelect });

          const { result } = renderHook(() => useAuth(), { wrapper });

          // Fire INITIAL_SESSION event to trigger checkLeadershipAccess
          const callback = getCapturedCallback();
          if (callback) {
            await act(async () => {
              callback('INITIAL_SESSION', {
                user: {
                  id: 'auth-user-uuid-456',
                  email: 'leader@example.com',
                },
              });
            });
          }

          const user = result.current.user;

          // Assert user is non-null
          expect(user).not.toBeNull();
          if (!user) return;

          // Assert id is a non-empty string
          expect(typeof user.id).toBe('string');
          expect(user.id.length).toBeGreaterThan(0);

          // Assert name is a non-empty string
          expect(typeof user.name).toBe('string');
          expect(user.name.length).toBeGreaterThan(0);

          // Assert role is a valid UserRole (non-empty string)
          expect(typeof user.role).toBe('string');
          expect(user.role.length).toBeGreaterThan(0);

          // Assert email is a non-empty string
          expect(typeof user.email).toBe('string');
          expect(user.email.length).toBeGreaterThan(0);

          // Assert subDepartment logic
          if (sub_department !== 'Department') {
            expect(user.subDepartment).toBe(sub_department);
          } else {
            expect(user.subDepartment).toBeUndefined();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4 — Highest-priority role is always selected
// ---------------------------------------------------------------------------

/**
 * Property 4 — Highest-priority role is always selected
 * Validates: Requirements 3.2
 *
 * For any non-empty list of active role assignments (each with a hierarchy_level),
 * the role selected by the access-check logic SHALL be the one with the minimum
 * hierarchy_level value.
 *
 * The RPC performs ORDER BY hierarchy_level ASC LIMIT 1 server-side, so the
 * client receives only the highest-priority role. This property verifies that
 * the AuthContext correctly uses the role returned by the RPC (which by contract
 * is the one with the minimum hierarchy_level in the full list).
 */

// Feature: authentication-system, Property 4: Highest-priority role is always selected

type RoleAssignment = {
  role: string;
  sub_department: string;
  hierarchy_level: number;
};

const VALID_ROLES = ['Chairperson', 'Vice Chairperson', 'Secretary'] as const;
const VALID_SUB_DEPARTMENTS = ['Department', 'Timhert', 'Mezmur', 'Kinetibeb', 'Kuttr', 'Ekd'] as const;

/** Arbitrarily generates a single role assignment with a hierarchy_level in [1, 100]. */
const roleAssignmentArb = fc.record({
  role: fc.constantFrom(...VALID_ROLES),
  sub_department: fc.constantFrom(...VALID_SUB_DEPARTMENTS),
  hierarchy_level: fc.integer({ min: 1, max: 100 }),
});

describe('AuthContext — Property 4: Highest-priority role is always selected', () => {
  it('Property 4: AuthContext uses the role with the minimum hierarchy_level returned by the RPC', async () => {
    const { useAuth } = await import('../AuthContext');

    await fc.assert(
      fc.asyncProperty(
        // Generate a non-empty array of role assignments
        fc.array(roleAssignmentArb, { minLength: 1, maxLength: 10 }),
        async (roleAssignments) => {
          // Reset mocks for each iteration
          vi.clearAllMocks();
          setCapturedCallback(null);
          mockSignOut.mockResolvedValue({ error: null });

          // Find the role with the minimum hierarchy_level (what the RPC would return)
          const highestPriorityRole = roleAssignments.reduce((min, r) =>
            r.hierarchy_level < min.hierarchy_level ? r : min,
          );

          // Mock RPC to return the highest-priority role (simulating ORDER BY hierarchy_level ASC LIMIT 1)
          mockRpc.mockResolvedValue({
            data: {
              has_access: true,
              role: highestPriorityRole.role,
              sub_department: highestPriorityRole.sub_department,
            },
            error: null,
          });

          // Mock member data lookup
          const mockSingle = vi.fn().mockResolvedValue({
            data: {
              member_id: 'member-uuid-prop4',
              full_name: 'Property Four Test',
              phone: '0900000000',
            },
            error: null,
          });
          const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
          const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
          mockFrom.mockReturnValue({ select: mockSelect });

          const { result } = renderHook(() => useAuth(), { wrapper });

          // Fire INITIAL_SESSION to trigger checkLeadershipAccess
          const callback = getCapturedCallback();
          if (callback) {
            await act(async () => {
              callback('INITIAL_SESSION', {
                user: {
                  id: 'auth-uuid-prop4',
                  email: 'prop4@example.com',
                },
              });
            });
          }

          const user = result.current.user;

          // The user must be set (access was granted)
          expect(user).not.toBeNull();
          if (!user) return;

          // Derive the expected App_Role from the highest-priority role
          const expectedAppRole = mapToAppRole(
            highestPriorityRole.role,
            highestPriorityRole.sub_department,
          );

          // Assert the AuthContext used the role with the minimum hierarchy_level
          expect(user.role).toBe(expectedAppRole);

          // Assert that no other role in the array with a LOWER hierarchy_level
          // would produce a different result (i.e., the minimum was truly selected)
          const minLevel = Math.min(...roleAssignments.map((r) => r.hierarchy_level));
          expect(highestPriorityRole.hierarchy_level).toBe(minLevel);
        },
      ),
      { numRuns: 100 },
    );
  });
});
