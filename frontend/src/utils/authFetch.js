import supabase from './supabase';

/**
 * fetch() that attaches the signed-in user's Supabase access token.
 * Admin API routes verify this token server-side and check the admin role,
 * so admin screens must use this rather than plain fetch().
 */
export async function authFetch(url, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = new Headers(options.headers || {});
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  return fetch(url, { ...options, headers });
}

export default authFetch;
