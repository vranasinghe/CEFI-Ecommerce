// lib/magic-bytes.js — Magic byte signature database and validation

// Known file signatures — THE source of truth for file type validation
const MAGIC_SIGNATURES = [
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
const ALLOWED_MIME_TYPES = {
  avatar: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  document: ['application/pdf'],
  attachment: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
  ],
  product: [
    'image/jpeg',
    'image/png',
    'image/webp',
  ],
};

// Max file sizes per purpose (in bytes)
const MAX_FILE_SIZES = {
  avatar: 10 * 1024 * 1024,    // 10MB
  document: 25 * 1024 * 1024,  // 25MB
  attachment: 10 * 1024 * 1024, // 10MB
  product: 10 * 1024 * 1024,   // 10MB
};

/**
 * Detect file type by reading magic bytes from the file buffer.
 * This is the most reliable method of file type detection.
 * The first 32 bytes are compared against known signatures.
 */
function detectMimeType(buffer) {
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
function getExtensionForMime(mimeType) {
  const signature = MAGIC_SIGNATURES.find((s) => s.mime === mimeType);
  return signature ? signature.extension : '.bin';
}

/**
 * Validate an uploaded file against all security rules.
 */
function validateFile(buffer, declaredMimeType, purpose) {
  const errors = [];

  // 1. File size check
  const maxSize = MAX_FILE_SIZES[purpose] || MAX_FILE_SIZES.attachment;
  if (buffer.length > maxSize) {
    errors.push(
      \`File size \${buffer.length} exceeds maximum \${maxSize} bytes\`
    );
  }

  // 2. Content-Type header check against allowlist
  const allowedTypes = ALLOWED_MIME_TYPES[purpose] || ALLOWED_MIME_TYPES.attachment;
  if (!allowedTypes.includes(declaredMimeType)) {
    errors.push(
      \`MIME type '\${declaredMimeType}' is not allowed for \${purpose} uploads\`
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
      \`Content-Type mismatch: header says '\${declaredMimeType}' but file content is '\${detectedMimeType}'\`
    );
  }

  // 5. Additional checks for specific types
  if (detectedMimeType === 'image/svg+xml') {
    errors.push('SVG files are not allowed (XSS risk)');
  }

  return {
    isValid: errors.length === 0,
    detectedMimeType,
    errors,
  };
}

/**
 * Sanitize a filename to prevent path traversal and injection attacks.
 */
function sanitizeFilename(detectedMimeType) {
  const crypto = require('crypto');

  // Get extension from detected MIME type (NOT from user input)
  const extension = getExtensionForMime(detectedMimeType);

  // Generate random filename
  const randomName = crypto.randomUUID();
  const safeFilename = \`\${randomName}\${extension}\`;

  return { safeFilename, extension };
}

module.exports = {
  detectMimeType,
  getExtensionForMime,
  validateFile,
  sanitizeFilename
};
