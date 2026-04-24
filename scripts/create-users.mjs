/**
 * Creates 18 auth users and links them to member rows.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/create-users.mjs
 *
 * Get your service role key from:
 *   Supabase Dashboard → Project Settings → API → service_role key
 */

const SUPABASE_URL = 'https://qpdqciylsmtussdupkho.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY env var');
  console.error('   Run: SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/create-users.mjs');
  process.exit(1);
}

// 18 system users matching the seed.sql member IDs
const USERS = [
  // Department Leaders
  { memberId: '11111111-0000-0000-0000-000000000001', email: 'mahider@hitsanat.com',     password: 'Mahider@1234',    name: 'Mahider Demelash'   },
  { memberId: '11111111-0000-0000-0000-000000000002', email: 'luel@hitsanat.com',        password: 'Luel@1234',       name: 'Luel Seged Tadesse' },
  { memberId: '11111111-0000-0000-0000-000000000003', email: 'hana@hitsanat.com',        password: 'Hana@1234',       name: 'Hana Girma'         },
  // Timhert
  { memberId: '11111111-0000-0000-0000-000000000004', email: 'abrham.t@hitsanat.com',    password: 'Abrham@1234',     name: 'Abrham Habtamu'     },
  { memberId: '11111111-0000-0000-0000-000000000005', email: 'tigist.t@hitsanat.com',    password: 'Tigist@1234',     name: 'Tigist Bekele'      },
  { memberId: '11111111-0000-0000-0000-000000000006', email: 'yonas.t@hitsanat.com',     password: 'Yonas@1234',      name: 'Yonas Alemu'        },
  // Mezmur
  { memberId: '11111111-0000-0000-0000-000000000007', email: 'bezawit.m@hitsanat.com',   password: 'Bezawit@1234',    name: 'Bezawit Girma'      },
  { memberId: '11111111-0000-0000-0000-000000000008', email: 'dawit.m@hitsanat.com',     password: 'Dawit@1234',      name: 'Dawit Tesfaye'      },
  { memberId: '11111111-0000-0000-0000-000000000009', email: 'meron.m@hitsanat.com',     password: 'Meron@1234',      name: 'Meron Tadesse'      },
  // Kinetibeb
  { memberId: '11111111-0000-0000-0000-000000000010', email: 'kidist.k@hitsanat.com',    password: 'Kidist@1234',     name: 'Kidist Ymechewale'  },
  { memberId: '11111111-0000-0000-0000-000000000011', email: 'samuel.k@hitsanat.com',    password: 'Samuel@1234',     name: 'Samuel Kebede'      },
  { memberId: '11111111-0000-0000-0000-000000000012', email: 'rahel.k@hitsanat.com',     password: 'Rahel@1234',      name: 'Rahel Haile'        },
  // Kuttr
  { memberId: '11111111-0000-0000-0000-000000000013', email: 'kenenissa.ku@hitsanat.com',password: 'Kenenissa@1234',  name: 'Kenenissa Bekele'   },
  { memberId: '11111111-0000-0000-0000-000000000014', email: 'selam.ku@hitsanat.com',    password: 'Selam@1234',      name: 'Selamawit Tesfaye'  },
  { memberId: '11111111-0000-0000-0000-000000000015', email: 'biruk.ku@hitsanat.com',    password: 'Biruk@1234',      name: 'Biruk Alemu'        },
  // Ekd
  { memberId: '11111111-0000-0000-0000-000000000016', email: 'natnael.e@hitsanat.com',   password: 'Natnael@1234',    name: 'Natnael Girma'      },
  { memberId: '11111111-0000-0000-0000-000000000017', email: 'fikirte.e@hitsanat.com',   password: 'Fikirte@1234',    name: 'Fikirte Habtamu'    },
  { memberId: '11111111-0000-0000-0000-000000000018', email: 'henok.e@hitsanat.com',     password: 'Henok@1234',      name: 'Henok Tadesse'      },
];

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
  if (!res.ok) {
    // If user already exists, try to get their ID
    if (data.message?.includes('already been registered') || data.code === 'email_exists') {
      console.warn(`  ⚠ ${email} already exists — fetching existing user`);
      return await getExistingUser(email);
    }
    console.error(`❌ Failed to create ${email}:`, data.message ?? JSON.stringify(data));
    return null;
  }
  console.log(`✅ Created auth user: ${email} → ${data.id}`);
  return data.id;
}

async function getExistingUser(email) {
  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
    {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
    }
  );
  const data = await res.json();
  const user = data.users?.find(u => u.email === email);
  if (user) {
    console.log(`  ℹ Found existing user: ${email} → ${user.id}`);
    return user.id;
  }
  return null;
}

async function linkAuthUserToMember(authUserId, memberId, email) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/members?id=eq.${memberId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ auth_user_id: authUserId }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`  ❌ Failed to link ${email}:`, text);
    return false;
  }
  console.log(`  🔗 Linked ${email} → member ${memberId}`);
  return true;
}

// Main
console.log('🚀 Creating 18 system users for Hitsanat KFL...\n');

let created = 0;
let failed  = 0;

for (const u of USERS) {
  process.stdout.write(`Processing ${u.name} (${u.email})... `);
  const authId = await createAuthUser(u.email, u.password, u.name);
  if (authId) {
    const linked = await linkAuthUserToMember(authId, u.memberId, u.email);
    if (linked) created++;
    else failed++;
  } else {
    failed++;
  }
}

console.log(`\n✅ Done: ${created} created/linked, ${failed} failed`);
console.log('\nCredentials summary:');
console.log('─'.repeat(60));
for (const u of USERS) {
  console.log(`  ${u.email.padEnd(35)} ${u.password}`);
}
console.log('─'.repeat(60));
