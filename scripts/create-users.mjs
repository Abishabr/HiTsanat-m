/**
 * Run with: node scripts/create-users.mjs
 * Requires: SUPABASE_SERVICE_ROLE_KEY env var
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key node scripts/create-users.mjs
 */

const SUPABASE_URL = 'https://qpdqciylsmtussdupkho.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY env var');
  process.exit(1);
}

const users = [
  { email: 'chair@hitsanat.org',      password: 'Chair@1234',      phone: '+251911123456' },
  { email: 'timhert@hitsanat.org',    password: 'Timhert@1234',    phone: '+251911100001' },
  { email: 'mezmur@hitsanat.org',     password: 'Mezmur@1234',     phone: '+251911100002' },
  { email: 'kinetibeb@hitsanat.org',  password: 'Kinetibeb@1234',  phone: '+251911100003' },
  { email: 'kuttr@hitsanat.org',      password: 'Kuttr@1234',      phone: '+251911100004' },
  { email: 'ekd@hitsanat.org',        password: 'Ekd@1234',        phone: '+251911100005' },
];

async function createUser(email, password) {
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
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error(`❌ Failed to create ${email}:`, data.message ?? data);
    return null;
  }
  console.log(`✅ Created ${email} → id: ${data.id}`);
  return data.id;
}

async function linkUserToMember(authUserId, phone) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/link_user_to_member`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ p_auth_user_id: authUserId, p_phone: phone }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.warn(`  ⚠ link_user_to_member failed for ${phone}:`, text);
  } else {
    console.log(`  🔗 Linked auth user to member with phone ${phone}`);
  }
}

for (const u of users) {
  const id = await createUser(u.email, u.password);
  if (id) await linkUserToMember(id, u.phone);
}

console.log('\nDone. Now run the role assignment SQL in Supabase SQL Editor.');
