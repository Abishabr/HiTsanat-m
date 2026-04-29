// supabase/functions/admin-user-management/index.ts
// Deno Edge Function — admin user management operations
// Handles: create_user, update_password
// All Supabase Admin API calls are made server-side so the service role key
// never reaches the browser.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

// Allow the deployed app origin and any localhost port for development.
// The exact localhost port varies per developer, so we match the whole
// localhost origin family with a regex check.
const ALLOWED_ORIGINS = [
  "https://kepduzykkdiojgplcsjg.supabase.co", // Supabase Studio (optional)
  "https://hitsanat-kfl.vercel.app",           // production app (update if domain changes)
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Allow any http://localhost:<port> or http://127.0.0.1:<port>
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return false;
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = isAllowedOrigin(origin) ? origin! : ALLOWED_ORIGINS[1];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

function jsonResponse(
  body: unknown,
  status: number,
  origin: string | null,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}

function errorResponse(
  message: string,
  status: number,
  origin: string | null,
): Response {
  return jsonResponse({ error: message }, status, origin);
}

// ---------------------------------------------------------------------------
// Supabase clients
// ---------------------------------------------------------------------------

function getServiceRoleClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

// ---------------------------------------------------------------------------
// JWT verification (task 2.2)
// ---------------------------------------------------------------------------

async function verifyJwt(
  authHeader: string | null,
): Promise<{ userId: string } | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  const jwt = authHeader.slice(7);
  const supabase = getServiceRoleClient();

  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data.user) return null;

  return { userId: data.user.id };
}

// ---------------------------------------------------------------------------
// Role authorization helper (task 2.3)
// ---------------------------------------------------------------------------

interface CallerRole {
  role: string;        // e.g. 'Chairperson', 'Vice Chairperson', 'Secretary'
  subDepartment: string; // e.g. 'Department', 'Timhert', …
}

async function getCallerRole(
  callerUserId: string,
): Promise<CallerRole | null> {
  const supabase = getServiceRoleClient();

  // Query: members → member_sub_departments → leadership_roles → sub_departments
  // WHERE members.auth_user_id = callerUserId
  //   AND msd.is_active = true
  //   AND lr.name != 'Member'
  //   AND sd.name = 'Department'
  // ORDER BY lr.hierarchy_level ASC (highest priority role first)
  // LIMIT 1
  //
  // Schema (from migration 007):
  //   members.member_id (PK)
  //   member_sub_departments: id, member_id, sub_department_id, leadership_role_id, is_active
  //   leadership_roles: leadership_role_id (PK), name, hierarchy_level
  //   sub_departments: sub_department_id (PK), name

  const { data, error } = await supabase
    .from("members")
    .select(
      `
      member_id,
      member_sub_departments!inner (
        is_active,
        leadership_roles!inner (
          name,
          hierarchy_level
        ),
        sub_departments!inner (
          name
        )
      )
    `,
    )
    .eq("auth_user_id", callerUserId)
    .eq("member_sub_departments.is_active", true)
    .neq("member_sub_departments.leadership_roles.name", "Member")
    .eq("member_sub_departments.sub_departments.name", "Department")
    .order("member_sub_departments.leadership_roles.hierarchy_level", {
      ascending: true,
    })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  // Navigate the nested join result
  const msdArray = data.member_sub_departments as Array<{
    is_active: boolean;
    leadership_roles: { name: string; hierarchy_level: number };
    sub_departments: { name: string };
  }>;

  if (!msdArray || msdArray.length === 0) return null;

  // Pick the entry with the lowest hierarchy_level (highest authority)
  const best = msdArray.reduce((prev, curr) =>
    curr.leadership_roles.hierarchy_level < prev.leadership_roles.hierarchy_level
      ? curr
      : prev
  );

  return {
    role: best.leadership_roles.name,
    subDepartment: best.sub_departments.name,
  };
}

// ---------------------------------------------------------------------------
// Supabase Admin API helpers (task 2.4, 2.5, 2.6)
// ---------------------------------------------------------------------------

