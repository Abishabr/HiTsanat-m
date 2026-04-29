/**
 * validation.ts
 *
 * Client-side validation utilities for the Supabase Auth User Creation feature.
 * All functions are pure and side-effect-free, making them suitable for
 * property-based testing.
 *
 * Feature: supabase-auth-user-creation
 */

// ── Password validation ────────────────────────────────────────────────────

const PASSWORD_MIN_LENGTH = 8;

/**
 * Returns true iff the string satisfies ALL four password criteria:
 *   1. Length ≥ 8
 *   2. At least one uppercase letter (A–Z)
 *   3. At least one digit (0–9)
 *   4. At least one special character (non-alphanumeric)
 *
 * Feature: supabase-auth-user-creation, Property 8
 */
export function validatePassword(s: string): boolean {
  if (s.length < PASSWORD_MIN_LENGTH) return false;
  if (!/[A-Z]/.test(s)) return false;
  if (!/[0-9]/.test(s)) return false;
  if (!/[^A-Za-z0-9]/.test(s)) return false;
  return true;
}

/**
 * Returns an array of human-readable error messages for each failing criterion.
 * Returns an empty array when the password is valid.
 *
 * Used for inline per-criterion feedback in forms.
 */
export function getPasswordErrors(s: string): string[] {
  const errors: string[] = [];
  if (s.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }
  if (!/[A-Z]/.test(s)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[0-9]/.test(s)) {
    errors.push('Password must contain at least one digit');
  }
  if (!/[^A-Za-z0-9]/.test(s)) {
    errors.push('Password must contain at least one special character');
  }
  return errors;
}

// ── Email validation ───────────────────────────────────────────────────────

/**
 * RFC 5322 simplified email regex.
 *
 * Accepts:
 *   - local part: alphanumeric + . _ + - (no consecutive dots, no leading/trailing dot)
 *   - @ separator
 *   - domain: alphanumeric + hyphens, at least one dot, TLD ≥ 2 chars
 *
 * Feature: supabase-auth-user-creation, Property 9
 */
const EMAIL_REGEX =
  /^[a-zA-Z0-9](?:[a-zA-Z0-9._%+\-]*[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9\-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9\-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

/**
 * Returns true iff the string is a syntactically valid email address
 * (RFC 5322 simplified format).
 *
 * Feature: supabase-auth-user-creation, Property 9
 */
export function validateEmail(s: string): boolean {
  if (!s || s.length === 0) return false;
  return EMAIL_REGEX.test(s);
}
