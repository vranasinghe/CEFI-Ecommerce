/**
 * lib/sanitize.js
 * Shared sanitization utilities used across server.js.
 * Covers: XSS (HTML injection), email header injection, email format, string length.
 */
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// ── Regex ────────────────────────────────────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Sanitize a plain-text field (strips ALL HTML tags).
 * Use for: title, author, name, subject, company, product, etc.
 */
function sanitizeText(value, maxLength = 500) {
  if (typeof value !== 'string') return '';
  return DOMPurify.sanitize(value.trim().substring(0, maxLength), { ALLOWED_TAGS: [] });
}

/**
 * Sanitize a rich-HTML field (allows safe formatting tags).
 * Use for: blog content, product full_description.
 */
function sanitizeHtml(value, maxLength = 100000) {
  if (typeof value !== 'string') return '';
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
