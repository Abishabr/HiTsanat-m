/**
 * Creates 18 auth users and links them to member rows.
 *
 * Strategy:
 *   1. Apply the upsert guard migration via the Supabase Management API
 *      so the handle_new_user() trigger won't block auth user creation.
 *   2. Create each auth user via the Admin API.
 *   3. Patch members.auth_user_id by email (the trigger may have already
 *      set it, but PATCH is idempotent so it's safe either way).
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/create-users.mjs
 *
 * Optional — provide the Management API token to auto-apply the migration:
 *   SUPABASE_ACCESS_TOKEN=your_pat SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/create-users.mjs
 */

const SUPABASE_URL = 'https://kepduzykkdiojgplcsjg.supabase.co';
const PROJECT_REF  = 'kepduzykkdiojgplcsjg';
const SERVICE_ROLE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN; // optional

if (!SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY env var');
  process.exit(1);
}

// ── 18 system users ──────────────────────────────────────────────────────────

const USERS = [
  // Department Leaders
  { memberId: '11111111-0000-0000-0000-000000000001', email: 'mahider@hitsanat.com',      password: 'Mahider@1234',   name: 'Mahider Demelash'   },
  { memberId: '11111111-0000-0000-0000-000000000002', email: 'luel@hitsanat.com',         password: 'Luel@1234',      name: 'Luel Seged Tadesse' },
  { memberId: '11111111-0000-0000-0000-000000000003', email: 'hana@hitsanat.com',         password: 'Hana@1234',      name: 'Hana Girma'         },
  // Timhert
  { memberId: '11111111-0000-0000-0000-000000000004', email: 'abrham.t@hitsanat.com',     password: 'Abrham@1234',    name: 'Abrham Habtamu'     },
  { memberId: '11111111-0000-0000-0000-000000000005', email: 'tigist.t@hitsanat.com',     password: 'Tigist@1234',    name: 'Tigist Bekele'      },
  { memberId: '11111111-0000-0000-0000-000000000006', email: 'yonas.t@hitsanat.com',      password: 'Yonas@1234',     name: 'Yonas Alemu'        },
  // Mezmur
  { memberId: '11111111-0000-0000-0000-000000000007', email: 'bezawit.m@hitsanat.com',    password: 'Bezawit@1234',   name: 'Bezawit Girma'      },
  { memberId: '11111111-0000-0000-0000-000000000008', email: 'dawit.m@hitsanat.com',      password: 'Dawit@1234',     name: 'Dawit Tesfaye'      },
  { memberId: '11111111-0000-0000-0000-000000000009', email: 'meron.m@hitsanat.com',      password: 'Meron@1234',     name: 'Meron Tadesse'      },
  // Kinetibeb
  { memberId: '11111111-0000-0000-0000-000000000010', email: 'kidist.k@hitsanat.com',     password: 'Kidist@1234',    name: 'Kidist Ymechewale'  },
  { memberId: '11111111-0000-0000-0000-000000000011', email: 'samuel.k@hitsanat.com',     password: 'Samuel@1234',    name: 'Samuel Kebede'      },
  { memberId: '11111111-0000-0000-0000-000000000012', email: 'rahel.k@hitsanat.com',      password: 'Rahel@1234',     name: 'Rahel Haile'        },
  // Kuttr
  { memberId: '11111111-0000-0000-0000-000000000013', email: 'kenenissa.ku@hitsanat.com', password: 'Kenenissa@1234', name: 'Kenenissa Bekele'   },
  { memberId: '11111111-0000-0000-0000-000000000014', email: 'selam.ku@hitsanat.com',     password: 'Selam@1234',     name: 'Selamawit Tesfaye'  },
  { memberId: '11111111-0000-0000-0000-000000000015', email: 'biruk.ku@hitsanat.com',     password: 'Biruk@1234',     name: 'Biruk Alemu'        },
  // Ekd
  { memberId: '11111111-0000-0000-0000-000000000016', email: 'natnael.e@hitsanat.com',    password: 'Natnael@1234',   name: 'Natnael Girma'      },
  { memberId: '11111111-0000-0000-0000-000000000017', email: 'fikirte.e@hitsanat.com',    password: 'Fikirte@1234',   name: 'Fikirte Habtamu'    },
  { memberId: '11111111-0000-0000-0000-000000000018', email: 'henok.e@hitsanat.com',      password: 'Henok@1234',     name: 'Henok Tadesse'      },
];

