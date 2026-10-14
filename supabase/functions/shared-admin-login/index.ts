import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
};

class RequestError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new RequestError(503, 'Admin sign-in is not configured yet.');
  return value;
}

function sessionId(token: string) {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const id = JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, '='))).session_id;
    if (typeof id === 'string' && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id)) return id;
  } catch { /* Only tokens already checked by getUser or verifyOtp reach this helper. */ }
  throw new RequestError(401, 'Please sign in again.');
}

function adminRole(role: unknown) {
  if (typeof role !== 'string') return false;
  const parts = role.toLowerCase().replace(/[\[\]{}"';]/g, '')
    .replace(/admin_broadcaster|broadcaster_admin/g, 'admin,broadcaster')
    .split(/\s*[,+&/]\s*/).map(value => value.trim());
  return parts.some(value => ['admin', 'super-admin', 'super_admin', 'superadmin'].includes(value));
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'POST') return reply(405, { error: 'Method not allowed.' });

  let cleanup: (() => Promise<void>) | undefined;
  try {
    if (Number(request.headers.get('content-length') || 0) > 4096) throw new RequestError(413, 'Request is too large.');
    const raw = await request.text();
    if (raw.length > 4096) throw new RequestError(413, 'Request is too large.');
    let body;
    try { body = JSON.parse(raw); } catch { throw new RequestError(400, 'Invalid request.'); }
    if (!body || typeof body !== 'object' || !['login', 'refresh', 'logout'].includes(body.action)) {
      throw new RequestError(400, 'Invalid request.');
    }
    if (Deno.env.get('ICMU_WEB_ACCOUNT_BOUNDARY_READY') !== 'true') {
      throw new RequestError(503, 'Shared admin sign-in is awaiting the ICMU account security update.');
    }

    const memberUrl = requiredEnv('SUPABASE_URL');
    const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = requiredEnv('SUPABASE_ANON_KEY');
    const webUrl = requiredEnv('ICMU_WEB_URL');
    const webKey = requiredEnv('ICMU_WEB_PUBLISHABLE_KEY');
    const service = createClient(memberUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    async function webRpc(name: string, args: Record<string, unknown>, index?: string, token?: string) {
      const response = await fetch(`${webUrl}/rest/v1/rpc/${name}`, {
        method: 'POST',
        headers: {
          apikey: webKey,
          'Content-Type': 'application/json',
          ...(index && token ? { 'x-user-index': index, 'x-contacts-token': token } : {}),
        },
        body: JSON.stringify(args),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new RequestError(503, 'ICMU account verification is temporarily unavailable.');
      return response.json();
    }

    if (body.action === 'login') {
      const index = typeof body.index_number === 'string' ? body.index_number.trim() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      if (!index || index.length > 100 || !password || new TextEncoder().encode(password).length > 72) {
        throw new RequestError(400, 'Enter your ICMU index number and password.');
      }

      // This existing endpoint checks the password, active admin role, and rate limit.
      const proof = await webRpc('create_contacts_session', {
        p_index_number: index, p_password: password, p_remember_me: false,
      });
      if (proof?.success !== true || typeof proof.token !== 'string' || !/^[a-f0-9]{64}$/.test(proof.token) ||
          !Number.isFinite(Date.parse(proof.expires_at)) || Date.parse(proof.expires_at) <= Date.now()) {
        throw new RequestError(401, 'Sign-in failed. Check your details and active admin access, or try again later.');
      }
      cleanup = async () => { await webRpc('revoke_contacts_session', { p_token: proof.token }); };

      // The proof resolves its own immutable identity even if an index changes mid-login.
      const profile = await webRpc('current_account_profile', {}, index, proof.token);
      if (profile?.is_active !== true || profile.index_number !== index || !adminRole(profile.role) ||
          typeof profile.id !== 'string' || !/^[\da-f-]{36}$/i.test(profile.id)) {
        throw new RequestError(403, 'This account does not have active admin access.');
      }
      const { data: linkedId, error: lookupError } = await service.rpc('admin_bridge_identity', { p_web_user_id: profile.id });
      if (lookupError) throw new RequestError(503, 'Admin sign-in is temporarily unavailable.');

      async function readMappedUser(id: string) {
        const { data, error } = await service.auth.admin.getUserById(id);
        if (error || data.user?.app_metadata?.identity_provider !== 'icmu-web' ||
            data.user.app_metadata.web_user_id !== profile.id) {
          throw new RequestError(403, 'This account needs an administrator to check its access.');
        }
        return data.user;
      }
      let memberUser;
      if (linkedId) {
        memberUser = await readMappedUser(linkedId);
      } else {
        // A pre-existing email is never adopted as proof of identity.
        const { data, error } = await service.auth.admin.createUser({
          email: `icmu-web-${profile.id}@admin.icmu.invalid`,
          email_confirm: true,
          app_metadata: {
            identity_provider: 'icmu-web', web_user_id: profile.id,
            web_index: index, display_name: profile.full_name || 'ICMU admin',
          },
        });
        if (error || !data.user) {
          // Another first login may have provisioned the same immutable identity.
          // Retry only the trusted mapping; never adopt a matching email.
          for (let attempt = 0; attempt < 3 && !memberUser; attempt += 1) {
            await new Promise(resolve => setTimeout(resolve, 150));
            const { data: concurrentId, error: concurrentError } = await service.rpc('admin_bridge_identity', { p_web_user_id: profile.id });
            if (concurrentError) throw new RequestError(503, 'Admin sign-in is temporarily unavailable.');
            if (concurrentId) memberUser = await readMappedUser(concurrentId);
          }
          if (!memberUser) throw new RequestError(409, 'This account needs an administrator to check its access.');
        } else {
          memberUser = data.user;
          const { data: linked, error: linkError } = await service.rpc('admin_bridge_link_identity', {
            p_web_user_id: profile.id, p_user_id: memberUser.id,
          });
          if (linkError || linked !== true) throw new RequestError(503, 'Admin sign-in is temporarily unavailable.');
        }
      }

      const { data: link, error: linkError } = await service.auth.admin.generateLink({ type: 'magiclink', email: memberUser.email! });
      if (linkError || !link.properties?.hashed_token) throw new RequestError(503, 'Admin sign-in is temporarily unavailable.');
      const sessionClient = createClient(memberUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data: verified, error: sessionError } = await sessionClient.auth.verifyOtp({
        token_hash: link.properties.hashed_token, type: 'email',
      });
      if (sessionError || !verified.session || verified.user?.id !== memberUser.id) {
        throw new RequestError(503, 'Admin sign-in is temporarily unavailable.');
      }
      const session = verified.session;
      const { data: registered, error: registerError } = await service.rpc('admin_bridge_register', {
        p_user_id: memberUser.id, p_session_id: sessionId(session.access_token),
        p_web_user_id: profile.id, p_web_index: index,
        p_web_token: proof.token, p_web_expires_at: proof.expires_at,
      });
      if (registerError || registered !== true) {
        await service.auth.admin.signOut(session.access_token, 'local');
        throw new RequestError(503, 'Admin access could not be confirmed. Please try again.');
      }
      cleanup = undefined;
      return reply(200, { access_token: session.access_token, refresh_token: session.refresh_token });
    }

    const authorization = request.headers.get('authorization') || '';
    if (!authorization.startsWith('Bearer ')) throw new RequestError(401, 'Please sign in again.');
    const jwt = authorization.slice(7);
    const { data: identity, error: identityError } = await service.auth.getUser(jwt);
    if (identityError || !identity.user || identity.user.app_metadata?.identity_provider !== 'icmu-web') {
      throw new RequestError(401, 'Please sign in again.');
    }
    const args = { p_user_id: identity.user.id, p_session_id: sessionId(jwt) };
    const { data: proof, error: proofError } = await service.rpc('admin_bridge_session', args);
    if (proofError) throw new RequestError(503, 'Admin access could not be checked. Please try again.');

    if (body.action === 'logout') {
      const { data: revoked, error } = await service.rpc('admin_bridge_revoke', args);
      if (error || revoked !== true) throw new RequestError(503, 'Sign-out could not be completed. Please try again.');
      if (proof?.web_token) {
        try { await webRpc('revoke_contacts_session', { p_token: proof.web_token }); } catch { /* The member lease is already revoked. */ }
      }
      await service.auth.admin.signOut(jwt, 'local');
      return reply(200, { success: true });
    }

    let allowed = false;
    if (proof?.web_token && proof.web_index && Date.parse(proof.web_expires_at) > Date.now()) {
      try { allowed = await webRpc('can_manage_contacts', {}, proof.web_index, proof.web_token) === true; }
      catch { /* Revoke the member lease when the identity service is unavailable. */ }
    }
    const { data: renewed, error: renewError } = await service.rpc('admin_bridge_renew', { ...args, p_allowed: allowed });
    if (renewError) throw new RequestError(503, 'Admin access could not be checked. Please try again.');
    if (!allowed || renewed !== true) throw new RequestError(403, 'Your admin session has ended. Please sign in again.');
    return reply(200, { allowed: true });
  } catch (error) {
    if (cleanup) {
      try { await cleanup(); } catch { /* Unused credentials expire on the identity service. */ }
    }
    if (error instanceof RequestError) return reply(error.status, { error: error.message });
    return reply(503, { error: 'Admin sign-in is temporarily unavailable. Please try again.' });
  }
});
