import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

// This prepared upstream change is tested with the sibling app's existing test dependency.
const requireWeb = createRequire(new URL('../../icmu-web/package.json', import.meta.url));
const { PGlite } = requireWeb('@electric-sql/pglite');
const { pgcrypto } = requireWeb('@electric-sql/pglite/contrib/pgcrypto');
const superId = '10000000-0000-4000-8000-000000000001';
const writerId = '10000000-0000-4000-8000-000000000002';

test('prepared website account boundary enforces real credentials and private columns', async () => {
  const db = new PGlite({ extensions: { pgcrypto } });
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema extensions; create extension pgcrypto with schema extensions;
      create schema auth;
      create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
      create table auth.identities(id uuid primary key,user_id uuid,provider text);
      create table auth.sessions(id uuid primary key,user_id uuid,not_after timestamptz);
      create function auth.uid() returns uuid language sql stable as $$ select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;
      create function auth.jwt() returns jsonb language sql stable as $$ select nullif(current_setting('request.jwt.claims',true),'')::jsonb $$;
      grant usage on schema auth to anon,authenticated;
      create table public.users(id uuid primary key,index_number text unique,full_name text,role text,is_active boolean,
        password_hash text,email text unique,avatar_url text,created_at timestamptz default now(),last_login timestamptz,active_sessions jsonb,user_settings jsonb);
      grant all on public.users to anon,authenticated,service_role;
    `);
    for (const name of ['20261005120802_admin_contacts_saver.sql', '20261005121022_contacts_session_boundary.sql']) {
      await db.exec(await readFile(new URL(`../../icmu-web/supabase/migrations/${name}`, import.meta.url), 'utf8'));
    }
    await db.exec(await readFile(new URL('../supabase/upstream/20261014141029_shared_admin_account_boundary.sql', import.meta.url), 'utf8'));
    await db.exec(await readFile(new URL('../supabase/upstream/20261014161420_member_device_history.sql', import.meta.url), 'utf8'));
    await db.exec(`insert into public.users(id,index_number,full_name,role,is_active,password_hash) values
      ('${superId}','test-super','Synthetic super admin','super-admin',true,extensions.crypt('safe-test-password',extensions.gen_salt('bf'))),
      ('${writerId}','test-writer','Synthetic writer','writer',true,extensions.crypt('safe-test-password',extensions.gen_salt('bf')));
      set role anon;`);

    await assert.rejects(db.query('select password_hash from public.users'), error => error.code === '42501');
    await assert.rejects(db.query('select user_settings from public.users'), error => error.code === '42501');
    assert.equal((await db.query('select id,full_name from public.users')).rows.length, 2);
    await db.query("select set_config('request.headers',$1,false)", [JSON.stringify({ 'x-user-index': 'test-super' })]);
    await assert.rejects(db.query("select public.set_user_password('test-writer','attacker-password')"), error => error.code === '42501');
    await assert.rejects(db.query('select public.current_account_profile()'), error => error.code === '42501');
    assert.equal((await db.query(`update public.users set role='super-admin' where id='${writerId}' returning id`)).rows.length, 0);

    const writer = (await db.query("select public.verify_user_login('test-writer','safe-test-password') result")).rows[0].result;
    assert.equal(writer.success, true);
    assert.match(writer.token, /^[a-f0-9]{64}$/);
    await db.query("select set_config('request.headers',$1,false)", [JSON.stringify({ 'x-user-index': 'test-writer', 'x-contacts-token': writer.token })]);
    assert.equal((await db.query('select accounts_private.current_user_id() id')).rows[0].id, writerId);
    assert.equal((await db.query('select public.current_account_profile() result')).rows[0].result.id, writerId);
    assert.equal((await db.query('select public.can_manage_contacts() allowed')).rows[0].allowed, false);
    await db.query("select public.update_user_settings($1,'{\"theme\":\"dark\"}'::jsonb)", [writerId]);
    assert.equal((await db.query('select public.account_profile($1) result', [writerId])).rows[0].result.password_hash, undefined);
    await assert.rejects(db.query('select public.account_profile($1)', [superId]), error => error.code === '42501');
    await assert.rejects(db.query("select public.set_user_password('test-super','attacker-password')"), error => error.code === '42501');
    await assert.rejects(db.query('select public.account_directory()'), error => error.code === '42501');
    assert.equal((await db.query("select public.update_user_profile($1,'Updated writer') result", [writerId])).rows[0].result, true);
    await assert.rejects(db.query("select public.update_user_profile($1,'Not allowed')", [superId]), error => error.code === '42501');
    assert.equal((await db.query("select public.set_user_password('test-writer','writer-changed-password') result")).rows[0].result.success, true);
    assert.equal((await db.query('select accounts_private.current_user_id() id')).rows[0].id, null);

    const superAdmin = (await db.query("select public.verify_user_login('test-super','safe-test-password') result")).rows[0].result;
    await db.query("select set_config('request.headers',$1,false)", [JSON.stringify({ 'x-user-index': 'test-super', 'x-contacts-token': superAdmin.token })]);
    assert.equal((await db.query('select public.can_manage_contacts() allowed')).rows[0].allowed, true);
    assert.equal((await db.query('select public.current_account_profile() result')).rows[0].result.id, superId);
    // Member sign-ins appear in the same device list and carry revocable proofs.
    const deviceId = '50000000-0000-4000-8000-000000000001';
    const memberProof = (await db.query("select public.create_contacts_session('test-super','safe-test-password',false) result")).rows[0].result;
    const memberHeaders = JSON.stringify({'x-user-index':'test-super','x-contacts-token':memberProof.token});
    await db.query("select set_config('request.headers',$1,false)",[memberHeaders]);
    assert.equal((await db.query('select public.register_member_device($1,$2) result',[deviceId,'Mozilla/5.0 Windows Chrome/120'])).rows[0].result,true);
    assert.equal((await db.query('select public.register_member_device($1,$2) result',[deviceId,'Mozilla/5.0 Windows Chrome/120'])).rows[0].result,true);
    const profile = (await db.query('select public.current_account_profile() result')).rows[0].result;
    assert.equal(profile.active_sessions.length,1);
    assert.equal(profile.active_sessions[0].sessionId,'icmu-member:'+deviceId);
    assert.match(profile.active_sessions[0].deviceName,/Windows.*Chrome.*ICMU Member/);
    assert.ok(profile.last_login);
    await assert.rejects(db.query('select * from accounts_private.member_portal_sessions'),e=>e.code==='42501');
    await assert.rejects(db.query('select public.register_member_device($1,$2)',['50000000-0000-4000-8000-000000000002','Browser']),e=>e.code==='22023');
    await db.query("select set_config('request.headers',$1,false)",[JSON.stringify({'x-user-index':'test-super','x-contacts-token':superAdmin.token})]);
    await db.query("select public.update_active_sessions($1,'[]'::jsonb)",[superId]);
    await db.query("select set_config('request.headers',$1,false)",[memberHeaders]);
    assert.equal((await db.query('select public.can_manage_contacts() allowed')).rows[0].allowed,false);
    await assert.rejects(db.query('select public.register_member_device($1,$2)',[deviceId,'Browser']),e=>e.code==='42501');
    await db.query("select set_config('request.headers',$1,false)",[JSON.stringify({'x-user-index':'test-super','x-contacts-token':superAdmin.token})]);
    assert.equal((await db.query('select public.current_account_profile() result')).rows[0].result.active_sessions.length,0);
    const directory = (await db.query('select public.account_directory() result')).rows[0].result;
    assert.equal(directory.length, 2);
    assert.equal(directory[0].password_hash, undefined);
    assert.equal(directory[0].active_sessions, undefined);
    assert.equal((await db.query(`update public.users set full_name='Renamed writer' where id='${writerId}' returning id`)).rows.length, 1);
    assert.equal((await db.query("select public.set_user_password('test-writer','new-safe-password') result")).rows[0].result.success, true);
    await db.query("select set_config('request.headers',$1,false)", [JSON.stringify({ 'x-user-index': 'test-writer', 'x-contacts-token': writer.token })]);
    assert.equal((await db.query('select accounts_private.current_user_id() id')).rows[0].id, null);

    for (let count = 0; count < 10; count += 1) {
      assert.equal((await db.query("select public.verify_user_login('test-writer','wrong-password') result")).rows[0].result.success, false);
    }
    assert.equal((await db.query("select public.verify_user_login('test-writer','new-safe-password') result")).rows[0].result.success, false);

    // A claimed email or header cannot stand in for a confirmed live Google session.
    const googleId = '20000000-0000-4000-8000-000000000001';
    const googleSession = '30000000-0000-4000-8000-000000000001';
    await db.exec(`reset role;
      update public.users set email='synthetic@example.test' where id='${writerId}';
      insert into auth.users values('${googleId}','synthetic@example.test',now());
      insert into auth.identities values('40000000-0000-4000-8000-000000000001','${googleId}','google');
      insert into auth.sessions values('${googleSession}','${googleId}',now()+interval '1 hour');
      set role authenticated;`);
    await db.query("select set_config('request.headers',$1,false)", [JSON.stringify({ 'x-user-index': 'test-writer' })]);
    assert.equal((await db.query('select accounts_private.current_user_id() id')).rows[0].id, null);
    await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify({ sub: googleId, session_id: googleSession })]);
    assert.equal((await db.query('select accounts_private.current_user_id() id')).rows[0].id, writerId);
    await assert.rejects(db.query("select public.link_google_identity($1,'spoofed@example.test',null)", [writerId]), error => error.code === '42501');
    assert.equal((await db.query("select public.link_google_identity($1,'synthetic@example.test',null) result", [writerId])).rows[0].result, true);
    await db.exec(`reset role; delete from auth.sessions where id='${googleSession}'; set role authenticated;`);
    assert.equal((await db.query('select accounts_private.current_user_id() id')).rows[0].id, null);
  } finally { await db.close(); }
});
