/**
 * lib/session.js
 * ---------------------------------------------------------------------------
 * Cookie-based sessions (Master-Vault Module 1: items 1–3, 5, 12, 14, 15).
 *
 * The browser never sees a Supabase token. The backend signs the user in and
 * stores the tokens in three HttpOnly cookies:
 *
 *   access  — Supabase access token (JWT), Max-Age 15 min
 *   refresh — Supabase refresh token, separate cookie, Max-Age 7 days
 *   fp      — HMAC binding the session to the browser that signed in
 *
 * All are HttpOnly (unreadable by page JavaScript, so XSS can't steal them),
 * SameSite=Strict (not sent on cross-site requests — CSRF), Secure and
 * "__Host-"-prefixed over HTTPS (HTTPS-only, this exact host, no subdomains).
 *
 * Every authenticated request verifies the access token with Supabase
 * (getUser), which also fails for sessions revoked by logout. Tokens older
 * than ACCESS_TOKEN_MAX_AGE (15 min) are refused and silently renewed with the
 * refresh cookie — Supabase rotates the refresh token on every renewal.
 */
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const ACCESS_TOKEN_MAX_AGE_S = Number(process.env.ACCESS_TOKEN_MAX_AGE_SECONDS) || 15 * 60;
const REFRESH_MAX_AGE_S = 7 * 24 * 60 * 60;
const PKCE_MAX_AGE_S = 10 * 60;

const NO_PERSIST = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };

/** A fresh, stateless Supabase client for auth calls (never shared between requests). */
function authClient(options = {}) {
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!process.env.SUPABASE_URL || !key) return null;
  return createClient(process.env.SUPABASE_URL, key, { auth: { ...NO_PERSIST, ...options } });
}

/** Service-role client for admin auth operations (session revocation). */
function adminClient() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: NO_PERSIST });
}

// ── Cookies ──────────────────────────────────────────────────────────────────
function isHttps(req) {
  return process.env.NODE_ENV === 'production' || String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
}

// "__Host-" cookies must be Secure, Path=/ and have no Domain — browsers
// enforce that, so the name itself guarantees the flags. Plain HTTP (local
// dev) can't set Secure cookies, so it uses unprefixed names.
function names(req) {
  const p = isHttps(req) ? '__Host-' : '';
  return { access: `${p}cefi_at`, refresh: `${p}cefi_rt`, fp: `${p}cefi_fp`, pkce: `${p}cefi_pkce` };
}

function cookieOptions(req, maxAgeSeconds, sameSite = 'strict') {
  return { httpOnly: true, secure: isHttps(req), sameSite, path: '/', maxAge: maxAgeSeconds * 1000 };
}

// ── Browser binding (item 12) ────────────────────────────────────────────────
// HMAC of the session id + the browser's User-Agent family (version numbers
// stripped so routine browser updates don't log people out). Stored in the
// fp cookie at sign-in; a stolen cookie replayed from another browser fails
// the check and that session is revoked. No fingerprint is stored anywhere
// else — this is not tracking, only a consistency check.
function fpKey() {
  const secret = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return crypto.createHash('sha256').update('cefi-session-fp:' + secret).digest();
}
function uaFamily(req) {
  return String(req.headers['user-agent'] || '').replace(/[\d._]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 300);
}
function fingerprint(req, sessionId) {
  return crypto.createHmac('sha256', fpKey()).update(`${sessionId}|${uaFamily(req)}`).digest('base64url');
}
function fingerprintMatches(req, sessionId, value) {
  const expected = Buffer.from(fingerprint(req, sessionId));
  const got = Buffer.from(String(value || ''));
  return got.length === expected.length && crypto.timingSafeEqual(got, expected);
}

function decodeJwt(token) {
  try { return JSON.parse(Buffer.from(String(token).split('.')[1], 'base64url').toString('utf8')); } catch { return null; }
}

/** Writes the session cookies. The response body never contains tokens. */
function setSessionCookies(req, res, session) {
  const n = names(req);
  const claims = decodeJwt(session.access_token) || {};
  res.cookie(n.access, session.access_token, cookieOptions(req, ACCESS_TOKEN_MAX_AGE_S));
  res.cookie(n.refresh, session.refresh_token, cookieOptions(req, REFRESH_MAX_AGE_S));
  res.cookie(n.fp, fingerprint(req, claims.session_id || ''), cookieOptions(req, REFRESH_MAX_AGE_S));
}

