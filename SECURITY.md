# Security

How CEFI is protected, what to do when something goes wrong, and the routine
work that keeps it safe. Owner: the site administrator.

## Reporting a vulnerability

Email **ceylonecofreshinfinity@gmail.com** with the subject `SECURITY`.
Please don't open a public GitHub issue. We aim to reply within 2 business days.

## How the system is secured

| Layer | Protection |
|---|---|
| Sign-in & sessions | All sign-in (email, Google, Facebook) runs on the server (`backend/routes/auth.js`). Tokens live only in **HttpOnly, SameSite=Strict, Secure, `__Host-`** cookies — access token and refresh token in separate cookies; the browser's JavaScript never sees either, and the frontend has no Supabase client. Access tokens older than 15 min are refused and renewed from the refresh cookie (rotated each time). Each session is bound to the browser that signed in; a cookie replayed from another browser revokes that session. Logout revokes **every** session of the account, so all its tokens stop working at once. 5 failed sign-ins for one email in 15 min lock it for 15 min (`auth_login_attempts`). State-changing requests are CSRF-checked. |
| Admin access | `requireAdmin` on every admin API route. An admin is Supabase `app_metadata.role = 'admin'` or a **confirmed** email in `ADMIN_EMAILS`. No admin email is written in the code. Every allowed/denied request is logged to `admin_audit_log`, which is append-only. |
| Database | Row Level Security on every table. Browser keys can only **read** the catalogue and blog, and a buyer can read only their own orders. All writes go through the API with the service-role key. |
| Input | Every request body is validated by a strict Zod schema (`backend/lib/schemas.js`). Unknown fields are rejected. Order prices are recalculated from the catalogue on the server. |
| Customer data | Order name/email/phone/address are AES-256-GCM encrypted with `ORDER_DATA_KEY` before storage. |
| Web | CSP (no inline scripts), HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy (`vercel.json`). CORS refuses other sites in production. Errors never include stack traces. |
| Abuse | Per-IP and per-user rate limits, shared across instances when Upstash Redis is configured. |
| Repository | `secret-scan` blocks commits and PRs that add passwords, keys or `.env` files (pre-commit hook + CI). `dependency-audit` fails CI on known vulnerable packages. |

## Environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (Production).
The full list with explanations is in `backend/.env.example`.

| Variable | Required | Purpose |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | yes | Supabase project |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-side writes. **Never** expose to the browser. |
| `ADMIN_EMAILS` | yes | Comma-separated admin emails |
| `ORDER_DATA_KEY` | yes | Encrypts stored customer details |
| `SESSION_SECRET` | recommended | Key for the browser-binding check on session cookies (falls back to a key derived from the service-role key) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | recommended | Shared rate limiting |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `ADMIN_EMAIL` | yes | Order/contact emails |

