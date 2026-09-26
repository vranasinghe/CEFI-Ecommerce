#!/usr/bin/env node
/**
 * Fails if a tracked .sql file has no statements left, or if the database
 * lock-down script loses the statements that close write access.
 *
 * Why: a manual web edit once emptied fix_supabase_security.sql (commit
 * 2b57573), silently dropping the step that removes the old "any logged-in
 * user can write products" policies. Nothing failed, so it went unnoticed.
 */
const { execSync } = require('child_process');
const fs = require('fs');

const stripped = (sql) => sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '').trim();
const files = execSync('git ls-files "*.sql"', { encoding: 'utf8' }).split('\n').filter(Boolean);
const problems = [];

for (const f of files) {
  if (!stripped(fs.readFileSync(f, 'utf8'))) problems.push(`${f} contains no SQL statements (comments only or empty).`);
}

const LOCKDOWN = 'fix_supabase_security.sql';
if (files.includes(LOCKDOWN)) {
  const sql = stripped(fs.readFileSync(LOCKDOWN, 'utf8'));
  for (const [needle, why] of [
    [/ENABLE ROW LEVEL SECURITY/i, 'enable row level security'],
    [/DROP POLICY/i, 'drop the old permissive policies'],
    [/pg_policies/i, 'remove every existing catalogue policy'],
    [/contact_messages/i, 'lock the legacy tables'],
  ]) if (!needle.test(sql)) problems.push(`${LOCKDOWN} no longer contains the step to ${why}.`);
  if (/CREATE POLICY[^;]*\bFOR\s+(INSERT|UPDATE|DELETE|ALL)\b/i.test(sql)) {
    problems.push(`${LOCKDOWN} creates a write policy — browser roles must stay read-only.`);
  }
} else {
  problems.push(`${LOCKDOWN} is missing from the repository.`);
}

if (problems.length) {
  console.error('❌ SQL check failed:\n - ' + problems.join('\n - '));
  process.exit(1);
}
console.log(`✅ SQL check: ${files.length} tracked .sql files all contain statements; lock-down script intact.`);
