#!/usr/bin/env node
/**
 * scripts/check-rotation.js — is secret rotation overdue? (Master-Vault item 75)
 * ---------------------------------------------------------------------------
 * Reads the "Last rotation" log table in SECURITY.md. Exits 1 (and prints why)
 * when no rotation has ever been logged, or the most recent one is older than
 * MAX_AGE_DAYS. Run monthly by .github/workflows/rotation-reminder.yml, which
 * opens a GitHub issue so an overdue rotation can't be silently forgotten.
 *
 *   node scripts/check-rotation.js
 */
const fs = require('fs');
const path = require('path');

const MAX_AGE_DAYS = 180;
const doc = fs.readFileSync(path.join(__dirname, '..', 'SECURITY.md'), 'utf8');

const header = doc.indexOf('| Last rotation |');
if (header === -1) { console.error('SECURITY.md has no "| Last rotation |" table.'); process.exit(1); }

const dates = doc.slice(header).split('\n').slice(2)
  .filter((line) => line.startsWith('|'))
  .map((line) => (line.match(/^\|\s*(\d{4}-\d{2}-\d{2})\s*\|/) || [])[1])
  .filter(Boolean)
  .map((d) => new Date(d + 'T00:00:00Z'));

if (!dates.length) {
  console.log('Secret rotation is OVERDUE: no rotation has ever been logged in SECURITY.md.');
  process.exit(1);
}
const latest = new Date(Math.max(...dates));
const ageDays = Math.floor((Date.now() - latest) / 86400000);
if (ageDays > MAX_AGE_DAYS) {
  console.log(`Secret rotation is OVERDUE: last logged rotation was ${latest.toISOString().slice(0, 10)} (${ageDays} days ago; limit ${MAX_AGE_DAYS}).`);
  process.exit(1);
}
console.log(`Secret rotation OK: last logged ${latest.toISOString().slice(0, 10)} (${ageDays} days ago).`);
