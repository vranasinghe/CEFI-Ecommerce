/**
 * lib/rate-limit.js
 * ---------------------------------------------------------------------------
 * Rate limiters (Master-Vault items 26, 46–50).
 *
 * Store: when UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are set, counts
 * live in Redis (Upstash's HTTP API — no connection pool, so it suits Vercel's
 * serverless functions). Without them, each function instance counts in its
 * own memory, which is weaker because Vercel runs several instances.
 *
 * Keys: anonymous traffic is keyed on the real client IP (Vercel sets
 * x-real-ip); signed-in traffic on the Supabase user id, so one account
 * can't dodge its limit by switching networks.
 */
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const clientIpKey = (req) => ipKeyGenerator(req.headers['x-real-ip'] || req.ip || '');
const userKey = (req) => (req.user?.id ? `user:${req.user.id}` : clientIpKey(req));

/** Minimal express-rate-limit Store over the Upstash Redis REST API. */
class UpstashStore {
  constructor(url, token, prefix) {
    this.url = url.replace(/\/+$/, '');
    this.token = token;
    this.prefix = prefix;
  }

  init(options) { this.windowMs = options.windowMs; }

  async pipeline(commands) {
    const res = await fetch(`${this.url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(commands),
    });
    if (!res.ok) throw new Error(`Upstash HTTP ${res.status}`);
    return res.json();
  }

  async increment(key) {
    const k = this.prefix + key;
    // INCR, set the window's expiry only on the first hit (NX), read remaining TTL.
    const [incr, , ttl] = await this.pipeline([['INCR', k], ['PEXPIRE', k, String(this.windowMs), 'NX'], ['PTTL', k]]);
    const ms = Number(ttl.result) > 0 ? Number(ttl.result) : this.windowMs;
    return { totalHits: Number(incr.result), resetTime: new Date(Date.now() + ms) };
  }

  async decrement(key) { await this.pipeline([['DECR', this.prefix + key]]); }
  async resetKey(key) { await this.pipeline([['DEL', this.prefix + key]]); }
}

const redisConfigured = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
if (!redisConfigured && process.env.NODE_ENV === 'production') {
  console.warn('⚠️  UPSTASH_REDIS_REST_URL/TOKEN not set — rate limits are per serverless instance (in-memory).');
}

function makeLimiter(name, { windowMs, max, keyGenerator, message }) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-7', // RateLimit + RateLimit-Policy; 429s also carry Retry-After
    legacyHeaders: false,
    keyGenerator,
    // Redis outage must not take the site down: fail open, but loudly.
    passOnStoreError: true,
    store: redisConfigured
      ? new UpstashStore(process.env.UPSTASH_REDIS_REST_URL, process.env.UPSTASH_REDIS_REST_TOKEN, `rl:${name}:`)
      : undefined,
    message: { success: false, message: message || 'Too many requests. Please wait a few minutes and try again.' },
  });
}

const MIN = 60 * 1000;

module.exports = {
  clientIpKey,
  redisConfigured,
  // Everyone, per IP: generous global ceiling.
  globalLimiter: makeLimiter('global', { windowMs: 15 * MIN, max: 300, keyGenerator: clientIpKey }),
  // Public forms that send email: tight, per IP.
  formLimiter: makeLimiter('form', { windowMs: 15 * MIN, max: 5, keyGenerator: clientIpKey, message: 'Too many submissions. Please wait a few minutes and try again.' }),
  // Signed-in API calls, per user (use AFTER requireAuth / requireAdmin).
  userApiLimiter: makeLimiter('user', { windowMs: 1 * MIN, max: 100, keyGenerator: userKey }),
  // Order placement, per user.
  orderLimiter: makeLimiter('order', { windowMs: 15 * MIN, max: 10, keyGenerator: userKey, message: 'Too many orders in a short time. Please wait a few minutes.' }),
  // Uploads, per user.
  uploadLimiter: makeLimiter('upload', { windowMs: 15 * MIN, max: 30, keyGenerator: userKey, message: 'Upload limit reached. Please wait a few minutes.' }),
};
