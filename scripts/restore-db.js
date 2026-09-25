#!/usr/bin/env node
/**
 * scripts/restore-db.js — restore an encrypted backup (Master-Vault item 71)
 * ---------------------------------------------------------------------------
 * Default is a DRY RUN: decrypts the file, checks it, and prints what would
 * be restored. Nothing is written unless you add --apply.
 *
 *   BACKUP_ENCRYPTION_KEY=... node scripts/restore-db.js backup.enc
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... BACKUP_ENCRYPTION_KEY=... \
 *     node scripts/restore-db.js backup.enc --apply [--tables=products,categories]
 *
 * --apply UPSERTS rows by primary key: rows in the backup are recreated or
 * reset to their backed-up values; rows created after the backup are left
 * alone. The audit log is never restored over (it is append-only).
 */
const fs = require('fs');
const { decryptBuffer, hasKey } = require('../backend/lib/crypto-box');

const PRIMARY_KEY = { categories: 'id', products: 'id', blog_posts: 'id', orders: 'order_id' };
const RESTORE_ORDER = ['categories', 'products', 'blog_posts', 'orders'];

function env(name) {
  const v = process.env[name];
  if (!v) { console.error(`❌ ${name} is not set.`); process.exit(2); }
  return v;
}

async function upsert(base, key, table, rows) {
  for (let i = 0; i < rows.length; i += 500) {
    const res = await fetch(`${base}/rest/v1/${table}?on_conflict=${PRIMARY_KEY[table]}`, {
      method: 'POST',
      headers: {
        apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(rows.slice(i, i + 500)),
    });
    if (!res.ok) throw new Error(`${table}: HTTP ${res.status} ${await res.text()}`);
  }
}

async function main() {
  const [file, ...flags] = process.argv.slice(2);
  if (!file) { console.error('usage: restore-db.js <backup.enc> [--apply] [--tables=a,b]'); process.exit(2); }
  const apply = flags.includes('--apply');
  const only = (flags.find((f) => f.startsWith('--tables=')) || '').slice(9).split(',').filter(Boolean);

  const encKey = env('BACKUP_ENCRYPTION_KEY');
  if (!hasKey(encKey)) { console.error('❌ BACKUP_ENCRYPTION_KEY must be 32 bytes, base64-encoded.'); process.exit(2); }

  let backup;
  try {
    backup = JSON.parse(decryptBuffer(fs.readFileSync(file, 'utf8'), encKey).toString('utf8'));
  } catch (err) {
    console.error('❌ Could not decrypt/parse the backup (wrong key or damaged file):', err.message);
    process.exit(1);
  }
  if (backup.format !== 'cefi-backup/v1') { console.error('❌ Unknown backup format:', backup.format); process.exit(1); }

  console.log(`Backup from ${backup.createdAt}`);
  const tables = RESTORE_ORDER.filter((t) => backup.tables[t] && (!only.length || only.includes(t)));
  for (const t of Object.keys(backup.tables)) {
    const rows = backup.tables[t];
    const pk = PRIMARY_KEY[t];
    const missingPk = pk ? rows.filter((r) => r[pk] === undefined || r[pk] === null).length : 0;
    const note = !PRIMARY_KEY[t] ? '(kept for reference, not restored)' : tables.includes(t) ? (apply ? 'will restore' : 'would restore') : '(not selected)';
    console.log(`  ${t.padEnd(16)} ${String(rows.length).padStart(5)} rows  ${note}${missingPk ? `  ⚠️ ${missingPk} rows missing ${pk}` : ''}`);
    if (missingPk) { console.error('❌ Backup is incomplete; refusing to continue.'); process.exit(1); }
  }

  if (!apply) { console.log('\nDry run only — nothing was written. Add --apply to restore.'); return; }

  const base = env('SUPABASE_URL').replace(/\/+$/, '');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  for (const t of tables) {
    await upsert(base, key, t, backup.tables[t]);
    console.log(`✅ restored ${t} (${backup.tables[t].length} rows)`);
  }
}

main().catch((err) => { console.error('❌ Restore failed:', err.message); process.exit(1); });
