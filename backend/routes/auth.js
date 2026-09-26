/**
 * routes/auth.js — /api/auth/*
 * ---------------------------------------------------------------------------
 * All sign-in flows run on the server so tokens only ever live in HttpOnly
 * cookies (see lib/session.js). Responses carry the user profile, never a
 * token.
 */
const express = require('express');
const { z } = require('zod');
const { validateBody } = require('../lib/schemas');
const { authLimiter, userApiLimiter } = require('../lib/rate-limit');
const { lockedUntil, recordAttempt } = require('../lib/login-guard');
const {
  authClient, setSessionCookies, resolveSession, revokeAllSessions,
  pkceClient, setPkceCookie, readPkceCookie, clearPkceCookie,
} = require('../lib/session');
const { isAdminUser } = require('../middleware/auth');

const router = express.Router();

// ── Schemas ──────────────────────────────────────────────────────────────────
const email = z.string().trim().toLowerCase().max(254)
  .regex(/^[^\s@<>"'`()]+@[^\s@<>"'`()]+\.[^\s@<>"'`()]{2,}$/, 'A valid email address is required.');
const loginSchema = z.object({ email, password: z.string().min(1, 'Password is required.').max(200) }).strict();
const signupSchema = z.object({
  name: z.string().trim().min(1, 'Please enter your full name.').max(200),
  email,
  // 72 bytes is bcrypt's limit; longer passwords would be silently truncated.
  password: z.string().min(8, 'Password must be at least 8 characters.').max(72),
}).strict();
const oauthStartSchema = z.object({ provider: z.enum(['google', 'facebook']) }).strict();
const oauthCallbackSchema = z.object({ code: z.string().trim().min(1).max(500) }).strict();

// ── Helpers ──────────────────────────────────────────────────────────────────
/** The profile the frontend needs — never tokens. */
function publicUser(user) {
  const meta = user.user_metadata || {};
  return {
    id: user.id,
    email: user.email || '',
    name: meta.full_name || meta.name || String(user.email || '').split('@')[0],
    avatar: meta.avatar_url || meta.picture || null,
    provider: user.app_metadata?.provider || 'email',
    role: isAdminUser(user) ? 'admin' : 'customer',
    emailConfirmed: Boolean(user.email_confirmed_at),
    joinedAt: user.created_at,
  };
}

const unavailable = (res) => res.status(503).json({ success: false, message: 'Sign-in is temporarily unavailable. Please try again.' });

function lockedResponse(res, until) {
  const seconds = Math.max(1, Math.ceil((until.getTime() - Date.now()) / 1000));
  res.setHeader('Retry-After', String(seconds));
  return res.status(429).json({
    success: false,
    code: 'ACCOUNT_LOCKED',
    message: `Too many failed sign-in attempts. Please try again in ${Math.ceil(seconds / 60)} minute(s).`,
  });
}

/** Where the OAuth provider sends the user back: this site's /auth/callback. */
function siteOrigin(req) {
  // Origin was already checked against the allowlist by the CORS middleware.
  if (req.headers.origin) return req.headers.origin.replace(/\/+$/, '');
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL.replace(/\/+$/, '');
  const proto = String(req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim();
  return `${proto}://${req.headers['x-forwarded-host'] || req.headers.host}`;
}

// ── Email + password ─────────────────────────────────────────────────────────
router.post('/login', authLimiter, validateBody(loginSchema), async (req, res) => {
  const client = authClient();
  if (!client) return unavailable(res);
  const { email: addr, password } = req.body;

  try {
    const until = await lockedUntil(addr);
    if (until) return lockedResponse(res, until);

    const { data, error } = await client.auth.signInWithPassword({ email: addr, password });
    if (error || !data?.session) {
      if (/not confirmed/i.test(error?.message || '')) {
        return res.status(403).json({ success: false, code: 'EMAIL_UNCONFIRMED', message: 'Please confirm your email address (check your inbox), then sign in.' });
      }
      const nowLocked = await recordAttempt(addr, false);
      if (nowLocked) return lockedResponse(res, nowLocked);
      return res.status(401).json({ success: false, message: 'Incorrect email or password.' });
    }

    await recordAttempt(addr, true);
    setSessionCookies(req, res, data.session);
    return res.json({ success: true, user: publicUser(data.user) });
  } catch (err) {
    console.error('❌ [auth] login failed:', err.message);
    return unavailable(res);
  }
});

router.post('/signup', authLimiter, validateBody(signupSchema), async (req, res) => {
  const client = authClient();
  if (!client) return unavailable(res);
  const { name, email: addr, password } = req.body;
  // Same message whether the address is new or already registered, so the
  // form can't be used to find out who has an account.
  const neutral = 'If this email can be registered, we have sent a confirmation link. Check your inbox, then sign in.';

  try {
    const { data, error } = await client.auth.signUp({ email: addr, password, options: { data: { full_name: name } } });
    if (error) {
      if (/password/i.test(error.message) && !/already/i.test(error.message)) {
        return res.status(400).json({ success: false, message: error.message });
      }
      if (/rate limit|too many/i.test(error.message)) {
        return res.status(429).json({ success: false, message: 'Too many attempts. Please wait a few minutes and try again.' });
      }
      return res.json({ success: false, needsConfirmation: true, message: neutral });
    }
    if (!data?.session) return res.json({ success: false, needsConfirmation: true, message: neutral });

    setSessionCookies(req, res, data.session);
    return res.json({ success: true, user: publicUser(data.user) });
  } catch (err) {
    console.error('❌ [auth] signup failed:', err.message);
    return unavailable(res);
  }
});

// ── Session ──────────────────────────────────────────────────────────────────
// 200 with user: null when signed out, so the app can check on every load
// without logging errors.
router.get('/me', userApiLimiter, async (req, res) => {
  try {
    const s = await resolveSession(req, res);
    if (s.error === 'unavailable') return unavailable(res);
    return res.json({ success: true, user: s.user ? publicUser(s.user) : null });
  } catch (err) {
    console.error('❌ [auth] me failed:', err.message);
    return res.json({ success: true, user: null });
  }
});

// Revokes EVERY session of the account (all devices), so all its access and
// refresh tokens stop working immediately — not just this browser's cookies.
router.post('/logout', async (req, res) => {
  try {
    await revokeAllSessions(req, res);
  } catch (err) {
    console.error('❌ [auth] logout revoke failed:', err.message);
  }
  return res.json({ success: true });
});

// ── OAuth (Google / Facebook) with PKCE ──────────────────────────────────────
router.post('/oauth/start', authLimiter, validateBody(oauthStartSchema), async (req, res) => {
  const { client, storage } = pkceClient();
  if (!client) return unavailable(res);
  const { data, error } = await client.auth.signInWithOAuth({
    provider: req.body.provider,
    options: { redirectTo: `${siteOrigin(req)}/auth/callback`, skipBrowserRedirect: true },
  });
  if (error || !data?.url) {
    console.error('❌ [auth] oauth start failed:', error?.message);
    return unavailable(res);
  }
  setPkceCookie(req, res, storage.mem);
  return res.json({ success: true, url: data.url });
});

router.post('/oauth/callback', authLimiter, validateBody(oauthCallbackSchema), async (req, res) => {
  const saved = readPkceCookie(req);
  clearPkceCookie(req, res); // one-time use
  if (!saved) return res.status(400).json({ success: false, message: 'This sign-in link has expired. Please try again.' });

  const { client } = pkceClient(saved);
  if (!client) return unavailable(res);
  const { data, error } = await client.auth.exchangeCodeForSession(req.body.code);
  if (error || !data?.session) {
    console.warn('⚠️  [auth] oauth code exchange failed:', error?.message);
    return res.status(400).json({ success: false, message: 'Sign-in could not be completed. Please try again.' });
  }
  setSessionCookies(req, res, data.session);
  return res.json({ success: true, user: publicUser(data.user) });
});

module.exports = router;
