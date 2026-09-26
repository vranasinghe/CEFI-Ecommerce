/**
 * lib/login-guard.js
 * ---------------------------------------------------------------------------
 * Per-account lockout (Master-Vault item 9): 5 failed sign-ins for the same
 * email within 15 minutes lock that email for 15 minutes. This complements
 * the per-IP rate limit — an attacker rotating IPs still can't keep guessing
 * one account's password.
 *
 * Counts live in the auth_login_attempts table (atomic Postgres functions, so
 * concurrent requests on different Vercel instances can't race). Emails are
 * stored only as SHA-256 hashes. Until the migration has been run, counts fall
 * back to this instance's memory.
 *
 * The lockout applies whether or not the account exists, and the message is
 * the same either way, so it can't be used to discover registered emails.
 */
const crypto = require('crypto');
const supabase = require('../supabaseClient');

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

const hashEmail = (email) => crypto.createHash('sha256').update(String(email).trim().toLowerCase()).digest('hex');

let dbMissing = !supabase;
const memory = new Map(); // hash -> { failures, windowStart, lockedUntil }

function useMemory(error) {
  if (error && /auth_login_(check|record)|schema cache|does not exist|function/i.test(error.message)) {
    if (!dbMissing) console.warn('⚠️  auth_login_attempts not found — account lockout is per-instance until the migration is run.');
    dbMissing = true;
    return true;
  }
  return false;
}

/** Returns the Date the email is locked until, or null if sign-in is allowed. */
async function lockedUntil(email) {
  const h = hashEmail(email);
  if (!dbMissing) {
    const { data, error } = await supabase.rpc('auth_login_check', { p_email_hash: h });
    if (!error) return data ? new Date(data) : null;
    if (!useMemory(error)) throw error;
  }
  const m = memory.get(h);
  return m && m.lockedUntil > Date.now() ? new Date(m.lockedUntil) : null;
}

/** Records the outcome; returns the lock expiry if this failure triggered one. */
async function recordAttempt(email, success) {
  const h = hashEmail(email);
  if (!dbMissing) {
    const { data, error } = await supabase.rpc('auth_login_record', { p_email_hash: h, p_success: success });
    if (!error) return data ? new Date(data) : null;
    if (!useMemory(error)) throw error;
  }
  if (success) { memory.delete(h); return null; }
  const now = Date.now();
  const m = memory.get(h);
  const entry = !m || now - m.windowStart > WINDOW_MS ? { failures: 0, windowStart: now, lockedUntil: 0 } : m;
  entry.failures += 1;
  if (entry.failures >= MAX_FAILURES) Object.assign(entry, { failures: 0, windowStart: now, lockedUntil: now + LOCK_MS });
  memory.set(h, entry);
  return entry.lockedUntil > now ? new Date(entry.lockedUntil) : null;
}

module.exports = { lockedUntil, recordAttempt, MAX_FAILURES };
