import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'placeholder-key';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  console.warn(
    '[Supabase] Warning: Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in environment variables. ' +
    'Add them to your .env file to connect to your Supabase project.'
  );
}

let refreshPromise = null;

async function resilientFetch(input, init) {
  let response = await fetch(input, init);

  // If PostgREST or Functions returns 401 Unauthorized (e.g. JWT expired while tab was idle/backgrounded)
  if (response.status === 401 && typeof supabase?.auth?.refreshSession === 'function') {
    const url = typeof input === 'string' ? input : (input?.url || '');
    if (url.includes('/rest/v1/') || url.includes('/functions/v1/')) {
      try {
        if (!refreshPromise) {
          refreshPromise = supabase.auth.refreshSession().finally(() => {
            refreshPromise = null;
          });
        }
        const { data, error } = await refreshPromise;
        if (!error && data?.session?.access_token) {
          const newHeaders = new Headers(init?.headers || (typeof input === 'object' && input?.headers ? input.headers : {}));
          newHeaders.set('Authorization', `Bearer ${data.session.access_token}`);
          response = await fetch(input, { ...init, headers: newHeaders });
        }
      } catch {
        // Fall back to original response if refresh fails
      }
    }
  }

  return response;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: resilientFetch,
  },
});
