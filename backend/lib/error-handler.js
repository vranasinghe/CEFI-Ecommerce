/**
 * lib/error-handler.js
 * Global exception handler — THE SECURE BACKEND MASTER-VAULT Module 4
 *
 * SECURITY: Catches ALL errors and returns generic, safe responses.
 * Logs full error server-side with a correlation ID.
 * NEVER exposes: stack traces, file paths, DB errors, library versions.
 */
const crypto = require('crypto');

// ─── Custom Error Classes ─────────────────────────────────────────────────────

class AppError extends Error {
  constructor(statusCode, code, message, isOperational = true) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
  }
}

class ValidationError extends AppError {
  constructor(message, fields) {
    super(400, 'VALIDATION_ERROR', message);
    this.name = 'ValidationError';
    this.fields = fields;
  }
}

class NotFoundError extends AppError {
  constructor(resource) {
    super(404, 'NOT_FOUND', `${resource} not found`);
    this.name = 'NotFoundError';
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(403, 'FORBIDDEN', message);
    this.name = 'ForbiddenError';
  }
}

class RateLimitError extends AppError {
  constructor(retryAfter) {
    super(429, 'RATE_LIMIT_EXCEEDED', 'Too many requests');
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

// ─── Safe Error Messages ──────────────────────────────────────────────────────

function getSafeMessage(err, statusCode) {
  // Operational errors: their message is intentionally user-facing
  if (err instanceof AppError && err.isOperational) {
    return err.message;
  }
  // Programming errors: return generic message only
  const messages = {
    400: 'Bad request. Please check your input.',
    401: 'Authentication required.',
    403: 'Insufficient permissions.',
    404: 'Resource not found.',
    413: 'Request too large.',
    429: 'Too many requests. Please try again later.',
    500: 'An unexpected error occurred. Please try again later.',
  };
  return messages[statusCode] || 'An error occurred.';
}

// ─── Global Exception Handler Middleware ──────────────────────────────────────

/**
 * Must be registered as the LAST middleware:
 *   app.use(globalExceptionHandler);
 */
function globalExceptionHandler(err, req, res, next) {
  const correlationId = crypto.randomUUID();

  // Middleware errors (body-parser's malformed JSON / payload too large) carry
  // a 4xx `status`; keep it so a client mistake isn't reported as a crash.
  const isClientError = Number.isInteger(err.status) && err.status >= 400 && err.status < 500;
  const statusCode = err instanceof AppError ? err.statusCode : (isClientError ? err.status : 500);
  const errorCode  = err instanceof AppError ? err.code : (isClientError ? 'BAD_REQUEST' : 'INTERNAL_ERROR');

  // ── Server-side: log full details ────────────────────────────────────────
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
      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
      userId: req.user?.id || 'anonymous',
    },
  };

  if (statusCode >= 500) {
    console.error('[GLOBAL_ERROR]', JSON.stringify(logEntry));
  } else {
    console.warn('[APP_ERROR]', JSON.stringify(logEntry));
  }

  // ── Client response: SAFE, generic ───────────────────────────────────────
  const body = {
    success: false,
    error: {
      code: errorCode,
      message: getSafeMessage(err, statusCode),
      correlationId, // Safe: clients can quote this to support without leaking internals
    },
  };

  if (err instanceof RateLimitError) {
    res.setHeader('Retry-After', err.retryAfter);
    body.error.retryAfter = err.retryAfter;
  }

  if (err instanceof ValidationError && err.fields) {
    body.error.fields = err.fields;
  }

  res.status(statusCode).json(body);
}

// ─── 404 Handler ─────────────────────────────────────────────────────────────

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found.',
    },
  });
}

// ─── Process-Level Handlers ───────────────────────────────────────────────────

function setupProcessErrorHandlers() {
  process.on('unhandledRejection', (reason) => {
    console.error('[CRITICAL] unhandledRejection:', JSON.stringify({
      level: 'CRITICAL',
      type: 'unhandledRejection',
      reason: reason instanceof Error ? reason.stack : String(reason),
      timestamp: new Date().toISOString(),
    }));
  });

  process.on('uncaughtException', (error) => {
    console.error('[CRITICAL] uncaughtException:', JSON.stringify({
      level: 'CRITICAL',
      type: 'uncaughtException',
      error: { name: error.name, message: error.message, stack: error.stack },
      timestamp: new Date().toISOString(),
    }));
    setTimeout(() => process.exit(1), 1000);
  });
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  RateLimitError,
  globalExceptionHandler,
  notFoundHandler,
  setupProcessErrorHandlers,
};