// ── Step 1: Apply upsert guard via Management API (if token provided) ────────

async function applyUpsertGuard() {
  if (!SUPABASE_ACCESS_TOKEN) {
    console.log('ℹ  No SUPABASE_ACCESS_TOKEN — skipping auto-migration.');
    console.log('   If users fail with trigger errors, apply supabase/migrations/008_handle_new_user_upsert.sql manually.\n');
    return;
  }

  const sql = `
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.members (email, full_name, auth_user_id)
  VALUES (
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.id
  )
  ON CONFLICT (email)
  DO UPDATE SET auth_user_id = EXCLUDED.auth_user_id
  WHERE public.members.auth_user_id IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
  `.trim();

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ query: sql }),
    },
  );

  if (res.ok) {
    console.log('✅ Upsert guard applied to handle_new_user()\n');
  } else {
    const text = await res.text();
    console.warn('⚠  Could not apply upsert guard:', text.slice(0, 200), '\n');
  }
}

// ── Step 2: Create auth user ─────────────────────────────────────────────────

async function createAuthUser(email, password, fullName) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    }),
  });

  const data = await res.json();

  if (res.ok) {
    console.log(`  ✅ Created: ${email} → ${data.id}`);
    return data.id;
  }

  // Already registered
  if (
    data.message?.includes('already been registered') ||
    data.code === 'email_exists' ||
    data.msg?.includes('already registered')
  ) {
    console.log(`  ℹ  Already exists: ${email} — fetching ID`);
    return await getExistingAuthUser(email);
  }

  // Trigger conflict: Supabase rolls back the whole transaction when the
  // old INSERT-only trigger hits a duplicate email. The auth user is NOT
  // created in this case. We need the upsert guard applied first.
  console.error(`  ❌ Failed [${res.status}]: ${data.message ?? data.msg ?? JSON.stringify(data)}`);
  return null;
}

async function getExistingAuthUser(email) {
  // List users and find by email (paginated, but 18 users fit in one page)
  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`,
    {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
    },
  );
  if (!res.ok) return null;
  const data = await res.json();
  const user = (data.users ?? []).find(u => u.email === email);
  if (user) {
    console.log(`  ℹ  Found existing auth user: ${email} → ${user.id}`);
    return user.id;
  }
  return null;
}

// ── Step 3: Link auth user to member row ─────────────────────────────────────

async function linkMember(authUserId, email) {
  // Patch by email — works regardless of whether the trigger already set it
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/members?email=eq.${encodeURIComponent(email)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({ auth_user_id: authUserId }),
    },
  );

  if (res.ok) {
    const rows = await res.json();
    if (rows.length > 0) {
      console.log(`  🔗 Linked member: ${email}`);
      return true;
    }
    console.warn(`  ⚠  No member row found for ${email} — was seed.sql applied?`);
    return false;
  }

  const text = await res.text();
  console.error(`  ❌ Link failed for ${email}:`, text.slice(0, 200));
  return false;
}

// ── Main ─────────────────────────────────────────────────────────────────────

console.log('🚀 Creating 18 system users for Hitsanat KFL...\n');

await applyUpsertGuard();

let created = 0;
let failed  = 0;

for (const u of USERS) {
  console.log(`→ ${u.name} (${u.email})`);
  const authId = await createAuthUser(u.email, u.password, u.name);
  if (authId) {
    const linked = await linkMember(authId, u.email);
    if (linked) created++;
    else failed++;
  } else {
    failed++;
  }
}

console.log(`\n${'─'.repeat(60)}`);
console.log(`✅ Done: ${created} linked, ${failed} failed`);
console.log(`${'─'.repeat(60)}`);
console.log('\nCredentials:');
for (const u of USERS) {
  console.log(`  ${u.email.padEnd(35)} ${u.password}`);
}
