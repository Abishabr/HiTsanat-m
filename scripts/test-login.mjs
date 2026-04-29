const url = 'https://kepduzykkdiojgplcsjg.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlcGR1enlra2Rpb2pncGxjc2pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNDQxMjgsImV4cCI6MjA5MjYyMDEyOH0.aacEKBwxSWqONiyjDJXC_m5bnQpp_cURUKzbFSLKSoA';
const svcKey  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlcGR1enlra2Rpb2pncGxjc2pnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA0NDEyOCwiZXhwIjoyMDkyNjIwMTI4fQ.ve6cgyMBaagNVMi4X2Z1ngZTbxETOV25cproOkOjJiQ';

const users = [
  { email: 'mahider@hitsanat.com',     password: 'Mahider@1234',   name: 'Mahider (Dept Chair)' },
  { email: 'luel@hitsanat.com',        password: 'Luel@1234',      name: 'Luel (Dept Vice Chair)' },
  { email: 'hana@hitsanat.com',        password: 'Hana@1234',      name: 'Hana (Dept Secretary)' },
  { email: 'abrham.t@hitsanat.com',    password: 'Abrham@1234',    name: 'Abrham (Timhert Chair)' },
  { email: 'bezawit.m@hitsanat.com',   password: 'Bezawit@1234',   name: 'Bezawit (Mezmur Chair)' },
  { email: 'kidist.k@hitsanat.com',    password: 'Kidist@1234',    name: 'Kidist (Kinetibeb Chair)' },
  { email: 'kenenissa.ku@hitsanat.com',password: 'Kenenissa@1234', name: 'Kenenissa (Kuttr Chair)' },
];

for (const u of users) {
  // Step 1: Sign in
  const r1 = await fetch(url + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: anonKey },
    body: JSON.stringify({ email: u.email, password: u.password })
  });
  const auth = await r1.json();
  if (!auth.access_token) {
    console.log('❌ SIGN-IN FAILED:', u.name, '-', auth.error_description ?? auth.message ?? JSON.stringify(auth));
    continue;
  }
  const jwt = auth.access_token;
  const userId = auth.user.id;

  // Step 2: check_leadership_access RPC
  const r2 = await fetch(url + '/rest/v1/rpc/check_leadership_access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: anonKey, Authorization: 'Bearer ' + jwt },
    body: JSON.stringify({ auth_user_id: userId })
  });
  const access = await r2.json();

  const ok = access.has_access === true;
  console.log(ok ? '✅' : '❌', u.name, '-', JSON.stringify(access));
}
