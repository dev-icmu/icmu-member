import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

function publicConfig(path) {
  const env = Object.fromEntries(readFileSync(path, 'utf8').split(/\r?\n/)
    .map(line => line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean)
    .map(([, key, value]) => [key, value.replace(/^['"]|['"]$/g, '')]));
  return { url: env.VITE_SUPABASE_URL, key: env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY };
}

const member = publicConfig(new URL('../.env', import.meta.url));
const website = publicConfig(new URL('../../icmu-web/.env', import.meta.url));
assert.equal(member.url, 'https://damggnckfqohgupcexpo.supabase.co');
assert.equal(website.url, 'https://dmdvulgsexgkraawqijg.supabase.co');

async function request(config, path, options = {}) {
  return fetch(`${config.url}${path}`, {
    ...options,
    headers: { apikey: config.key, 'Content-Type': 'application/json', ...options.headers },
    signal: AbortSignal.timeout(20000),
  });
}

for (const origin of ['http://localhost:5173', 'https://members.isipathanamedia.online']) {
  const preflight = await request(member, '/functions/v1/shared-admin-login', {
    method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization,apikey,content-type,x-client-info' },
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), '*');
  console.log(`PASS CORS: ${origin}`);
}

// Deliberately nonexistent account: never changes or locks out a real account.
const invalidLogin = await request(member, '/functions/v1/shared-admin-login', {
  method: 'POST', body: JSON.stringify({ action: 'login', index_number: 'icmu-release-smoke-nonexistent', password: 'invalid-test-only' }),
});
assert.equal(invalidLogin.status, 401, `Configured bridge should reject invalid credentials with 401, received ${invalidLogin.status}`);
console.log('PASS enabled login bridge rejects invalid credentials');

// A missing RPC is a deployment error, not a passing authorization check.
for (const [rpc, body] of [['admin_member_batches', {}], ['admin_membership_revenue', {p_period:'all'}], ['admin_application_activity', { p_period:'7d' }], ['claim_approval_whatsapp', {}], ['admin_whatsapp_status', {p_id:'00000000-0000-4000-8000-000000000000'}]]) {
  const response = await request(member, `/rest/v1/rpc/${rpc}`, { method:'POST', body:JSON.stringify(body) });
  assert.ok([401, 403].includes(response.status), `${rpc}: expected protected RPC, received ${response.status}`);
  console.log(`PASS deployed RPC exists and denies anonymous access: ${rpc}`);
}

const deviceCheck = await request(website, '/rest/v1/rpc/register_member_device', {
  method:'POST',body:JSON.stringify({p_session_id:'00000000-0000-4000-8000-000000000000',p_user_agent:'Unauthorized smoke test'}),
});
assert.ok([401,403].includes(deviceCheck.status),'Device registration must require a verified account');
const workerCheck = await fetch(`${member.url}/functions/v1/whatsapp-approval`, {method:'POST',body:'{}',signal:AbortSignal.timeout(20000)});
assert.equal(workerCheck.status,401,'WhatsApp worker must reject unauthenticated calls');
console.log('PASS device registration and WhatsApp worker reject unauthenticated calls');

for (const [label, config, path, options] of [
  ['website password hashes', website, '/rest/v1/users?select=password_hash&limit=0', {}],
  ['website private account profile', website, '/rest/v1/rpc/current_account_profile', { method: 'POST', body: '{}' }],
  ['member records', member, '/rest/v1/member?select=id&limit=0', {}],
  ['bridge identity mapping', member, '/rest/v1/rpc/admin_bridge_identity', { method: 'POST', body: JSON.stringify({ p_web_user_id: '00000000-0000-4000-8000-000000000000' }) }],
]) {
  const response = await request(config, path, options);
  assert.ok([401, 403, 404].includes(response.status), `${label}: unexpected status ${response.status}`);
  console.log(`PASS anonymous access denied: ${label}`);
}

for (const url of ['https://isipathanamedia.online/admin/login', 'https://members.isipathanamedia.online/login']) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200);
  assert.ok((await response.text()).includes('id="root"'));
  console.log(`PASS live frontend: ${url}`);
}
