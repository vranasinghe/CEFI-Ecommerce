/**
 * lib/audit-log.js
 * ---------------------------------------------------------------------------
 * Durable audit trail for admin activity (Master-Vault items 40 and 69).
 * Every request that passes or fails requireAdmin is logged to the console
 * (Vercel logs) and, when the admin_audit_log table exists, stored there.
 *
 * Writes are fire-and-forget: an audit-store outage must never block or fail
 * the admin action itself. A missing table is detected once and remembered,
 * so the app keeps working before the migration has been run.
 */
const supabase = require('../supabaseClient');

let tableMissing = false;

function recordAdminAction(req, outcome) {
  const entry = {
    user_id: req.user?.id || null,
    email: req.user?.email || null,
    method: req.method,
    path: req.originalUrl.split('?')[0].slice(0, 300),
    outcome, // 'allowed' | 'denied'
    ip: String(req.headers['x-real-ip'] || req.ip || '').slice(0, 64),
    user_agent: String(req.headers['user-agent'] || '').slice(0, 300),
  };

  const line = `[admin-audit] ${outcome.toUpperCase()} ${entry.method} ${entry.path} — ${entry.email || entry.user_id}`;
  if (outcome === 'allowed') console.log(`✅ ${line}`); else console.warn(`⛔ ${line}`);

  if (!supabase || tableMissing) return;
  supabase.from('admin_audit_log').insert(entry).then(({ error }) => {
    if (!error) return;
    if (/admin_audit_log|schema cache|does not exist/i.test(error.message)) {
      tableMissing = true;
      console.warn('⚠️  admin_audit_log table not found — audit entries are console-only until the migration is run.');
    } else {
      console.error('❌ [admin-audit] could not store entry:', error.message);
    }
  }, (err) => console.error('❌ [admin-audit] store failed:', err.message));
}

module.exports = { recordAdminAction };
