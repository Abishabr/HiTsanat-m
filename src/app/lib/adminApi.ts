/**
 * adminApi.ts
 *
 * Client-side utility for calling the `admin-user-management` Supabase Edge Function.
 * The Edge Function holds the service role key server-side; this module only
 * attaches the current user's JWT so the function can verify the caller's identity.
 *
 * Feature: supabase-auth-user-creation
 */

import { supabase } from '../../lib/supabase';

// The Edge Function URL is derived from the Supabase project URL.
// Pattern: <SUPABASE_URL>/functions/v1/admin-user-management
const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-user-management`;

export type AdminOperation = 'create_user' | 'update_password';

export interface AdminFunctionResult<T = unknown> {
  data: T | null;
  error: string | null;
}

/**
 * Calls the `admin-user-management` Edge Function with the current user's JWT.
 *
 * @param operation - The operation to perform: 'create_user' | 'update_password'
 * @param payload   - Operation-specific parameters (merged with { operation })
 * @returns         - { data, error } — data is the parsed response body on success,
 *                    error is a human-readable message on failure.
 */
export async function callAdminFunction<T = unknown>(
  operation: AdminOperation,
  payload: Record<string, unknown>,
): Promise<AdminFunctionResult<T>> {
  // --- Retrieve current session JWT (task 3.1) ---
  const { data: sessionData } = await supabase.auth.getSession();
  const jwt = sessionData?.session?.access_token;

  if (!jwt) {
    return { data: null, error: 'Session expired. Please log in again.' };
  }

  // --- POST to Edge Function (task 3.1) ---
  let response: Response;
  try {
    response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ operation, ...payload }),
    });
  } catch {
    // --- Network error handling (task 3.2) ---
    return {
      data: null,
      error: 'Network error. Please check your connection and try again.',
    };
  }

  // --- Non-2xx error handling (task 3.3) ---
  if (!response.ok) {
    let errorMessage = 'An unexpected error occurred. Please try again.';
    try {
      const body = await response.json();
      // Edge Function returns { error: string } on failure
      if (typeof body?.error === 'string' && body.error.length > 0) {
        errorMessage = body.error;
      }
    } catch {
      // Response body was not valid JSON — keep the default message
    }
    return { data: null, error: errorMessage };
  }

  // --- Success ---
  try {
    const data = (await response.json()) as T;
    return { data, error: null };
  } catch {
    return { data: null, error: 'Failed to parse server response.' };
  }
}
