const { recordAdminAction } = require('../lib/audit-log');
const { resolveSession } = require('../lib/session');

/**
 * Express middleware: proves WHO the caller is from the HttpOnly session
 * cookies (lib/session.js) — any signed-in customer passes. For admin-only
 * routes use requireAdmin, which also checks WHAT they are allowed to do.
 *
 * Tokens are accepted ONLY from cookies: there is deliberately no
 * Authorization-header path, so a token can never be handled by page
 * JavaScript (Master-Vault items 1–3).
 */
const requireAuth = async (req, res, next) => {
  try {
    const session = await resolveSession(req, res);
    if (session.error === 'unavailable') {
      return res.status(503).json({ success: false, message: 'Sign-in is temporarily unavailable. Please try again.' });
    }
    if (session.error) {
      return res.status(401).json({
        success: false,
        code: session.error === 'mismatch' ? 'SESSION_ENDED' : 'UNAUTHENTICATED',
        message: session.error === 'mismatch'
          ? 'Your session was ended for security reasons. Please sign in again.'
          : 'Please sign in to continue.',
      });
    }
    req.user = session.user;
    req.sessionId = session.sessionId;
    return next();
  } catch (err) {
    console.error('Authentication middleware error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error during authentication.' });
  }
};

/**
 * CSRF guard for cookie-authenticated APIs. SameSite=Strict cookies already
 * aren't sent cross-site; this also refuses any state-changing request the
 * browser labels as coming from another site (Sec-Fetch-Site), as a second
 * layer. Requests without the header (non-browser clients) are unaffected —
 * they can't carry a victim's cookies anyway.
 */
function csrfGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const site = req.headers['sec-fetch-site'];
  if (site && site !== 'same-origin' && site !== 'none') {
    console.warn(`⛔ [csrf] refused ${req.method} ${req.path} (Sec-Fetch-Site: ${site})`);
    return res.status(403).json({ success: false, message: 'Cross-site request refused.' });
  }
  return next();
}

// Admin allowlist, read per call so it honours env loaded after import (and
// so a Vercel env-var change takes effect on next request, no redeploy of
// this file needed). ADMIN_EMAILS is a comma-separated list, e.g.
// "owner@yourcompany.com,ops@yourcompany.com" — set in Vercel, never in source.
// No default: an unset ADMIN_EMAILS means nobody matches by email (fail
// closed), not "fall back to some address baked into the code".
function getAdminEmails() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * A user is an admin when either:
 *  - app_metadata.role === 'admin' (only settable with the service-role key,
 *    so a customer can never grant it to themselves), or
 *  - their CONFIRMED email is on the ADMIN_EMAILS allowlist. Unconfirmed
 *    addresses never count — anyone can sign up with an address they don't own.
 */
function isAdminUser(user) {
  if (!user) return false;
  if (user.app_metadata && user.app_metadata.role === 'admin') return true;
  const email = String(user.email || '').trim().toLowerCase();
  return Boolean(email && user.email_confirmed_at && getAdminEmails().includes(email));
}

/**
 * requireAuth + role check. Use on every route that changes the catalogue,
 * reads other customers' data, or can send email to arbitrary addresses.
 *
 * Both outcomes are logged (audit trail): who tried, what they hit, and
 * whether it was allowed. A stream of denials for the same account is a
 * signal worth watching in production logs.
 */
const requireAdmin = (req, res, next) => {
  requireAuth(req, res, () => {
    if (!isAdminUser(req.user)) {
      if (getAdminEmails().length === 0) {
        console.warn('⚠️  ADMIN_EMAILS is not set — no email can pass requireAdmin (app_metadata.role still works). Set it in Vercel.');
      }
      recordAdminAction(req, 'denied');
      return res.status(403).json({ success: false, message: 'Admin access required.' });
    }
    recordAdminAction(req, 'allowed');
    return next();
  });
};

module.exports = {
  requireAuth,
  requireAdmin,
  isAdminUser,
  csrfGuard
};