GitHub → Settings → Secrets and variables → Actions (for nightly backups):
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BACKUP_ENCRYPTION_KEY`.

Generate any 32-byte key with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Keep `ORDER_DATA_KEY` and `BACKUP_ENCRYPTION_KEY` in a password manager as
well. If you lose them, the orders and backups encrypted with them can't be read.

## Supabase dashboard settings

These can't be set from code. Check them after any project change:

1. **JWT expiry: 900 seconds (15 min).** The API already refuses access
   tokens older than 15 min; setting the same limit in Supabase (Project
   Settings → JWT, or Authentication → Sessions) makes the tokens themselves
   expire then too. Keep refresh-token rotation and reuse detection on (the
   default).
2. **Settings → JWT Keys:** migrate to **asymmetric signing keys** (ES256/RS256)
   and revoke the legacy HS256 secret once nothing uses it. No code change is
   needed — the API verifies every token with Supabase, whatever the algorithm.
   Users are signed out once when the old secret is revoked.
3. **Authentication → Attack Protection:** enable CAPTCHA (Cloudflare Turnstile)
   for sign-up/sign-in and keep "Confirm email" on.
4. **Database → Backups:** the Free plan has none. Nightly encrypted backups
   run from GitHub Actions instead (below). On a paid plan, daily backups/PITR
   are included.

## Database lock-down

The browser (public anon key, or a signed-in customer) may only **read** the
catalogue; every write goes through the API with the service-role key.
`fix_supabase_security.sql` enforces that and turns on RLS for the older
tables in `backend/schema.sql`. Run it in the Supabase SQL editor (safe to
re-run), and again after anyone edits policies by hand. CI (`sql-guard`)
fails if the script is emptied or starts creating write policies.

Verify at any time — there must be **no** INSERT / UPDATE / DELETE / ALL
policy for `anon` or `authenticated` on `public` or `storage.objects`:

```sql
select schemaname, tablename, policyname, cmd, roles from pg_policies
where schemaname in ('public','storage') order by 1,2;
```

Public forms (contact, quote, newsletter) email only the owner — they never
send mail to the address a visitor types, because it is unverified.

## Backups and restore

- **Nightly:** `.github/workflows/backup.yml` exports all tables, encrypts them
  with `BACKUP_ENCRYPTION_KEY`, verifies the file decrypts, and keeps it as a
  workflow artifact for 30 days. Run it any time from **Actions → Nightly
  encrypted database backup → Run workflow**.
- **Manual backup:** `node scripts/backup-db.js` (needs the three variables above).
- **Restore:** always dry-run first. It decrypts and checks the file without
  writing anything:
  ```bash
  node scripts/restore-db.js cefi-backup.enc
  node scripts/restore-db.js cefi-backup.enc --apply --tables=products,categories
  ```
- **Restore drill (quarterly):** restores a backup into a *separate*,
  throwaway Postgres (never production) and compares every row with the live
  database. Record the result below.
  ```bash
  npm install   # once, at the repo root (installs the drill's Postgres)
  node scripts/restore-drill.js backups/cefi-backup-YYYY-MM-DD.enc
  ```
  Local backups go in `backups/` (git-ignored). Keep a copy of the latest one
  off this computer too (e.g. encrypted cloud storage); it is useless without
  `BACKUP_ENCRYPTION_KEY`, so store the key separately.

| Last restore drill | Result | By |
|---|---|---|
| 2026-09-26 | ✅ Passed — live backup (categories 6, products 77, blog_posts 4, orders 0, admin_audit_log 10) restored into a separate Postgres; every row byte-identical to live. Negative test: an altered row was detected. | Security audit |

## Incident response

When something looks wrong (defaced products, unknown admin activity, leaked
key, spam sent from the domain):

1. **Contain (first 15 minutes)**
   - Leaked key or password: rotate it immediately (see below).
   - Suspicious admin account: remove it from `ADMIN_EMAILS` in Vercel and
     redeploy; in Supabase, sign the user out of all sessions or ban it.
   - Abuse of a form or endpoint: temporarily lower its limit in
     `backend/lib/rate-limit.js`, or disable the route and redeploy.
2. **Assess:** read `admin_audit_log` (Supabase → Table Editor) and Vercel
   function logs. Every error carries a `correlationId` to search for. Note
   what was accessed or changed, and when.
3. **Recover:** restore affected tables from the latest good backup
   (`restore-db.js --apply --tables=…`). Redeploy a known-good commit if code was
   changed.
4. **Notify:** if customer data may have been exposed, tell the affected
   customers and follow Sri Lanka's Personal Data Protection Act requirements.
5. **Review:** within one week, write down the cause and the fix, and add a
   check to CI or this checklist so it can't happen the same way again.

## Key rotation

| Secret | Rotate | How |
|---|---|---|
| Admin password | every 6 months, or immediately if exposed | Supabase → Authentication → Users → reset |
| `SUPABASE_SERVICE_ROLE_KEY` | every 6 months, or immediately if exposed | Supabase → Settings → API keys → roll → update Vercel + GitHub secret → redeploy |
| `RESEND_API_KEY` | every 6 months | Resend → API keys → create new → update Vercel → delete old |
| Gmail app password (`EMAIL_PASS`) | every 6 months | Google Account → App passwords |
| `ORDER_DATA_KEY` / `BACKUP_ENCRYPTION_KEY` | only if exposed | Needs re-encryption; old data stays readable only with the old key, so keep it until re-encrypted |

| Last rotation | Secrets rotated | By |
|---|---|---|
| _not yet recorded_ | | |

## Routine

| When | What |
|---|---|
| Every PR | CI: build, `secret-scan`, `dependency-audit` must be green |
| Nightly (automatic) | Encrypted database backup (`backup.yml`) — needs the 3 GitHub secrets above |
| Monthly (automatic) | **OWASP ZAP scan of the live site** (`security-scan.yml`) — findings are filed as the issue "ZAP security scan report". **Secret-rotation check** (`rotation-reminder.yml`) — opens an issue if nothing was rotated in 180 days |
| Monthly | Update dependencies (`npm outdated`), review `admin_audit_log` for denied/unknown activity, triage the ZAP issue |
| Quarterly | Security self-audit against the Master-Vault 78-point checklist; restore drill (`scripts/restore-drill.js`) |
| Yearly | Manual penetration test by an external tester (target: 2027-03), in addition to the monthly automated scan; everyone with access redoes `SECURITY-TRAINING.md` |

## Onboarding anyone with admin or code access

- [ ] Read this file.
- [ ] Complete **`SECURITY-TRAINING.md`** (20 minutes) and add your row to its sign-off log.
- [ ] Use a unique password + a password manager; never share accounts.
- [ ] Never put keys, passwords or customer data in code, commits, chat or screenshots.
- [ ] Run `npm install` at the repo root once (enables the secret-scan pre-commit hook).
- [ ] Know the incident steps above and who to tell.
