/**
 * lib/crypto-box.js
 * ---------------------------------------------------------------------------
 * AES-256-GCM encryption for data at rest: customer PII on stored orders
 * (Master-Vault item 42) and database backups (items 71/73).
 *
 * Keys are 32 random bytes, base64-encoded, kept only in environment
 * variables. Generate one with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 *
 * Output format: "v1.<iv>.<authTag>.<ciphertext>" (base64url parts). GCM's auth
 * tag means a tampered or truncated value fails to decrypt instead of
 * returning garbage.
 */
const crypto = require('crypto');

function keyFrom(base64Key) {
  const key = Buffer.from(String(base64Key || ''), 'base64');
  if (key.length !== 32) throw new Error('Encryption key must be 32 bytes, base64-encoded.');
  return key;
}

function encryptBuffer(plain, base64Key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyFrom(base64Key), iv);
  const data = Buffer.concat([cipher.update(plain), cipher.final()]);
  return ['v1', iv, cipher.getAuthTag(), data].map((p) => (typeof p === 'string' ? p : p.toString('base64url'))).join('.');
}

function decryptBuffer(box, base64Key) {
  const [version, iv, tag, data] = String(box).split('.');
  if (version !== 'v1' || !iv || !tag || data === undefined) throw new Error('Not an encrypted value (expected v1 format).');
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyFrom(base64Key), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]);
}

const encryptJson = (value, key) => encryptBuffer(Buffer.from(JSON.stringify(value), 'utf8'), key);
const decryptJson = (box, key) => JSON.parse(decryptBuffer(box, key).toString('utf8'));

/** True when the env var holds a usable 32-byte key. */
function hasKey(base64Key) {
  try { keyFrom(base64Key); return true; } catch { return false; }
}

module.exports = { encryptBuffer, decryptBuffer, encryptJson, decryptJson, hasKey };
