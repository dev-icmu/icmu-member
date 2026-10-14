export const signedOutState = {
  user: null, isAuthenticated: false, isAdmin: false,
  loading: false, accessLoading: false, authError: null,
};

function timeout(promise, milliseconds = 15000) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('The connection timed out. Please try again.')), milliseconds);
    }),
  ]).finally(() => clearTimeout(timer));
}

export async function invokeAdminBridge(client, body) {
  const { data, error } = await timeout(client.functions.invoke('shared-admin-login', { body }), 35000);
  if (error) {
    let detail;
    try { detail = await error.context?.json(); } catch { /* Network failures have no response body. */ }
    throw new Error(detail?.error || 'Admin sign-in is temporarily unavailable. Please try again.');
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function resolveAdminSession(client) {
  // Proactively check session to refresh expired/expiring tokens
  if (typeof client.auth?.getSession === 'function') {
    try {
      const { data: sessionData } = await timeout(client.auth.getSession(), 10000);
      const session = sessionData?.session;
      if (session?.expires_at && (session.expires_at * 1000 - Date.now() < 120000)) {
        if (typeof client.auth?.refreshSession === 'function') {
          await timeout(client.auth.refreshSession(), 10000).catch(() => {});
        }
      }
    } catch {
      // Continue to getUser verification
    }
  }

  let { data, error } = await timeout(client.auth.getUser());
  if (error) {
    if (error.name === 'AuthSessionMissingError') return { ...signedOutState };
    // If token expired/invalid, attempt one refresh before failing
    if ((error.status === 401 || error.name === 'AuthApiError' || error.message?.includes('expired') || error.message?.includes('JWT')) && typeof client.auth?.refreshSession === 'function') {
      try {
        const { data: refreshed, error: refreshErr } = await timeout(client.auth.refreshSession(), 10000);
        if (!refreshErr && refreshed?.session) {
          const retry = await timeout(client.auth.getUser());
          data = retry.data;
          error = retry.error;
        }
      } catch {
        // Fall through to error check
      }
    }
    if (error) {
      if (error.name === 'AuthSessionMissingError') return { ...signedOutState };
      throw new Error('Your session could not be verified. Please sign in again.');
    }
  }
  const user = data?.user;
  if (!user) return { ...signedOutState };
  if (user.app_metadata?.identity_provider === 'icmu-web') {
    const response = await invokeAdminBridge(client, { action: 'refresh' });
    if (response?.allowed !== true) throw new Error('This account does not have active admin access.');
    if (response?.role && user.app_metadata) {
      user.app_metadata.role = response.role;
    }
  }
  const { data: allowed, error: accessError } = await timeout(client.rpc('admin_access'));
  if (accessError) throw new Error('Admin access could not be checked. Please try again.');
  return {
    ...signedOutState, user, isAuthenticated: true, isAdmin: allowed === true,
    authError: allowed === true ? null : 'This account does not have active admin access.',
  };
}

// Revision checks prevent a slow account check from restoring access after logout.
export function createAdminAuthController(client, queryClient, publish) {
  let active = false;
  let revision = 0;
  let operation = 0;
  let identity;
  let state = { ...signedOutState, loading: true, accessLoading: true };
  let subscription;
  let scheduled;
  let heartbeat;
  let pending;
  let busy = false;
  let sessionMutation = Promise.resolve();

  // Serialize SDK writes so a delayed setSession cannot complete after our logout.
  function mutateSession(action) {
    const result = sessionMutation.then(action, action);
    sessionMutation = result.then(() => {}, () => {});
    return result;
  }

  function emit(next) {
    state = next;
    if (active) publish(next);
  }
  function clearCache() {
    void queryClient.cancelQueries().catch(() => {});
    queryClient.clear();
  }
  function apply(next) {
    const nextIdentity = next.user?.id || null;
    if (identity !== nextIdentity || !next.isAdmin) {
      clearCache();
    } else if (next.isAdmin && typeof queryClient?.invalidateQueries === 'function') {
      void queryClient.invalidateQueries();
    }
    identity = nextIdentity;
    emit(next);
  }
  async function refreshAccess({ silent = false } = {}) {
    if (busy) return null;
    if (pending) {
      if (!silent) emit({ ...signedOutState, loading: true, accessLoading: true });
      return pending;
    }
    clearTimeout(scheduled);
    const ticket = ++revision;
    if (!silent || !state.isAdmin) emit({ ...signedOutState, loading: true, accessLoading: true });
    const check = (async () => {
      let next;
      try {
        next = await resolveAdminSession(client);
      } catch (error) {
        const isNetworkTimeout = error.message?.includes('timed out') || error.message?.includes('temporarily unavailable');
        if (silent && state.isAdmin && isNetworkTimeout) {
          return state;
        }
        next = { ...signedOutState, authError: error.message };
      }
      if (active && ticket === revision) apply(next);
      return ticket === revision ? next : null;
    })();
    pending = check;
    try { return await check; }
    finally { if (pending === check) pending = null; }
  }
  function invalidate() {
    ++revision;
    pending = null;
    clearTimeout(scheduled);
  }
  let lastFocusTime = 0;
  const onFocus = () => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    const now = Date.now();
    if (now - lastFocusTime < 100) return;
    lastFocusTime = now;
    void refreshAccess({ silent: true });
  };

  return {
    start() {
      active = true;
      const result = client.auth.onAuthStateChange((event, session) => {
        // Keep this callback synchronous so Supabase can release its auth lock.
        if (event === 'SIGNED_OUT') {
          ++operation;
          busy = false;
          invalidate();
          clearCache();
          identity = null;
          emit({ ...signedOutState });
          return;
        }
        if (event === 'INITIAL_SESSION') return;
        if (event === 'TOKEN_REFRESHED') {
          if (typeof queryClient?.invalidateQueries === 'function') {
            void queryClient.invalidateQueries();
          }
        }
        if (busy) return;
        if (session?.user?.id !== identity) {
          invalidate();
          clearCache();
          emit({ ...signedOutState, loading: true, accessLoading: true });
        }
        clearTimeout(scheduled);
        scheduled = setTimeout(() => { if (active) void refreshAccess({ silent: true }); }, 0);
      });
      subscription = result.data.subscription;
      void refreshAccess();
      heartbeat = setInterval(() => {
        if (state.isAuthenticated && (typeof document === 'undefined' || document.visibilityState === 'visible')) {
          void refreshAccess({ silent: true });
        }
      }, 300000);
      if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onFocus);
      if (typeof window !== 'undefined') window.addEventListener('focus', onFocus);
    },
    stop() {
      active = false;
      invalidate();
      clearInterval(heartbeat);
      subscription?.unsubscribe();
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onFocus);
      if (typeof window !== 'undefined') window.removeEventListener('focus', onFocus);
    },
    refreshAccess,
    async login(identifier, password) {
      const attempt = ++operation;
      busy = true;
      invalidate();
      clearCache();
      emit({ ...signedOutState, loading: true, accessLoading: true });
      try {
        const tokens = await invokeAdminBridge(client, { action: 'login', index_number: identifier.trim(), password });
        if (!tokens?.access_token || !tokens?.refresh_token) throw new Error('Sign-in could not be completed. Please try again.');
        if (attempt !== operation) throw new Error('Sign-in was interrupted. Please try again.');
        const result = await timeout(mutateSession(() => client.auth.setSession(tokens)));
        if (result.error) throw new Error('Sign-in failed. Check your details and try again.');
        if (attempt !== operation) throw new Error('Sign-in was interrupted. Please try again.');
        invalidate();
        busy = false;
        const verified = await refreshAccess();
        if (attempt !== operation || !verified) throw new Error('Sign-in was interrupted. Please try again.');
        if (!verified.isAdmin) {
          await timeout(mutateSession(() => client.auth.signOut({ scope: 'local' })));
          throw new Error(verified.authError || 'This account does not have active admin access.');
        }
        return verified.user;
      } catch (error) {
        if (attempt === operation) {
          invalidate();
          clearCache();
          emit({ ...signedOutState, authError: error.message });
        }
        throw error;
      } finally {
        if (attempt === operation) busy = false;
      }
    },
    async logout() {
      const attempt = ++operation;
      busy = true;
      const isShared = state.user?.app_metadata?.identity_provider === 'icmu-web';
      invalidate();
      clearCache();
      identity = null;
      emit({ ...signedOutState, loading: true, accessLoading: true });
      if (isShared) {
        try { await invokeAdminBridge(client, { action: 'logout' }); }
        catch { /* Browser sign-out still runs; the database lease expires within 60 seconds. */ }
      }
      if (attempt !== operation) return;
      try {
        const { error } = await timeout(mutateSession(() => client.auth.signOut({ scope: 'local' })));
        if (error) throw error;
        emit({ ...signedOutState });
      } catch {
        emit({ ...signedOutState, authError: 'Sign-out could not be completed. Please try again.' });
        throw new Error('Sign-out could not be completed. Please try again.');
      } finally { busy = false; }
    },
  };
}
