#!/usr/bin/env node
/**
 * scripts/restore-drill.js — prove a backup can actually be restored
 * (Master-Vault item 71).
 * ---------------------------------------------------------------------------
 * 1. Decrypts an encrypted backup (BACKUP_ENCRYPTION_KEY).
 * 2. Restores every table into a SEPARATE, throwaway Postgres (PGlite, in
 *    memory) — production is never written to.
 * 3. Reads the restored rows back out of Postgres and compares them, table by
 *    table, with a fresh read of the live database: row counts, primary keys
 *    and a SHA-256 checksum of every row's content.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... BACKUP_ENCRYPTION_KEY=... \
 *     node scripts/restore-drill.js backups/cefi-backup-YYYY-MM-DD.enc
 *
 * Differences are reported, not hidden: rows added to the live database after
 * the backup was taken (e.g. new audit-log entries) show up as "newer in live".
 */
const fs = require('fs');
const crypto = require('crypto');
const { decryptBuffer, hasKey } = require('../backend/lib/crypto-box');

const PRIMARY_KEY = { categories: 'id', products: 'id', blog_posts: 'id', orders: 'order_id', admin_audit_log: 'id' };

function env(name) {
  const v = process.env[name];
  if (!v) { console.error(`❌ ${name} is not set.`); process.exit(2); }
  return v;
}

const sortKeys = (v) => Array.isArray(v) ? v.map(sortKeys)
  : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])])) : v;
const rowHash = (row) => crypto.createHash('sha256').update(JSON.stringify(sortKeys(row))).digest('hex');

async function fetchLive(base, key, table) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${base}/rest/v1/${table}?select=*`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${from}-${from + 999}`, 'Range-Unit': 'items' },
    });
    if (res.status === 404) return null;
    if (!res.ok && res.status !== 206) throw new Error(`${table}: HTTP ${res.status}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

/** Column type from the values actually present (the drill checks data, not DDL). */
function columnType(values) {
  const present = values.filter((v) => v !== null && v !== undefined);
  if (!present.length) return 'text';
  if (present.every((v) => typeof v === 'boolean')) return 'boolean';
  if (present.every((v) => typeof v === 'number')) return 'double precision';
  if (present.every((v) => typeof v === 'object')) return 'jsonb';
  return 'text';
}

async function main() {
  const file = process.argv[2];
  if (!file) { console.error('usage: restore-drill.js <backup.enc>'); process.exit(2); }
  const encKey = env('BACKUP_ENCRYPTION_KEY');
  if (!hasKey(encKey)) { console.error('❌ BACKUP_ENCRYPTION_KEY must be 32 bytes, base64-encoded.'); process.exit(2); }
  const base = env('SUPABASE_URL').replace(/\/+$/, '');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');

  const backup = JSON.parse(decryptBuffer(fs.readFileSync(file, 'utf8'), encKey).toString('utf8'));
  console.log(`Backup ${file} — taken ${backup.createdAt}\n`);

  const { PGlite } = await import('@electric-sql/pglite');
  const db = new PGlite(); // separate, in-memory Postgres — nothing touches production
  let problems = 0;

  for (const [table, rows] of Object.entries(backup.tables)) {
    const pk = PRIMARY_KEY[table];
    const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
    const types = Object.fromEntries(cols.map((c) => [c, columnType(rows.map((r) => r[c]))]));
    const q = (c) => `"${c.replace(/"/g, '""')}"`;

    // 1. Restore into Postgres.
    if (cols.length) {
      await db.exec(`create table ${q(table)} (${cols.map((c) => `${q(c)} ${types[c]}${c === pk ? ' primary key' : ''}`).join(', ')})`);
      for (const r of rows) {
        const vals = cols.map((c) => (r[c] === undefined ? null : types[c] === 'jsonb' ? JSON.stringify(r[c]) : r[c]));
        await db.query(`insert into ${q(table)} (${cols.map(q).join(', ')}) values (${cols.map((_, i) => `$${i + 1}`).join(', ')})`, vals);
      }
    }

    // 2. Read it back out of Postgres.
    const restored = cols.length ? (await db.query(`select * from ${q(table)}`)).rows : [];
    const restoredMap = new Map(restored.map((r) => [String(r[pk]), rowHash(r)]));
    const backupMap = new Map(rows.map((r) => [String(r[pk]), rowHash(r)]));
    const faithful = restoredMap.size === backupMap.size && [...backupMap].every(([k, h]) => restoredMap.get(k) === h);

    // 3. Compare with the live database right now.
    const live = await fetchLive(base, key, table);
    const liveMap = new Map((live || []).map((r) => [String(r[pk]), rowHash(r)]));
    const same = [...backupMap].filter(([k, h]) => liveMap.get(k) === h).length;
    const changed = [...backupMap].filter(([k, h]) => liveMap.has(k) && liveMap.get(k) !== h).length;
    const missingLive = [...backupMap.keys()].filter((k) => !liveMap.has(k)).length;
    const newerLive = [...liveMap.keys()].filter((k) => !backupMap.has(k)).length;

    const status = !faithful ? '❌ restore corrupted data'
      : changed || missingLive ? '⚠️  differs from live (see counts)'
      : newerLive ? '✅ matches (live has newer rows)' : '✅ identical to live';
    if (!faithful) problems++;
    console.log(`${table.padEnd(16)} backup ${String(rows.length).padStart(4)} | restored ${String(restored.length).padStart(4)} | live ${String(live ? live.length : 0).padStart(4)} | identical ${same}${changed ? ` | changed since ${changed}` : ''}${missingLive ? ` | deleted since ${missingLive}` : ''}${newerLive ? ` | newer in live ${newerLive}` : ''}  ${status}`);
  }

  console.log(problems
    ? `\n❌ Restore drill FAILED for ${problems} table(s).`
    : '\n✅ Restore drill passed: every table restored into a separate Postgres with byte-identical row content.');
  process.exit(problems ? 1 : 0);
}

main().catch((err) => { console.error('❌ Restore drill failed:', err.message); process.exit(1); });
