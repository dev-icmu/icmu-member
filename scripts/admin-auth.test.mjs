import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAdminAuthController, resolveAdminSession } from '../src/lib/adminAuth.js';

const user = { id: 'admin-one', app_metadata: { identity_provider: 'icmu-web', web_user_id: 'web-one' } };
const settle = () => new Promise(resolve => setTimeout(resolve, 0));

function harness(initialUser = user) {
  let currentUser = initialUser;
  let callback;
  let allowed = true;
  const events = [];
  const cache = { cancelQueries: async () => { events.push('cancel'); }, clear: () => { events.push('clear'); } };
  const client = {
    auth: {
      getUser: async () => ({ data: { user: currentUser }, error: null }),
      onAuthStateChange: handler => { callback = handler; return { data: { subscription: { unsubscribe() {} } } }; },
      setSession: async () => { currentUser = user; callback?.('SIGNED_IN', { user }); return { data: { user }, error: null }; },
      signOut: async () => { currentUser = null; callback?.('SIGNED_OUT', null); return { error: null }; },
    },
    functions: { invoke: async (_name, { body }) => ({
      data: body.action === 'login' ? { access_token: 'access', refresh_token: 'refresh' } : { allowed: true }, error: null,
    }) },
    rpc: async () => ({ data: allowed, error: null }),
  };
  const states = [];
  const controller = createAdminAuthController(client, cache, next => states.push(next));
  return { client, controller, events, states, setAllowed: value => { allowed = value; }, changeUser: value => { currentUser = value; callback?.('SIGNED_IN', { user: value }); } };
}

test('missing auth session is a signed-out state, not an admin error', async () => {
  const h = harness();
  h.client.auth.getUser = async () => ({ data: { user: null }, error: { name: 'AuthSessionMissingError' } });
  const state = await resolveAdminSession(h.client);
  assert.equal(state.isAdmin, false);
  assert.equal(state.authError, null);
});

test('user-editable role claims never grant access; only literal RPC true is accepted', async () => {
  const h = harness({ ...user, user_metadata: { role: 'super-admin', is_admin: true } });
  for (const value of [false, 'true', { allowed: true }, null]) {
    h.setAllowed(value);
    assert.equal((await resolveAdminSession(h.client)).isAdmin, false);
  }
});

test('shared identity must pass live bridge validation before the admin RPC', async () => {
  const h = harness();
  let queried = false;
  h.client.functions.invoke = async () => ({ data: { allowed: false }, error: null });
  h.client.rpc = async () => { queried = true; return { data: true, error: null }; };
  await assert.rejects(resolveAdminSession(h.client), /active admin access/);
  assert.equal(queried, false);
});

test('a slow successful role check cannot restore access after sign-out', async () => {
  const h = harness();
  let finish;
  h.client.rpc = () => new Promise(resolve => { finish = resolve; });
  h.controller.start();
  try {
    await settle();
    await h.controller.logout();
    finish({ data: true, error: null });
    await settle();
    assert.equal(h.states.at(-1).isAdmin, false);
    assert.equal(h.states.at(-1).user, null);
    assert.ok(h.events.includes('clear'));
  } finally { h.controller.stop(); }
});

test('revoked access clears the account cache and blocks the workspace', async () => {
  const h = harness();
  h.controller.start();
  try {
    await settle();
    assert.equal(h.states.at(-1).isAdmin, true);
    const cleared = h.events.filter(event => event === 'clear').length;
    h.setAllowed(false);
    await h.controller.refreshAccess({ silent: true });
    assert.equal(h.states.at(-1).isAdmin, false);
    assert.ok(h.events.filter(event => event === 'clear').length > cleared);
  } finally { h.controller.stop(); }
});

test('changing identity immediately hides privileged UI and clears previous data', async () => {
  const h = harness();
  h.controller.start();
  try {
    await settle();
    h.changeUser({ ...user, id: 'admin-two' });
    assert.equal(h.states.at(-1).isAdmin, false);
    assert.equal(h.states.at(-1).accessLoading, true);
    await settle();
    await settle();
    assert.equal(h.states.at(-1).user.id, 'admin-two');
  } finally { h.controller.stop(); }
});

test('shared login installs a member session only after the bridge returns credentials', async () => {
  const h = harness(null);
  h.controller.start();
  try {
    await settle();
    assert.equal((await h.controller.login('12345', 'example-password')).id, user.id);
    assert.equal(h.states.at(-1).isAdmin, true);
  } finally { h.controller.stop(); }
});

test('a bridge login completing after logout cannot install its returned session', async () => {
  const h = harness(null);
  let finish;
  h.client.functions.invoke = () => new Promise(resolve => { finish = resolve; });
  let installed = false;
  h.client.auth.setSession = async () => { installed = true; return { error: null }; };
  h.controller.start();
  try {
    await settle();
    const attempt = h.controller.login('12345', 'example-password');
    const rejected = assert.rejects(attempt, /interrupted/);
    await h.controller.logout();
    finish({ data: { access_token: 'access', refresh_token: 'refresh' }, error: null });
    await rejected;
    assert.equal(installed, false);
    assert.equal(h.states.at(-1).isAdmin, false);
  } finally { h.controller.stop(); }
});

test('a delayed SDK session write finishes before logout clears the session', async () => {
  const h = harness(null);
  let finish;
  h.client.auth.setSession = () => new Promise(resolve => {
    finish = () => { h.changeUser(user); resolve({ error: null }); };
  });
  h.controller.start();
  try {
    await settle();
    const rejected = assert.rejects(h.controller.login('12345', 'example-password'), /interrupted/);
    await settle();
    const logout = h.controller.logout();
    assert.equal(h.states.at(-1).isAdmin, false);
    finish();
    await Promise.all([rejected, logout]);
    await settle();
    assert.equal((await h.client.auth.getUser()).data.user, null);
    assert.equal(h.states.at(-1).isAdmin, false);
  } finally { h.controller.stop(); }
});

test('foreground validation hides the workspace while a heartbeat is still pending', async () => {
  const h = harness();
  h.controller.start();
  try {
    await settle();
    let finish;
    h.client.rpc = () => new Promise(resolve => { finish = resolve; });
    const heartbeat = h.controller.refreshAccess({ silent: true });
    await settle();
    assert.equal(h.states.at(-1).isAdmin, true);
    const foreground = h.controller.refreshAccess();
    assert.equal(h.states.at(-1).isAdmin, false);
    assert.equal(h.states.at(-1).accessLoading, true);
    finish({ data: true, error: null });
    await Promise.all([heartbeat, foreground]);
    assert.equal(h.states.at(-1).isAdmin, true);
  } finally { h.controller.stop(); }
});

test('tab focus preserves the mounted workspace until verification denies access', async () => {
  const previousDocument = globalThis.document;
  const listeners = new Map();
  globalThis.document = {
    visibilityState: 'visible',
    addEventListener: (name, handler) => listeners.set(name, handler),
    removeEventListener: name => listeners.delete(name),
  };
  const h = harness();
  h.controller.start();
  try {
    await settle();
    let finish;
    h.client.rpc = () => new Promise(resolve => { finish = resolve; });
    listeners.get('visibilitychange')();
    await settle();
    assert.equal(h.states.at(-1).isAdmin, true);
    assert.equal(h.states.at(-1).accessLoading, false);
    finish({ data: false, error: null });
    await settle();
    assert.equal(h.states.at(-1).isAdmin, false);
    assert.equal(h.states.at(-1).accessLoading, false);
  } finally {
    h.controller.stop();
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});
