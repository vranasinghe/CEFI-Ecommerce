const supabase = require('../supabaseClient');
const { recordAdminAction } = require('../lib/audit-log');

/**
 * Express middleware to verify Supabase JWT token from Authorization header.
 * Proves WHO the caller is — any signed-in customer passes. For admin-only
 * routes use requireAdmin, which also checks WHAT they are allowed to do.
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required. Missing Bearer token.' });
    }

    const token = authHeader.split(' ')[1];

    // If Supabase client is initialized, verify the token with it
    if (supabase) {
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
      }

      // Attach user object to request
      req.user = user;
      return next();
    } else {
      // For local dev/mockData environment without Supabase
      // In a real scenario without Supabase, we would verify a standard JWT here (Module 1).
      // For now, we reject if there's no Supabase but auth is required.
      return res.status(501).json({ success: false, message: 'Authentication verification is currently only supported via Supabase in this environment.' });
    }
  } catch (err) {
    console.error('Authentication middleware error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error during authentication.' });
  }
};

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
  isAdminUser
};
