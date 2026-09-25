#!/usr/bin/env node
/**
 * scripts/check-secrets.js
 * ---------------------------------------------------------------------------
 * Blocks commits and pull requests that ADD a credential to the repo. The
 * admin password once shipped in a code comment (commit d3b195b); this is the
 * guard that stops that from happening again.
 *
 * Scans only lines being added, so old history doesn't fail every run:
 *   node scripts/check-secrets.js --staged          pre-commit hook
 *   node scripts/check-secrets.js --range A...B     CI (PR / push diff)
 *
 * A line that really must contain a match (e.g. a documented example) can
 * opt out with the marker  secret-scan:allow  on the same line.
 */
const { execFileSync } = require('child_process');

const PLACEHOLDER = /your[-_]|example|placeholder|changeme|xxxx|<[^>]+>|\*{3,}|process\.env|import\.meta\.env/i;

// Each rule gets the added line; returns true when it's a finding.
const RULES = [
  {
    name: 'Email followed by a password (e.g. "admin@x.com / Secret123")',
    test: (l) => {
      if (/https?:\/\//i.test(l)) return false;
      const re = /[\w.+-]+@[\w-]+\.[\w.]+\s*(?:\/|:|,|\|)\s*(\S{6,})/g;
      for (const m of l.matchAll(re)) {
        const token = m[1].replace(/["'`),;]+$/, '');
        const isEmail = /^[\w.+-]+@[\w-]+\.[\w.]+$/.test(token); // "a@x.com, b@x.com" is a list, not a password
        const looksLikePassword = /[A-Za-z]/.test(token) && /[0-9!@#$%^&*]/.test(token);
        if (!isEmail && looksLikePassword && !PLACEHOLDER.test(token)) return true;
      }
      return false;
    },
  },
  {
    name: 'Hardcoded password assignment',
    test: (l) => {
      const m = l.match(/\b(?:password|passwd|pwd|pass|secret)\w*["']?\s*[:=]\s*(["'`])([^"'`\s]{6,})\1/i);
      return Boolean(m && !PLACEHOLDER.test(m[2]));
    },
  },
  {
    name: 'Supabase service-role key (JWT with role=service_role)',
    test: (l) => (l.match(/eyJ[\w-]+\.eyJ[\w-]+\.[\w-]+/g) || []).some((jwt) => {
      try { return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString()).role === 'service_role'; }
      catch { return false; }
    }),
  },
  { name: 'Resend API key', test: (l) => /\bre_[A-Za-z0-9_]{20,}\b/.test(l) },
  { name: 'Stripe secret key', test: (l) => /\b[sr]k_(?:live|test)_[A-Za-z0-9]{16,}/.test(l) },
  { name: 'GitHub token', test: (l) => /\bgh[pousr]_[A-Za-z0-9]{30,}\b/.test(l) },
  { name: 'AWS access key', test: (l) => /\bAKIA[0-9A-Z]{16}\b/.test(l) },
  { name: 'Private key block', test: (l) => /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(l) },
  {
    name: 'Env-file secret with a real value',
    test: (l) => {
      const m = l.match(/^\s*[A-Z0-9_]*(?:KEY|SECRET|PASS|PASSWORD|TOKEN)[A-Z0-9_]*\s*=\s*(\S+)/);
      return Boolean(m && m[1].length >= 8 && !PLACEHOLDER.test(m[1]) && !/^(true|false|\d+)$/i.test(m[1]));
    },
  },
];

// Files that must never be committed at all.
const FORBIDDEN_FILE = /(^|\/)\.env(\.[\w-]+)?$/;
const ALLOWED_FILE = /\.env\.example$/;
// The scanner's own rule definitions describe secrets; don't flag them.
const SELF = 'scripts/check-secrets.js';

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function main() {
  const args = process.argv.slice(2);
  let diffArgs;
  if (args[0] === '--staged') diffArgs = ['diff', '--cached', '-U0', '--no-color'];
  else if (args[0] === '--range' && args[1]) diffArgs = ['diff', '-U0', '--no-color', args[1]];
  else {
    console.error('usage: check-secrets.js --staged | --range <A...B>');
    process.exit(2);
  }

  const findings = [];
  let file = null;
  let lineNo = 0;

  for (const raw of git(diffArgs).split('\n')) {
    if (raw.startsWith('+++ ')) {
      file = raw.slice(4).replace(/^b\//, '');
      if (file !== '/dev/null' && FORBIDDEN_FILE.test(file) && !ALLOWED_FILE.test(file)) {
        findings.push({ file, line: '-', rule: 'Environment file committed (keep .env out of git)' });
      }
      continue;
    }
    const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
    if (hunk) { lineNo = Number(hunk[1]); continue; }
    if (!raw.startsWith('+') || raw.startsWith('+++')) continue;

    const line = raw.slice(1);
    const here = lineNo++;
    if (file === SELF || /secret-scan:allow/.test(line)) continue;
    for (const rule of RULES) {
      if (rule.test(line)) findings.push({ file, line: here, rule: rule.name });
    }
  }

  if (findings.length === 0) {
    console.log('✅ secret scan: no credentials in the added lines.');
    return;
  }
  console.error('\n❌ secret scan: possible credentials found — commit/PR blocked.\n');
  for (const f of findings) console.error(`   ${f.file}:${f.line}  ${f.rule}`);
  console.error('\n   Move the value to an environment variable (backend/.env locally, Vercel');
  console.error('   env vars in production). The matching text is deliberately not printed.');
  console.error('   If this is a false positive, add  secret-scan:allow  to that line.\n');
  process.exit(1);
}

main();
