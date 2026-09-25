/**
 * lib/sanitize.js
 * Shared sanitization utilities used across server.js.
 * Covers: XSS (HTML injection), email header injection, email format, string length.
 */
// jsdom/dompurify can fail to load on some serverless runtimes (e.g. missing
// native canvas peer on Vercel's Linux Lambda). Guard the require so a failure
// here degrades to a regex-based fallback instead of crashing the whole function.
let DOMPurify = null;
try {
  const createDOMPurify = require('dompurify');
  const { JSDOM } = require('jsdom');
  const window = new JSDOM('').window;
  DOMPurify = createDOMPurify(window);
} catch (e) {
  console.warn('⚠️ Could not initialize DOMPurify/jsdom, falling back to regex sanitization:', e.message);
}

function stripTagsFallback(value) {
  return value.replace(/<[^>]*>/g, '');
}

// ── Regex ────────────────────────────────────────────────────────────────────
// Quotes, angle brackets and parens are rejected: addresses are interpolated
// into email HTML (mailto: links) and headers, where they could inject markup.
const EMAIL_REGEX = /^[^\s@<>"'`()]+@[^\s@<>"'`()]+\.[^\s@<>"'`()]{2,}$/;

/**
 * Sanitize a plain-text field (strips ALL HTML tags).
 * Use for: title, author, name, subject, company, product, etc.
 */
function sanitizeText(value, maxLength = 500) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim().substring(0, maxLength);
  if (!DOMPurify) return stripTagsFallback(trimmed);
  return DOMPurify.sanitize(trimmed, { ALLOWED_TAGS: [] });
}

/**
 * Sanitize a rich-HTML field (allows safe formatting tags).
 * Use for: blog content, product full_description.
 */
function sanitizeHtml(value, maxLength = 100000) {
  if (typeof value !== 'string') return '';
  if (!DOMPurify) return stripTagsFallback(value.trim().substring(0, maxLength));
  return DOMPurify.sanitize(value.trim().substring(0, maxLength));
}

/**
 * Sanitize a value destined for use in an email header (subject, from, to).
 * Strips CRLF and control characters to prevent email header injection.
 */
function sanitizeHeader(value, maxLength = 200) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\r\n\t]+/g, ' ').trim().substring(0, maxLength);
}

/**
 * Validate an email address format.
 * Returns true if valid, false otherwise.
 */
function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  if (email.length > 254) return false;
  return EMAIL_REGEX.test(email);
}

/**
 * Validate a string field has a value and is within acceptable length.
 */
function isValidString(value, maxLength = 5000) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

module.exports = {
  sanitizeText,
  sanitizeHtml,
  sanitizeHeader,
  isValidEmail,
  isValidString,
};
