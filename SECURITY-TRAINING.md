# Security training — CEFI

A 20-minute module for **anyone with admin, Vercel, Supabase or GitHub access**
to the CEFI shop. Read the six lessons, answer the quiz, then add a row to the
sign-off log at the bottom (Master-Vault item 76). Repeat yearly, and whenever
someone new gets access.

---

## 1. Secrets never go in code, chat or screenshots

Passwords, API keys and the Supabase service-role key belong only in
`backend/.env` on your own computer, in Vercel's environment variables, and in
a password manager. The admin password was once written in a code comment and
it stayed readable in the public git history even after it was deleted, which
is why it had to be changed.

- The repo blocks commits that add a secret (`secret-scan`). If it blocks you,
  **move the value to an environment variable**. Don't bypass the check.
- A secret that was ever pasted somewhere public must be **rotated**, not just
  deleted (SECURITY.md → Key rotation).

## 2. Protect the admin account

Whoever signs in as the admin can change prices, delete products and read every
customer's order.

- Use a unique, long password from a password manager.
- Never share the admin login. Give each person their own account and add
  their confirmed email to `ADMIN_EMAILS` in Vercel.
- Sign out on shared computers. Signing out ends the session on **every** device.

## 3. Recognise phishing

Attackers target whoever holds the keys. Be suspicious of any email or message
that asks you to "verify" a Supabase, Vercel, GitHub, Google or Resend login,
especially if it's urgent or the link's address looks slightly off.

- Open those sites by typing the address or using a bookmark, never from the email.
- Supabase, Vercel and GitHub will never ask you for your password or keys by email.

## 4. Customer data

Order details (name, email, phone, address) are personal data under Sri Lanka's
Personal Data Protection Act.

- Only look at orders you need to fulfil. Don't export or forward them.
- Don't copy customer details into spreadsheets, chats or personal email.
- Stored orders are encrypted with `ORDER_DATA_KEY`. Losing that key makes them
  unreadable, and leaking it exposes them, so keep it only in Vercel and the
  password manager.

## 5. Changing the code safely

- Every change goes through a pull request. CI must be green: build,
  `secret-scan` and `dependency-audit`.
- New request bodies need a Zod schema (`backend/lib/schemas.js`). New admin
  routes need `requireAdmin`.
- Never switch off Row Level Security or add a Supabase policy that lets
  browsers write data. Writes go through the API.

## 6. When something looks wrong

Examples: products changed that nobody edited, admin activity you don't
recognise in `admin_audit_log`, a key posted somewhere public, customers
reporting odd emails.

1. Don't delete evidence. Note what you saw and when.
2. Follow **SECURITY.md → Incident response**. Contain first: rotate the
   exposed key, or remove a suspicious admin from `ADMIN_EMAILS`.
3. Tell the site owner straight away.

---

## Quiz

1. You need to test the order emails locally. Where does `RESEND_API_KEY` go?
2. A teammate needs admin access. What do you do?
3. `secret-scan` blocks your commit. What's the right response?
4. An email says your Vercel account will be suspended unless you log in via its link. What do you do?
5. Which customer details are encrypted when orders are stored, and with what?
6. You find a Supabase key pasted in an old public GitHub issue. Is deleting the issue enough?
7. What must every new admin API route have?
8. Why doesn't the website keep login tokens in the browser's `localStorage`?
9. You notice denied admin requests from an unknown email in `admin_audit_log`. What's the first step?
10. How often must the admin password and API keys be rotated?

<details>
<summary>Answers</summary>

1. In `backend/.env` (git-ignored) on your computer. Never in code.
2. They create their own account and confirm their email; the owner adds it to `ADMIN_EMAILS` in Vercel. Never share the admin login.
3. Move the value into an environment variable and reference it via `process.env`. Don't bypass the check.
4. Ignore the link. Open vercel.com yourself, and report it if it looks like phishing.
5. Name, email, phone and address, with AES-256-GCM using `ORDER_DATA_KEY`.
6. No. It was public, so rotate the key (SECURITY.md → Key rotation), then log the rotation.
7. `requireAdmin`, plus a Zod schema for any request body.
8. Page scripts can read `localStorage`, so one XSS bug could steal a session. Tokens live in HttpOnly cookies that scripts can't read.
9. Note the details, then follow the incident steps. Check whether the account should exist, and alert the owner.
10. Every 6 months, or immediately if exposed. A monthly GitHub reminder opens an issue when it's overdue.

</details>

---

## Sign-off log

Add a row when you have read the lessons and answered the quiz.

| Date | Name | Role | Quiz score |
|---|---|---|---|
| | | | |
