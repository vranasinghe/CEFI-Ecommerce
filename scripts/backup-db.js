#!/usr/bin/env node
/**
 * scripts/backup-db.js — encrypted database backup (Master-Vault items 71, 73)
 * ---------------------------------------------------------------------------
 * Exports every CEFI table through Supabase's REST API and writes ONE file,
 * encrypted with AES-256-GCM. The Free plan has no automated backups, so this
 * runs nightly from .github/workflows/backup.yml (and can be run by hand).
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... BACKUP_ENCRYPTION_KEY=... \
 *     node scripts/backup-db.js [output-file]
 *
 * The file is useless without BACKUP_ENCRYPTION_KEY — keep that key somewhere
 * other than the backups (e.g. your password manager), or they can't be restored.
 */
const fs = require('fs');
const path = require('path');
const { encryptBuffer, hasKey } = require('../backend/lib/crypto-box');

// Order matters for restore (categories before products).
const TABLES = ['categories', 'products', 'blog_posts', 'orders', 'admin_audit_log'];
const PAGE = 1000;

function env(name) {
  const v = process.env[name];
  if (!v) { console.error(`❌ ${name} is not set.`); process.exit(2); }
  return v;
}

async function fetchTable(base, key, table) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const res = await fetch(`${base}/rest/v1/${table}?select=*`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${from}-${from + PAGE - 1}`, 'Range-Unit': 'items' },
    });
    if (res.status === 404) return null; // table not created yet (migration not run)
    if (!res.ok && res.status !== 206) throw new Error(`${table}: HTTP ${res.status} ${await res.text()}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

async function main() {
  const base = env('SUPABASE_URL').replace(/\/+$/, '');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const encKey = env('BACKUP_ENCRYPTION_KEY');
  if (!hasKey(encKey)) { console.error('❌ BACKUP_ENCRYPTION_KEY must be 32 bytes, base64-encoded.'); process.exit(2); }

  const backup = { format: 'cefi-backup/v1', createdAt: new Date().toISOString(), tables: {} };
  for (const table of TABLES) {
    const rows = await fetchTable(base, key, table);
    if (rows === null) { console.log(`  ${table.padEnd(16)} (table not found — skipped)`); continue; }
    backup.tables[table] = rows;
    console.log(`  ${table.padEnd(16)} ${rows.length} rows`);
  }

  const out = process.argv[2] || `cefi-backup-${backup.createdAt.slice(0, 10)}.enc`;
  fs.writeFileSync(out, encryptBuffer(Buffer.from(JSON.stringify(backup)), encKey));
  console.log(`✅ Encrypted backup written: ${path.resolve(out)} (${fs.statSync(out).size} bytes)`);
}

main().catch((err) => { console.error('❌ Backup failed:', err.message); process.exit(1); });
