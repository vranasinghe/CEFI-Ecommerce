/**
 * lib/schemas.js
 * ---------------------------------------------------------------------------
 * Zod schemas for every request body the API accepts (Master-Vault items
 * 31, 32, 39). All objects are .strict(): an unexpected field is a 400, not
 * something that silently reaches the database — that is the mass-assignment
 * guard. Sanitisation (HTML stripping) still happens in the route handlers;
 * these schemas decide what shape and size of input is allowed at all.
 */
const { z } = require('zod');

const trimmed = (max) => z.string().trim().max(max);
const optionalText = (max) => trimmed(max).optional().or(z.literal('').transform(() => undefined));
// Quotes, angle brackets and parens are rejected: addresses are interpolated
// into email HTML (mailto: links) and headers.
const email = z.string().trim().toLowerCase().max(254)
  .regex(/^[^\s@<>"'`()]+@[^\s@<>"'`()]+\.[^\s@<>"'`()]{2,}$/, 'A valid email address is required.');
const slug = z.string().trim().toLowerCase().max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single hyphens.');
const httpsUrl = z.string().trim().max(1000).url().refine((u) => /^https?:\/\//i.test(u), 'Must be an http(s) URL.');
const shortList = z.array(trimmed(80).min(1)).max(20);

// ── Public forms ────────────────────────────────────────────────────────────
const contactSchema = z.object({
  name: trimmed(200).min(1, 'A valid name is required (max 200 chars).'),
  email,
  phone: optionalText(30),
  subject: optionalText(300),
  message: trimmed(5000).min(1, 'A message is required (max 5000 characters).'),
}).strict();

const newsletterSchema = z.object({ email }).strict();

const quoteSchema = z.object({
  name: trimmed(200).min(1, 'A valid name is required.'),
  company: optionalText(200),
  email,
  phone: optionalText(30),
  product: trimmed(300).min(1, 'A valid product name is required.'),
  quantity: optionalText(100),
  targetDestination: optionalText(200),
  destinationPort: optionalText(200),
  notes: optionalText(3000),
  message: optionalText(3000),
}).strict();

// ── Orders (signed-in buyers) ───────────────────────────────────────────────
const orderSchema = z.object({
  customer: z.object({
    name: trimmed(200).min(1, 'Your name is required.'),
    // Ignored by the server (the verified account email is used) but allowed
    // so the checkout form can send its read-only copy.
    email: z.string().max(254).optional(),
    phone: optionalText(30),
    address: optionalText(500),
    city: optionalText(120),
    postalCode: optionalText(20),
    country: optionalText(120),
  }).strict(),
  // Prices are NOT accepted from the browser (H-01): only which product and
  // how many. Display fields the cart carries are allowed and discarded.
  items: z.array(z.object({
    id: z.union([z.string().max(100), z.number()]).optional(),
    slug: z.string().max(200).optional(),
    name: z.string().max(300).optional(),
    quantity: z.coerce.number().int().min(1).max(10000),
    price: z.any().optional(),
    image: z.any().optional(),
    category_slug: z.any().optional(),
    is_wholesale_only: z.any().optional(),
  }).strict().refine((i) => i.id != null || i.slug, 'Each item needs a product id or slug.'))
    .min(1, 'Your cart is empty.').max(100, 'Too many items in one order.'),
  paymentMethod: optionalText(100),
}).strict();

// ── Admin: products ─────────────────────────────────────────────────────────
const variants = z.object({ type: shortList.optional(), size: shortList.optional() }).strict().nullable();
const productFields = {
  name: trimmed(300).min(1),
  slug,
  price: z.coerce.number().min(0).max(1_000_000),
  short_description: optionalText(1000),
  full_description: z.string().max(100_000).optional(),
  category_slug: slug,
  is_wholesale_only: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  images: z.array(httpsUrl).max(20).optional(),
  weight_g: z.coerce.number().int().min(0).max(1_000_000).nullable().optional(),
  origin: optionalText(200),
  weight: optionalText(100),
  stock_quantity: z.coerce.number().int().min(0).max(10_000_000).optional(),
  variants: variants.optional(),
};
const productCreateSchema = z.object(productFields).strict();
const productUpdateSchema = z.object(productFields).partial().strict();

// ── Admin: blog ─────────────────────────────────────────────────────────────
const blogFields = {
  title: trimmed(300).min(1, 'Title is required.'),
  slug: slug.optional().or(z.literal('').transform(() => undefined)),
  category: optionalText(100),
  author: optionalText(100),
  read_time_min: z.coerce.number().int().min(1).max(240).optional(),
  cover_image: httpsUrl.optional().or(z.literal('').transform(() => undefined)),
  excerpt: optionalText(500),
  content: z.string().min(1, 'Content is required.').max(200_000),
};
const blogCreateSchema = z.object(blogFields).strict();
const blogUpdateSchema = z.object(blogFields).partial().strict();

// ── Admin: catalogue header copy ────────────────────────────────────────────
const profileEntry = z.object({
  badge: trimmed(120),
  title: trimmed(200),
  description: trimmed(1000),
}).strict();
const catalogProfileSchema = z.object({
  all: profileEntry,
  categories: z.record(slug, profileEntry).refine((r) => Object.keys(r).length <= 50, 'Too many categories.'),
}).strict();

/**
 * Express middleware: replaces req.body with the parsed (trimmed, coerced,
 * unknown-field-free) value, or answers 400 with per-field messages.
 */
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (result.success) {
      req.body = result.data;
      return next();
    }
    const fields = result.error.issues.map((i) => ({
      field: i.path.join('.') || '(body)',
      message: i.code === 'unrecognized_keys' ? `Unexpected field(s): ${i.keys.join(', ')}` : i.message,
    }));
    return res.status(400).json({ success: false, message: fields[0].message, fields });
  };
}

module.exports = {
  validateBody,
  contactSchema,
  newsletterSchema,
  quoteSchema,
  orderSchema,
  productCreateSchema,
  productUpdateSchema,
  blogCreateSchema,
  blogUpdateSchema,
  catalogProfileSchema,
};