const ADMIN_API_BASE = `${Deno.env.get("SUPABASE_URL")}/auth/v1/admin/users`;

function adminApiHeaders(): Record<string, string> {
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return {
    "Content-Type": "application/json",
    "apikey": serviceRoleKey,
    "Authorization": `Bearer ${serviceRoleKey}`,
  };
}

// Forward Admin API errors to the caller with the original HTTP status (task 2.6)
async function forwardAdminApiError(
  adminResponse: Response,
  origin: string | null,
): Promise<Response> {
  let message = "Admin API error";
  try {
    const body = await adminResponse.json();
    message = body?.msg ?? body?.message ?? body?.error_description ?? body?.error ?? message;
  } catch {
    // ignore parse errors
  }
  return errorResponse(message, adminResponse.status, origin);
}

// ---------------------------------------------------------------------------
// Operation: create_user (task 2.4)
// ---------------------------------------------------------------------------

async function handleCreateUser(
  body: Record<string, unknown>,
  origin: string | null,
): Promise<Response> {
  const { email, password, full_name } = body as {
    email?: string;
    password?: string;
    full_name?: string;
  };

  if (!email || !password) {
    return errorResponse("email and password are required", 400, origin);
  }

  const payload: Record<string, unknown> = {
    email,
    password,
    email_confirm: true,
  };

  if (full_name) {
    payload.user_metadata = { full_name };
  }

  const adminResponse = await fetch(ADMIN_API_BASE, {
    method: "POST",
    headers: adminApiHeaders(),
    body: JSON.stringify(payload),
  });

  if (!adminResponse.ok) {
    return forwardAdminApiError(adminResponse, origin);
  }

  const created = await adminResponse.json();
  return jsonResponse({ auth_user_id: created.id }, 200, origin);
}

// ---------------------------------------------------------------------------
// Operation: update_password (task 2.5)
// ---------------------------------------------------------------------------

async function handleUpdatePassword(
  body: Record<string, unknown>,
  origin: string | null,
): Promise<Response> {
  const { auth_user_id, new_password } = body as {
    auth_user_id?: string;
    new_password?: string;
  };

  if (!auth_user_id || !new_password) {
    return errorResponse("auth_user_id and new_password are required", 400, origin);
  }

  const adminResponse = await fetch(`${ADMIN_API_BASE}/${auth_user_id}`, {
    method: "PUT",
    headers: adminApiHeaders(),
    body: JSON.stringify({ password: new_password }),
  });

  if (!adminResponse.ok) {
    return forwardAdminApiError(adminResponse, origin);
  }

  return jsonResponse({ success: true }, 200, origin);
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");

  // Handle CORS preflight (task 2.7)
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405, origin);
  }

  // --- JWT verification (task 2.2) ---
  const authHeader = req.headers.get("Authorization");
  const verified = await verifyJwt(authHeader);
  if (!verified) {
    return errorResponse("Unauthorized", 401, origin);
  }

  // --- Parse request body ---
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, origin);
  }

  const { operation } = body as { operation?: string };
  if (!operation) {
    return errorResponse("operation is required", 400, origin);
  }

  // --- Role authorization (task 2.3) ---
  const callerRole = await getCallerRole(verified.userId);

  if (!callerRole || callerRole.subDepartment !== "Department") {
    return errorResponse("Forbidden", 403, origin);
  }

  const isDeptLeader = ["Chairperson", "Vice Chairperson", "Secretary"].includes(
    callerRole.role,
  );

  if (!isDeptLeader) {
    return errorResponse("Forbidden", 403, origin);
  }

  // --- Dispatch operation ---
  switch (operation) {
    case "create_user": {
      // Only Chairperson of Department may create users (task 2.4)
      if (callerRole.role !== "Chairperson") {
        return errorResponse(
          "Only the Chairperson can perform this action",
          403,
          origin,
        );
      }
      return handleCreateUser(body, origin);
    }

    case "update_password": {
      // Any dept leader may reset passwords (task 2.5)
      return handleUpdatePassword(body, origin);
    }

    default:
      return errorResponse(`Unknown operation: ${operation}`, 400, origin);
  }
});