function clearSessionCookies(req, res) {
  const n = names(req);
  for (const name of [n.access, n.refresh, n.fp]) {
    res.clearCookie(name, { httpOnly: true, secure: isHttps(req), sameSite: 'strict', path: '/' });
  }
}

// ── Resolve the signed-in user for a request ────────────────────────────────
/**
 * Returns { user, sessionId } or { error: 'unauthenticated' | 'mismatch' }.
 * Renews the access token (and rotates cookies) when it's missing, invalid,
 * expired or older than ACCESS_TOKEN_MAX_AGE.
 */
async function resolveSession(req, res) {
  const n = names(req);
  const access = req.cookies?.[n.access];
  const refresh = req.cookies?.[n.refresh];
  if (!access && !refresh) return { error: 'unauthenticated' };

  const admin = adminClient();
  if (!admin) return { error: 'unavailable' };

  let user = null;
  let token = access;
  const claims = access ? decodeJwt(access) : null;
  const fresh = claims && claims.iat && (Date.now() / 1000 - claims.iat) <= ACCESS_TOKEN_MAX_AGE_S;

  if (access && fresh) {
    const { data, error } = await admin.auth.getUser(access);
    if (!error && data?.user) user = data.user;
  }

  if (!user && refresh) {
    const client = authClient();
    const { data, error } = await client.auth.refreshSession({ refresh_token: refresh });
    if (!error && data?.session && data?.user) {
      user = data.user;
      token = data.session.access_token;
      setSessionCookies(req, res, data.session); // rotated refresh token + new 15-min access token
    }
  }

  if (!user) {
    clearSessionCookies(req, res);
    return { error: 'unauthenticated' };
  }

  const sessionId = decodeJwt(token)?.session_id || '';
  if (!fingerprintMatches(req, sessionId, req.cookies?.[n.fp])) {
    // Cookie used from a different browser than the one that signed in:
    // treat as stolen — revoke that session and drop the cookies.
    console.warn(`⛔ [session] browser mismatch for user ${user.id} — session revoked`);
    await admin.auth.admin.signOut(token, 'local').catch(() => {});
    clearSessionCookies(req, res);
    return { error: 'mismatch' };
  }

  return { user, sessionId, accessToken: token };
}

/** Revokes every session of the user (all devices), then clears cookies. */
async function revokeAllSessions(req, res) {
  const n = names(req);
  const admin = adminClient();
  let token = req.cookies?.[n.access];
  // An expired/missing access token can still be traded for one to revoke with.
  if ((!token || !(await admin.auth.getUser(token)).data?.user) && req.cookies?.[n.refresh]) {
    const { data } = await authClient().auth.refreshSession({ refresh_token: req.cookies[n.refresh] });
    token = data?.session?.access_token || token;
  }
  if (token) await admin.auth.admin.signOut(token, 'global').catch(() => {});
  clearSessionCookies(req, res);
}

// ── OAuth (PKCE) helpers ─────────────────────────────────────────────────────
// signInWithOAuth writes a one-time code verifier to "storage"; we keep it in
// a short-lived HttpOnly cookie and hand it back for the code exchange, so it
// never reaches page JavaScript either.
function memoryStorage(initial = {}) {
  const mem = { ...initial };
  return { mem, getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; }, removeItem: (k) => { delete mem[k]; } };
}

function pkceClient(initial) {
  const storage = memoryStorage(initial);
  return { storage, client: authClient({ flowType: 'pkce', storage, storageKey: 'cefi', persistSession: true }) };
}

function setPkceCookie(req, res, mem) {
  // Lax: the user returns from Google via a cross-site navigation.
  res.cookie(names(req).pkce, Buffer.from(JSON.stringify(mem)).toString('base64url'), cookieOptions(req, PKCE_MAX_AGE_S, 'lax'));
}
function readPkceCookie(req) {
  try { return JSON.parse(Buffer.from(req.cookies?.[names(req).pkce] || '', 'base64url').toString('utf8')); } catch { return null; }
}
function clearPkceCookie(req, res) {
  res.clearCookie(names(req).pkce, { httpOnly: true, secure: isHttps(req), sameSite: 'lax', path: '/' });
}

module.exports = {
  ACCESS_TOKEN_MAX_AGE_S,
  authClient,
  adminClient,
  names,
  setSessionCookies,
  clearSessionCookies,
  resolveSession,
  revokeAllSessions,
  pkceClient,
  setPkceCookie,
  readPkceCookie,
  clearPkceCookie,
};
