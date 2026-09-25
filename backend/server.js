const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { requireAuth, requireAdmin, isAdminUser } = require('./middleware/auth');
const { sanitizeText, sanitizeHtml, sanitizeHeader, isValidEmail, isValidString } = require('./lib/sanitize');
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const { sendOrderEmails } = require('./lib/order-email-service');
const { globalExceptionHandler, notFoundHandler, setupProcessErrorHandlers } = require('./lib/error-handler');
const { globalLimiter, formLimiter, userApiLimiter, orderLimiter, uploadLimiter } = require('./lib/rate-limit');
const schemas = require('./lib/schemas');
const { validateBody } = schemas;
const { saveOrder, listOrders } = require('./lib/orders-repo');

// ── Process-level guards (unhandledRejection / uncaughtException) ────────────
// Must run before any async code so nothing slips through.
setupProcessErrorHandlers();

// ── CRITICAL SECURITY: No hardcoded credentials. Fail loudly if env vars missing.
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'CEFI Notifications <onboarding@resend.dev>';
// Bare address of the verified sender ("CEFI Orders <orders@x.com>" → "orders@x.com"),
// so each form can send under its own display name from the same verified domain.
const RESEND_FROM_ADDRESS = (RESEND_FROM_EMAIL.match(/<([^>]+)>/) || [null, RESEND_FROM_EMAIL])[1].trim();
// Internal inbox for contact / quote / newsletter alerts — same inbox as order alerts.
const ADMIN_INBOX = process.env.ADMIN_EMAIL || EMAIL_USER || 'ceylonecofreshinfinity@gmail.com';

if (!EMAIL_USER || !EMAIL_PASS) {
  console.warn('⚠️  SECURITY WARNING: EMAIL_USER or EMAIL_PASS not set in environment. Email via SMTP is disabled.');
}

// ── Initialize Resend Client ──────────────────────────────────────────────────
let resendClient = null;
if (RESEND_API_KEY) {
  try {
    resendClient = new Resend(RESEND_API_KEY);
    console.log('✅ Resend Email API client initialized & ready.');
  } catch (err) {
    console.warn('⚠️ Could not initialize Resend client:', err.message);
  }
}

// ── Persistent SSL SMTP Transporter Pool ─────────────────────────────────────
let mailTransporter = null;
if (EMAIL_USER && EMAIL_PASS) {
  mailTransporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    connectionTimeout: 10000,
    greetingTimeout: 5000,
    socketTimeout: 15000
  });

  mailTransporter.verify((err) => {
    if (err) {
      console.warn('⚠️ SMTP Transporter verification warning:', err.message);
    } else {
      console.log('✅ Email SMTP service initialized & ready (smtp.gmail.com:465).');
    }
  });
}

// Sends one message. Resend (verified domain) first; Gmail SMTP only if Resend
// is unconfigured or rejects the send. Never throws — resolves to true/false.
// options: { fromName, to, replyTo, subject, html, text }
async function sendOneEmail(label, options) {
  const fromName = options.fromName || 'Ceylon Eco Fresh Infinity';

  if (resendClient) {
    try {
      const { data, error } = await resendClient.emails.send({
        from: `${fromName} <${RESEND_FROM_ADDRESS}>`,
        to: options.to,
        replyTo: options.replyTo || undefined,
        subject: options.subject,
        html: options.html,
        text: options.text || undefined
      });
      if (!error) {
        console.log(`✅ [Resend:${label}] sent to ${options.to} (id: ${data?.id || 'n/a'})`);
        return true;
      }
      console.warn(`⚠️ [Resend:${label}] ${error.message || 'send rejected'}`);
    } catch (err) {
      console.warn(`⚠️ [Resend:${label}] exception: ${err.message}`);
    }
  }

  if (mailTransporter) {
    try {
      const info = await mailTransporter.sendMail({
        from: `"${fromName}" <${EMAIL_USER}>`,
        to: options.to,
        replyTo: options.replyTo || undefined,
        subject: options.subject,
        html: options.html,
        text: options.text || undefined
      });
      console.log(`✅ [SMTP:${label}] sent to ${options.to} (${info.messageId})`);
      return true;
    } catch (smtpErr) {
      console.error(`❌ [SMTP:${label}] ${smtpErr.message}`);
    }
  }

  return false;
}

// Sends the admin alert and the customer acknowledgement concurrently.
// customerOptions may be null (e.g. diagnostic sends).
async function sendDualEmails(adminOptions, customerOptions) {
  const wantsCustomer = Boolean(customerOptions && customerOptions.to && customerOptions.to !== adminOptions.to);

  const [adminSent, customerSent] = await Promise.all([
    sendOneEmail('admin', adminOptions),
    wantsCustomer ? sendOneEmail('customer', customerOptions) : Promise.resolve(false)
  ]);

  return {
    success: adminSent && (!wantsCustomer || customerSent),
    method: resendClient ? 'resend' : 'smtp',
    adminSent,
    customerSent
  };
}

// Admin-only last resort for form leads: if neither Resend nor SMTP reached the
// inbox, push the submission through FormSubmit so the enquiry isn't lost.
async function sendAdminViaFormSubmit(payload) {
  try {
    const res = await fetch(`https://formsubmit.co/ajax/${ADMIN_INBOX}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch (err) {
    console.error('❌ [FormSubmit] fallback failed:', err.message);
    return false;
  }
}

// Try to load multer (for file uploads)
let multer;
try {
  multer = require('multer');
} catch (e) {
  multer = null;
}

const supabase = require('./supabaseClient');

// Field-level selects: queries name their columns, so a column added to a
// table later (e.g. internal notes) is never exposed by an existing endpoint.
const PRODUCT_COLUMNS = 'id, name, slug, short_description, full_description, price, category_slug, category_name, origin, weight, weight_g, stock_quantity, is_wholesale_only, is_featured, images, variants, created_at, updated_at';
const CATEGORY_COLUMNS = 'id, name, slug, description, image_url';
const BLOG_COLUMNS = 'id, title, slug, category, cover_image, excerpt, content, author, read_time_min, published_at, updated_at';
const mockData = require('./mockData');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Setup uploads directory ──────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
} catch (e) {
  console.warn('⚠️ Could not create uploads directory (read-only filesystem):', e.message);
}

// ── Middleware ───────────────────────────────────────────────────────────────
// Security Headers
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));

// Rate limiting (lib/rate-limit.js): per-IP for anonymous traffic, per-user
// once signed in; shared across serverless instances when Upstash is set.
app.use(globalLimiter);

// HIGH FIX: Tight CORS — only allow known frontend origins
// Origins are normalised before comparison: an env value with a stray space,
// trailing slash or different letter case must not silently block the site.
const normaliseOrigin = (value) => String(value || '').trim().replace(/\/+$/, '').toLowerCase();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_WWW,
  process.env.NODE_ENV !== 'production' ? 'http://localhost:3000' : null,
  // Vite dev server port (frontend/vite.config.js). Without this, the checkout
  // POST is CORS-rejected locally and only the admin-side fallback email fires.
  process.env.NODE_ENV !== 'production' ? 'http://localhost:3001' : null,
  process.env.NODE_ENV !== 'production' ? 'http://localhost:5173' : null,
].map(normaliseOrigin).filter(Boolean);

/**
 * True when the browser's Origin is this same deployment. On Vercel the
 * frontend and /api are served from one domain, so these requests are not
 * cross-origin at all and must never depend on FRONTEND_URL matching exactly.
 * (Browsers send Origin on same-origin POSTs, which is why checkout broke
 * while GET-only pages kept working.)
 */
function isSameOrigin(req, origin) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '')
    .split(',')[0].trim().toLowerCase();
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

app.use(cors((req, callback) => {
  const rawOrigin = req.headers.origin;
  const origin = normaliseOrigin(rawOrigin);

  const allowed =
    !rawOrigin ||                         // server-to-server / curl
    allowedOrigins.includes(origin) ||    // explicitly whitelisted
    isSameOrigin(req, rawOrigin) ||       // same deployment
    // Unconfigured allowlist: open only outside production. In production a
    // missing FRONTEND_URL must not silently switch the whitelist off.
    (allowedOrigins.length === 0 && process.env.NODE_ENV !== 'production');

  if (!allowed) {
    const err = new Error(`CORS policy: origin '${rawOrigin}' is not allowed`);
    err.status = 403;
    err.isCorsRejection = true;
    return callback(err);
  }

  callback(null, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });
}));
app.use(express.json({ limit: '1mb' }));  // Vault Module 4: 1MB hard cap
app.use(cookieParser());
app.use('/uploads', express.static(uploadsDir));

// ── Debug: deployment config (admin-only — reveals env layout and origins) ──
app.get('/api/debug', requireAdmin, userApiLimiter, (req, res) => {
  res.json({
    status: 'ok',
    supabaseConnected: !!supabase,
    envVars: {
      SUPABASE_URL: process.env.SUPABASE_URL ? '✅ set' : '❌ missing',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ set' : '❌ missing',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? '✅ set' : '❌ missing',
      FRONTEND_URL: process.env.FRONTEND_URL || '❌ missing',
      FRONTEND_URL_WWW: process.env.FRONTEND_URL_WWW || '❌ missing',
      NODE_ENV: process.env.NODE_ENV || 'not set',
    },
    allowedOrigins,
  });
});

// ── Multer storage config ────────────────────────────────────────────────────
let upload = null;
if (multer) {
  const storage = multer.memoryStorage();
  // 4 MB per file: Vercel rejects request bodies over 4.5 MB before they reach
  // the function, so a higher limit here would only produce an opaque 413.
  upload = multer({ storage, limits: { fileSize: 4 * 1024 * 1024, files: 10 } });
}

// ── Email Diagnostic Test Endpoint ───────────────────────────────────────────
// Admin-only: sends to any ?to= address, so a customer login must not reach it
app.get('/api/test-email', requireAdmin, userApiLimiter, async (req, res) => {
  const targetEmail = req.query.to || process.env.ADMIN_EMAIL || process.env.EMAIL_USER || 'ceylonecofreshinfinity@gmail.com';
  console.log(`🧪 Diagnostic Test Email requested for: ${targetEmail}`);

  const testAdminOptions = {
    to: targetEmail,
    subject: `🧪 CEFI Email System Test (${new Date().toLocaleTimeString()})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #1F532E;">✅ CEFI Email Service is Working!</h2>
        <p>This is a live test email sent from your deployed CEFI Ecommerce system on Vercel.</p>
        <p><strong>Environment:</strong> Vercel Serverless Function</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      </div>
    `,
    text: `CEFI Email Service is Working! Sent at ${new Date().toISOString()}`
  };

  const dispatchResult = await sendDualEmails(testAdminOptions, null);
  return res.json({
    success: dispatchResult.success,
    method: dispatchResult.method,
    targetEmail,
    resendConfigured: Boolean(resendClient),
    smtpConfigured: Boolean(mailTransporter),
    resendFrom: RESEND_FROM_EMAIL,
    dispatchResult
  });
});

// ── Current user / admin status ───────────────────────────────────────────────
// The single source of truth for "is this user an admin" is ADMIN_EMAILS /
// app_metadata.role on the backend (see middleware/auth.js). The frontend
// never hardcodes an admin email — it asks here instead, every time it needs
// to know, so a tampered localStorage value can never grant admin UI access.
app.get('/api/auth/me', requireAuth, userApiLimiter, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      emailConfirmed: Boolean(req.user.email_confirmed_at),
      isAdmin: isAdminUser(req.user),
    }
  });
});

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    brand: 'Ceylon Eco Fresh Infinity (CEFI)',
    supabaseConnected: Boolean(supabase),
    multerAvailable: Boolean(multer),
    timestamp: new Date().toISOString()
  });
});

// ── Categories ───────────────────────────────────────────────────────────────
app.get('/api/categories', async (req, res) => {
  const order = ['herbal-leaves', 'herbal-flowers', 'tea', 'spices', 'fruits', 'vegetables'];
  const sortData = (data) => {
    return data.sort((a, b) => {
      let indexA = order.indexOf(a.slug);
      let indexB = order.indexOf(b.slug);
      if (indexA === -1) indexA = 999;
      if (indexB === -1) indexB = 999;
      return indexA - indexB;
    });
  };

  try {
    if (supabase) {
      const { data, error } = await supabase.from('categories').select(CATEGORY_COLUMNS);
      if (!error && data && data.length > 0) return res.json(sortData(data));
    }
    return res.json(sortData([...mockData.categories]));
  } catch (err) {
    res.json(sortData([...mockData.categories]));
  }
});

app.get('/api/categories/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    if (supabase) {
      const { data, error } = await supabase.from('categories').select(CATEGORY_COLUMNS).eq('slug', slug).single();
      if (!error && data) return res.json(data);
    }
    const cat = mockData.categories.find(c => c.slug === slug);
    if (cat) return res.json(cat);
    return res.status(404).json({ message: 'Category not found' });
  } catch (err) {
    const cat = mockData.categories.find(c => c.slug === slug);
    if (cat) return res.json(cat);
    return res.status(404).json({ message: 'Category not found' });
  }
});

// ── Catalog Profile (Portfolio Header & Category Descriptions) ────────────────
const catalogProfilePath = path.join(__dirname, 'catalogProfile.json');

const defaultCatalogProfile = {
  all: {
    badge: 'Catalog Portfolio',
    title: 'All Ceylon Products',
    description: 'Explore 100% natural Ceylon teas, true cinnamon, spices, dried tropical fruits, and herbs harvested directly from Sri Lankan estates.'
  },
  categories: {
    'herbal-leaves': {
      badge: 'Herbal Wellness',
      title: 'Herbal Leaves Collection',
      description: 'Pure Ceylon therapeutic leaves and traditional Ayurvedic botanicals nurtured by the island\'s pristine soil.'
    },
    'herbal-flowers': {
      badge: 'Artisan Botanicals',
      title: 'Herbal Flowers Collection',
      description: 'Solar-dried therapeutic Ceylon flowers including Blue Lotus and Butterfly Pea for exquisite herbal infusions.'
    },
    tea: {
      badge: 'Highland Single-Origin',
      title: 'Pure Ceylon Tea Collection',
      description: 'World-renowned Ceylon black, green, and silver needle teas hand-picked from mist-covered mountain elevations.'
    },
    spices: {
      badge: 'Authentic Ceylon Spices',
      title: 'True Spices & Cinnamon Collection',
      description: 'Finest Ceylon Alba cinnamon, high-piperine black pepper, pungent cloves, and sun-cured spices.'
    },
    fruits: {
      badge: 'Solar Dehydrated',
      title: 'Tropical Dried Fruits Collection',
      description: 'Naturally sweet, sulfur-free dehydrated mango, pineapple, papaya, and exotic Ceylon orchard produce.'
    },
    vegetables: {
      badge: 'Farmstead Produce',
      title: 'Dehydrated Vegetables & Produce',
      description: 'Premium dehydrated young green jackfruit, kohila, and seasonal farm vegetables processed under ISO 22000 standards.'
    }
  }
};

let currentCatalogProfile = defaultCatalogProfile;
try {
  if (fs.existsSync(catalogProfilePath)) {
    currentCatalogProfile = JSON.parse(fs.readFileSync(catalogProfilePath, 'utf8'));
  }
} catch (e) {
  console.warn('Could not read catalogProfile.json on startup:', e.message);
}

function saveCatalogProfile(data) {
  currentCatalogProfile = { ...defaultCatalogProfile, ...data };
  try {
    fs.writeFileSync(catalogProfilePath, JSON.stringify(currentCatalogProfile, null, 2), 'utf8');
  } catch (e) {
    console.warn('Filesystem is read-only (e.g. Vercel serverless), stored in-memory:', e.message);
  }
}

app.get('/api/catalog-profile', (req, res) => {
  return res.json(currentCatalogProfile || defaultCatalogProfile);
});

app.post('/api/catalog-profile', requireAdmin, userApiLimiter, validateBody(schemas.catalogProfileSchema), (req, res) => {
  try {
    const updated = req.body;
    if (!updated || typeof updated !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid profile data' });
    }
    saveCatalogProfile(updated);
    return res.json({ success: true, message: 'Catalog profile updated successfully', data: currentCatalogProfile });
  } catch (e) {
    console.error('Error saving catalog profile:', e);
    return res.status(500).json({ success: false, error: 'Failed to update catalog profile' });
  }
});

app.put('/api/catalog-profile', requireAdmin, userApiLimiter, validateBody(schemas.catalogProfileSchema), (req, res) => {
  try {
    const updated = req.body;
    if (!updated || typeof updated !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid profile data' });
    }
    saveCatalogProfile(updated);
    return res.json({ success: true, message: 'Catalog profile updated successfully', data: currentCatalogProfile });
  } catch (e) {
    console.error('Error saving catalog profile:', e);
    return res.status(500).json({ success: false, error: 'Failed to update catalog profile' });
  }
});

// ── Products: GET all ─────────────────────────────────────────────────────────
app.get('/api/products', async (req, res) => {
  const { category, search, sort, featured, wholesale } = req.query;
  try {
    let list = [...mockData.products];
    let source = 'mockData';
    if (supabase) {
      const { data, error } = await supabase.from('products').select(PRODUCT_COLUMNS);
      if (error) {
        console.error('❌ Supabase products fetch error:', error.message);
      } else if (data && data.length > 0) {
        list = data;
        source = 'supabase';
      } else {
        console.warn('⚠️ Supabase returned 0 products — check RLS policies or table data.');
      }
    }
    console.log(`📦 GET /api/products — source: ${source}, count: ${list.length}`);
    if (category && category !== 'all') list = list.filter(p => (p.category_slug || '').toLowerCase() === category.toLowerCase());
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || (p.short_description || '').toLowerCase().includes(q));
    }
    if (featured === 'true') list = list.filter(p => p.is_featured);
    if (wholesale === 'true') list = list.filter(p => p.is_wholesale_only);
    if (sort === 'price-low') list.sort((a, b) => a.price - b.price);
    else if (sort === 'price-high') list.sort((a, b) => b.price - a.price);
    else if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    return res.json(list);
  } catch (err) {
    console.error('❌ /api/products crash:', err.message);
    return res.json(mockData.products);
  }
});

// ── Products: GET one ─────────────────────────────────────────────────────────
app.get('/api/products/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    if (supabase) {
      const { data, error } = await supabase.from('products').select(PRODUCT_COLUMNS).eq('slug', slug).single();
      if (!error && data) return res.json(data);
    }
    const prod = mockData.products.find(p => p.slug === slug);
    if (prod) return res.json(prod);
    return res.status(404).json({ message: 'Product not found' });
  } catch (err) {
    const prod = mockData.products.find(p => p.slug === slug);
    if (prod) return res.json(prod);
    return res.status(404).json({ message: 'Product not found' });
  }
});

// ── Products: POST (Add new) ──────────────────────────────────────────────────
// CRITICAL FIX: All product write endpoints now require authentication
app.post('/api/products', requireAdmin, userApiLimiter, validateBody(schemas.productCreateSchema), async (req, res) => {
  const { name, slug, price, short_description, full_description, images, category_slug, is_wholesale_only, is_featured, variants } = req.body;
  if (!name || !slug || !category_slug) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }
  const category = mockData.categories.find(c => c.slug === category_slug);

  // XSS FIX: Sanitize all text fields before storage
  const payload = {
    name:              sanitizeText(name, 300),
    slug:              sanitizeText(slug, 200).toLowerCase(),
    price:             parseFloat(price) || 0,
    short_description: sanitizeText(short_description || '', 1000),
    full_description:  sanitizeHtml(full_description || ''),
    images:            images && images.length > 0 ? images : [],
    category_slug,
    category_name:     category ? category.name : category_slug,
    is_wholesale_only: Boolean(is_wholesale_only),
    is_featured:       Boolean(is_featured),
    variants:          variants || null
  };
  try {
    if (supabase) {
      const { data, error } = await supabase.from('products').insert([payload]).select(PRODUCT_COLUMNS);
      if (error) {
        console.error('Supabase insert error:', error.message);
        return res.status(500).json({ success: false, message: 'Could not save the product. Please try again.' });
      }
      if (process.env.NODE_ENV !== 'production') console.log('📦 Product Added to Supabase:', payload.name);
      return res.json({ success: true, message: 'Product added!', product: data[0] });
    }
  } catch (err) { console.error(err); }

  // Fallback for mock data — crypto-secure ID
  const crypto = require('crypto');
  payload.id = `prod-${crypto.randomUUID()}`;
  mockData.products.push(payload);
  return res.json({ success: true, message: 'Product added!', product: payload });
});

app.put('/api/products/:id', requireAdmin, userApiLimiter, validateBody(schemas.productUpdateSchema), async (req, res) => {
  const { id } = req.params;
  const updates = { ...req.body };
  delete updates.id; // don't update ID

  // XSS FIX: Sanitize text fields before writing to DB
  if (updates.name)              updates.name              = sanitizeText(updates.name, 300);
  if (updates.slug)              updates.slug              = sanitizeText(updates.slug, 200).toLowerCase();
  if (updates.short_description) updates.short_description = sanitizeText(updates.short_description, 1000);
  if (updates.full_description)  updates.full_description  = sanitizeHtml(updates.full_description);
  if (updates.origin)            updates.origin            = sanitizeText(updates.origin, 200);
  if (updates.weight)            updates.weight            = sanitizeText(updates.weight, 100);

  // Only send columns that exist in the Supabase products table
  const ALLOWED_COLUMNS = ['name', 'slug', 'price', 'short_description', 'full_description',
    'category_slug', 'category_name', 'origin', 'weight', 'weight_g', 'stock_quantity',
    'is_wholesale_only', 'is_featured', 'images', 'variants', 'updated_at'];
  const sanitized = {};
  ALLOWED_COLUMNS.forEach(col => {
    if (updates[col] !== undefined) sanitized[col] = updates[col];
  });
  sanitized.updated_at = new Date().toISOString();

  try {
    if (supabase) {
      // try to update in supabase by id or slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      let query = supabase.from('products').update(sanitized);
      if (isUUID) {
        query = query.eq('id', id);
      } else {
        query = query.eq('slug', id);
      }
      
      const { data, error } = await query.select(PRODUCT_COLUMNS);
      if (error) {
        console.error('Supabase update error:', error.message);
        return res.status(500).json({ success: false, message: 'Could not update the product. Please try again.' });
      }
      if (data && data.length > 0) {
        console.log('✏️ Product Updated in Supabase:', sanitized.name || id);
        return res.json({ success: true, message: 'Product updated!', product: data[0] });
      }
      // Not found in Supabase
      return res.status(404).json({ success: false, message: 'Product not found in database.' });
    }
  } catch (err) {
    console.error('PUT error:', err);
    return res.status(500).json({ success: false, message: 'Server error during update.' });
  }

  const idx = mockData.products.findIndex(p => p.id === id || p.slug === id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Product not found.' });

  const category = mockData.categories.find(c => c.slug === (updates.category_slug || mockData.products[idx].category_slug));
  mockData.products[idx] = {
    ...mockData.products[idx],
    ...updates,
    category_name: category ? category.name : (updates.category_slug || mockData.products[idx].category_slug),
    price: parseFloat(updates.price) || mockData.products[idx].price,
    updated_at: new Date().toISOString()
  };

  console.log('✏️ Product Updated locally:', mockData.products[idx].name);
  return res.json({ success: true, message: 'Product updated!', product: mockData.products[idx] });
});

// ── Products: DELETE ──────────────────────────────────────────────────────────
app.delete('/api/products/:id', requireAdmin, userApiLimiter, async (req, res) => {
  const { id } = req.params;

  try {
    if (supabase) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      let query = supabase.from('products').delete();
      if (isUUID) {
        query = query.eq('id', id);
      } else {
        query = query.eq('slug', id);
      }
      const { error } = await query;
      if (error) {
        console.error('Supabase delete error:', error.message);
        return res.status(500).json({ success: false, message: 'Could not delete the product. Please try again.' });
      }
      console.log('🗑️ Product Deleted from Supabase:', id);
      return res.json({ success: true, message: 'Product deleted!' });
    }
  } catch (err) { console.error(err); }

  const idx = mockData.products.findIndex(p => p.id === id || p.slug === id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Product not found.' });

  const deleted = mockData.products.splice(idx, 1)[0];
  console.log('🗑️ Product Deleted locally:', deleted.name);
  return res.json({ success: true, message: 'Product deleted!' });
});

// Secure upload libs (sharp may not be available in all environments)
let validateFile, sanitizeFilename, processImage;
try {
  ({ validateFile, sanitizeFilename } = require('./lib/magic-bytes'));
  ({ processImage } = require('./lib/image-processor'));
} catch (e) {
  console.warn('⚠️ Image processing libs unavailable (sharp not built for this platform):', e.message);
}

// Admin-only: prevents storage quota exhaustion and catalogue image tampering
app.post('/api/upload', requireAdmin, uploadLimiter, (req, res) => {
  if (!upload) {
    return res.status(500).json({ success: false, message: 'Image upload not available. Run: npm install multer in the backend folder.' });
  }
  upload.array('images', 10)(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: 'No files uploaded.' });
    
    try {
      const urls = [];
      const isProduct = req.body.purpose === 'product' || !req.body.purpose;
      const purpose = isProduct ? 'product' : 'attachment';

      for (const file of req.files) {
        // 1. Magic byte & size validation
        const validation = validateFile(file.buffer, file.mimetype, purpose);
        
        if (!validation.isValid) {
          return res.status(400).json({ 
            success: false, 
            message: 'File validation failed', 
            errors: validation.errors 
          });
        }

        // 2. Re-encode and sanitize with Sharp
        const processed = await processImage(
          file.buffer, 
          validation.detectedMimeType, 
          purpose
        );

        // 3. Sanitize filename
        const { safeFilename } = sanitizeFilename(processed.mimeType);

        if (supabase) {
          const { error } = await supabase.storage
            .from('product-images')
            .upload(safeFilename, processed.buffer, {
              contentType: processed.mimeType,
              cacheControl: '31536000',
              upsert: false
            });
            
          if (error) throw error;
          
          const { data: publicData } = supabase.storage
            .from('product-images')
            .getPublicUrl(safeFilename);
            
          urls.push(publicData.publicUrl);
        } else {
          // Fallback if no supabase
          const localPath = path.join(uploadsDir, safeFilename);
          fs.writeFileSync(localPath, processed.buffer);
          urls.push(`http://localhost:${PORT}/uploads/${safeFilename}`);
        }
      }
      return res.json({ success: true, urls });
    } catch (uploadError) {
      console.error('Secure upload error:', uploadError);
      return res.status(500).json({ success: false, message: 'Failed to process and upload files safely.' });
    }
  });
});

// ── Blog storage ─────────────────────────────────────────────────────────────
// The blog_posts table is the single source of truth once the migration has
// run (it seeds the posts from blogs.json). Every write goes to exactly one
// store, so a post can't end up half-saved in two places. Until the table
// exists, blogs.json is used — that works locally, and on Vercel's read-only
// filesystem a write fails loudly (503) instead of pretending to succeed.
const blogsFilePath = path.join(__dirname, 'blogs.json');
let blogTableMissing = !supabase;

function isMissingTable(error) {
  return Boolean(error && /blog_posts|schema cache|does not exist/i.test(error.message));
}

function readBlogFile() {
  try {
    if (fs.existsSync(blogsFilePath)) return JSON.parse(fs.readFileSync(blogsFilePath, 'utf8'));
  } catch (e) {
    console.error('Error reading blogs.json:', e.message);
  }
  return mockData.blogPosts || [];
}

function writeBlogFile(blogs) {
  fs.writeFileSync(blogsFilePath, JSON.stringify(blogs, null, 2), 'utf8');
}

const blogStore = {
  async list() {
    if (!blogTableMissing) {
      const { data, error } = await supabase.from('blog_posts').select(BLOG_COLUMNS).order('published_at', { ascending: false });
      if (!error) return data;
      if (!isMissingTable(error)) throw error;
      blogTableMissing = true;
    }
    return readBlogFile();
  },

  async find(idOrSlug) {
    // The value is interpolated into a PostgREST filter below; only plain
    // id/slug characters are allowed so it can't inject extra conditions.
    if (!/^[\w-]{1,200}$/.test(String(idOrSlug))) return null;
    if (!blogTableMissing) {
      const { data, error } = await supabase.from('blog_posts').select(BLOG_COLUMNS)
        .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`).limit(1);
      if (!error) return data[0] || null;
      if (!isMissingTable(error)) throw error;
      blogTableMissing = true;
    }
    return readBlogFile().find((b) => b.id === idOrSlug || b.slug === idOrSlug) || null;
  },

  async create(post) {
    if (!blogTableMissing) {
      const { data, error } = await supabase.from('blog_posts').insert(post).select(BLOG_COLUMNS).single();
      if (!error) return data;
      if (!isMissingTable(error)) throw error;
      blogTableMissing = true;
    }
    const blogs = readBlogFile();
    blogs.unshift(post);
    writeBlogFile(blogs);
    return post;
  },

  async update(id, changes) {
    if (!blogTableMissing) {
      const { data, error } = await supabase.from('blog_posts').update(changes).eq('id', id).select(BLOG_COLUMNS).single();
      if (!error) return data;
      if (!isMissingTable(error)) throw error;
      blogTableMissing = true;
    }
    const blogs = readBlogFile();
    const i = blogs.findIndex((b) => b.id === id);
    if (i === -1) return null;
    blogs[i] = { ...blogs[i], ...changes };
    writeBlogFile(blogs);
    return blogs[i];
  },

  async remove(id) {
    if (!blogTableMissing) {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id);
      if (!error) return;
      if (!isMissingTable(error)) throw error;
      blogTableMissing = true;
    }
    writeBlogFile(readBlogFile().filter((b) => b.id !== id));
  },
};

const toSlug = (value) => String(value).toLowerCase().trim()
  .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

const blogStorageError = (res, action, err) => {
  console.error(`❌ [Blog] ${action} failed:`, err.message);
  return res.status(503).json({ success: false, message: `Could not ${action} the article right now. Please try again.` });
};

// ── Blog: GET all ─────────────────────────────────────────────────────────────
app.get('/api/blog', async (req, res) => {
  try {
    return res.json(await blogStore.list());
  } catch (err) {
    console.error('❌ [Blog] list failed:', err.message);
    return res.json(readBlogFile());
  }
});

// ── Blog: GET one by slug or id ───────────────────────────────────────────────
app.get('/api/blog/:slug', async (req, res) => {
  const key = String(req.params.slug).slice(0, 200);
  if (!/^[\w-]+$/.test(key)) return res.status(404).json({ message: 'Post not found' });
  try {
    const post = await blogStore.find(key);
    return post ? res.json(post) : res.status(404).json({ message: 'Post not found' });
  } catch (err) {
    console.error('❌ [Blog] read failed:', err.message);
    return res.status(404).json({ message: 'Post not found' });
  }
});

// ── Blog: POST (Create New Article) ──────────────────────────────────────────
app.post('/api/blog', requireAdmin, userApiLimiter, validateBody(schemas.blogCreateSchema), async (req, res) => {
  const { title, slug, cover_image, excerpt, content, author, category, read_time_min } = req.body;

  // Stored XSS guard: strip/sanitise every user-supplied string.
  const newPost = {
    id: `blog-${Date.now()}`,
    title:         sanitizeText(title, 300),
    slug:          toSlug(slug || title),
    category:      sanitizeText(category || 'Trade & Insights', 100),
    cover_image:   sanitizeText(cover_image || 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=800&q=80', 1000),
    excerpt:       sanitizeText(excerpt || content.substring(0, 160), 500),
    content:       sanitizeHtml(content),
    author:        sanitizeText(author || 'CEFI Editorial Team', 100),
    read_time_min: read_time_min || 5,
    published_at:  new Date().toISOString()
  };

  try {
    const post = await blogStore.create(newPost);
    console.log(`📝 New Blog Post Created: "${post.title}"`);
    return res.json({ success: true, message: 'Blog article published successfully!', post });
  } catch (err) {
    return blogStorageError(res, 'publish', err);
  }
});

// ── Blog: PUT (Update Article) ────────────────────────────────────────────────
app.put('/api/blog/:id', requireAdmin, userApiLimiter, validateBody(schemas.blogUpdateSchema), async (req, res) => {
  const { title, slug, cover_image, excerpt, content, author, category, read_time_min } = req.body;

  try {
    const existing = await blogStore.find(String(req.params.id).slice(0, 200));
    if (!existing) return res.status(404).json({ success: false, message: 'Article not found.' });

    // Only fields that were sent change; each is sanitised.
    const changes = { updated_at: new Date().toISOString() };
    if (title !== undefined)         changes.title = sanitizeText(title, 300);
    if (slug !== undefined)          changes.slug = toSlug(slug);
    if (category !== undefined)      changes.category = sanitizeText(category, 100);
    if (cover_image !== undefined)   changes.cover_image = sanitizeText(cover_image, 1000);
    if (excerpt !== undefined)       changes.excerpt = sanitizeText(excerpt, 500);
    if (content !== undefined)       changes.content = sanitizeHtml(content);
    if (author !== undefined)        changes.author = sanitizeText(author, 100);
    if (read_time_min !== undefined) changes.read_time_min = read_time_min;

    const post = await blogStore.update(existing.id, changes);
    console.log(`📝 Blog Post Updated: "${post.title}"`);
    return res.json({ success: true, message: 'Blog article updated successfully!', post });
  } catch (err) {
    return blogStorageError(res, 'update', err);
  }
});

// ── Blog: DELETE Article ──────────────────────────────────────────────────────
app.delete('/api/blog/:id', requireAdmin, userApiLimiter, async (req, res) => {
  try {
    const existing = await blogStore.find(String(req.params.id).slice(0, 200));
    if (!existing) return res.status(404).json({ success: false, message: 'Article not found.' });
    await blogStore.remove(existing.id);
    console.log(`🗑️ Blog Post Deleted: ${existing.id}`);
    return res.json({ success: true, message: 'Blog article deleted successfully!' });
  } catch (err) {
    return blogStorageError(res, 'delete', err);
  }
});

// ── Contact / Quotes / Orders ─────────────────────────────────────────────────
async function sendContactEmail(record) {
  const targetEmail = ADMIN_INBOX;
  const { name, email, phone, subject, message } = record;
  const emailSubject = `📬 New Contact Inquiry: ${subject || 'General Inquiry'} - from ${name}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #1F532E; color: #ffffff; padding: 24px; text-align: center;">
        <h2 style="margin: 0; color: #D4AF37; font-size: 22px;">Ceylon Eco Fresh Infinity (Pvt) Ltd</h2>
        <p style="margin: 6px 0 0; font-size: 13px; color: #d1fae5;">Website Contact Form Message</p>
      </div>
      <div style="padding: 24px; color: #334155;">
        <h3 style="color: #1F532E; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; font-size: 15px;">Sender Details</h3>
        <table style="width: 100%; font-size: 13px; line-height: 1.6; margin-bottom: 20px;">
          <tr><td style="width: 140px; font-weight: bold; color: #64748b;">Full Name:</td><td><strong>${name}</strong></td></tr>
          <tr><td style="font-weight: bold; color: #64748b;">Email Address:</td><td><a href="mailto:${email}" style="color: #1F532E; font-weight: bold;">${email}</a></td></tr>
          <tr><td style="font-weight: bold; color: #64748b;">Phone / WhatsApp:</td><td><strong>${phone || 'Not provided'}</strong></td></tr>
          <tr><td style="font-weight: bold; color: #64748b;">Inquiry Subject:</td><td><strong>${subject || 'General Inquiry'}</strong></td></tr>
          <tr><td style="font-weight: bold; color: #64748b;">Submitted At:</td><td>${new Date().toLocaleString()}</td></tr>
        </table>

        <h3 style="color: #1F532E; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; font-size: 15px;">Message Content</h3>
        <div style="background-color: #f8fafc; border-left: 4px solid #1F532E; padding: 16px; border-radius: 8px; font-size: 14px; line-height: 1.6; color: #1e293b; white-space: pre-wrap;">
${message}
        </div>
      </div>
      <div style="background-color: #f8fafc; padding: 14px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        Ceylon Eco Fresh Infinity (Pvt) Ltd · Automated Web Portal Dispatch
      </div>
    </div>
  `;

  // 1. Resend (verified domain), with Gmail SMTP as a per-message fallback
  let customerSent = false;
  if (resendClient || mailTransporter) {
    try {
      const adminOptions = {
        fromName: 'CEFI Contact Form',
        to: targetEmail,
        replyTo: email,
        subject: emailSubject,
        text: `New Contact Form Message from ${name} (${email}, ${phone || 'No phone'})\n\nSubject: ${subject}\n\nMessage:\n${message}`,
        html: htmlContent,
      };

      const customerOptions = (email && email !== targetEmail) ? {
        fromName: 'Ceylon Eco Fresh Infinity',
        replyTo: targetEmail,
        to: email,
        subject: `✅ We received your message, ${name.split(' ')[0]}! — CEFI`,
        text: `Dear ${name},\n\nThank you for contacting Ceylon Eco Fresh Infinity. We have received your message regarding "${subject}" and our team will respond within 24 hours.\n\nFor urgent matters, contact us at +94 714 634 485.\n\nBest regards,\nCeylon Eco Fresh Infinity Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
            <div style="background-color: #1F532E; color: #ffffff; padding: 24px; text-align: center;">
              <h2 style="margin: 0; color: #D4AF37; font-size: 22px;">Ceylon Eco Fresh Infinity (Pvt) Ltd</h2>
              <p style="margin: 6px 0 0; font-size: 13px; color: #d1fae5;">We've received your message!</p>
            </div>
            <div style="padding: 24px; color: #334155;">
              <p style="font-size: 15px; margin: 0 0 16px;">Dear <strong>${name}</strong>,</p>
              <p style="font-size: 14px; color: #475569; line-height: 1.6;">Thank you for contacting Ceylon Eco Fresh Infinity. We have received your message and our team will get back to you within <strong>24 hours</strong>.</p>
              <div style="background-color: #f0fdf4; border-left: 4px solid #1F532E; padding: 14px 16px; border-radius: 8px; margin: 20px 0; font-size: 13px; color: #065f46;">
                <strong>Your Inquiry:</strong> ${subject || 'General Inquiry'}<br/>
                <strong>Submitted:</strong> ${new Date().toLocaleString()}
              </div>
              <p style="font-size: 13px; color: #64748b;">If your matter is urgent, you can reach us directly at <a href="tel:+94714634485" style="color: #1F532E;">+94 714 634 485</a> (WhatsApp available).</p>
            </div>
            <div style="background-color: #f8fafc; padding: 14px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
              Ceylon Eco Fresh Infinity (Pvt) Ltd · No. 278/1/A, Meegasmulla, Dedigamuwa · ceylonecofreshinfinity@gmail.com
            </div>
          </div>
        `
      } : null;

      const result = await sendDualEmails(adminOptions, customerOptions);
      customerSent = result.customerSent;
      if (result.adminSent) return result;
    } catch (err) {
      console.warn('⚠️ [Email] Contact email failed:', err.message);
    }
  }

  // 2. Admin-only fallback so the enquiry still reaches the inbox
  const delivered = await sendAdminViaFormSubmit({
    _subject: emailSubject,
    _replyto: email,
    name,
    email,
    phone: phone || 'Not provided',
    subject: subject || 'General Inquiry',
    message,
    submitted_at: new Date().toLocaleString()
  });
  return { success: delivered, method: 'formsubmit', adminSent: delivered, customerSent };
}

// ── Contact Route (POST /api/contact) ─────────────────────────────────────────
app.post('/api/contact', formLimiter, validateBody(schemas.contactSchema), async (req, res) => {
  const { name, email, phone, subject, message } = req.body;

  // MEDIUM FIX: Strict input validation with email format check and length caps
  if (!name || !isValidString(name, 200)) {
    return res.status(400).json({ success: false, message: 'A valid name is required (max 200 chars).' });
  }
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ success: false, message: 'A valid email address is required.' });
  }
  if (!message || !isValidString(message, 5000)) {
    return res.status(400).json({ success: false, message: 'A message is required (max 5000 characters).' });
  }

  const record = {
    name:    sanitizeText(name, 200),
    email:   email.trim().toLowerCase(),
    phone:   sanitizeText(phone || '', 30),
    subject: sanitizeText(subject || 'General Inquiry', 300),
    message: sanitizeText(message, 5000),
    createdAt: new Date().toISOString()
  };

  if (process.env.NODE_ENV !== 'production') {
    console.log(`📬 New Contact Message from ${record.name}`);
  }
  const dispatchResult = await sendContactEmail(record);
  if (!dispatchResult.adminSent) {
    return res.status(502).json({ success: false, message: 'We could not deliver your message right now. Please try again.', dispatch: dispatchResult });
  }
  return res.json({
    success: true,
    message: 'Your message has been sent to Ceylon Eco Fresh Infinity!',
    customerEmailed: dispatchResult.customerSent,
    dispatch: dispatchResult
  });
});

// ── Newsletter Route (POST /api/newsletter) ──────────────────────────────────
async function sendNewsletterEmail(email) {
  const targetEmail = ADMIN_INBOX;
  const emailSubject = `📩 New Newsletter Subscriber: ${email}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #1F532E; color: #ffffff; padding: 24px; text-align: center;">
        <h2 style="margin: 0; color: #D4AF37; font-size: 22px;">Ceylon Eco Fresh Infinity (Pvt) Ltd</h2>
        <p style="margin: 6px 0 0; font-size: 13px; color: #d1fae5;">New Newsletter Subscription</p>
      </div>
      <div style="padding: 24px; color: #334155;">
        <h3 style="color: #1F532E; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; font-size: 15px;">Subscriber Details</h3>
        <table style="width: 100%; font-size: 13px; line-height: 1.6; margin-bottom: 20px;">
          <tr><td style="width: 140px; font-weight: bold; color: #64748b;">Email Address:</td><td><a href="mailto:${email}" style="color: #1F532E; font-weight: bold;">${email}</a></td></tr>
          <tr><td style="font-weight: bold; color: #64748b;">Subscribed At:</td><td>${new Date().toLocaleString()}</td></tr>
        </table>
      </div>
      <div style="background-color: #f8fafc; padding: 14px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        Ceylon Eco Fresh Infinity (Pvt) Ltd · Automated Web Portal Dispatch
      </div>
    </div>
  `;

  let customerSent = false;
  if (resendClient || mailTransporter) {
    try {
      const adminOptions = {
        fromName: 'CEFI Newsletter',
        to: targetEmail,
        replyTo: email,
        subject: emailSubject,
        text: `New Newsletter Subscription from ${email}`,
        html: htmlContent,
      };

      const customerOptions = (email && email !== targetEmail) ? {
        fromName: 'Ceylon Eco Fresh Infinity',
        replyTo: targetEmail,
        to: email,
        subject: `✅ Welcome to the CEFI Newsletter!`,
        text: `Thank you for subscribing to the Ceylon Eco Fresh Infinity newsletter!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
            <div style="background-color: #1F532E; color: #ffffff; padding: 24px; text-align: center;">
              <h2 style="margin: 0; color: #D4AF37; font-size: 22px;">Ceylon Eco Fresh Infinity (Pvt) Ltd</h2>
              <p style="margin: 6px 0 0; font-size: 13px; color: #d1fae5;">Subscription Confirmed</p>
            </div>
            <div style="padding: 24px; color: #334155;">
              <p style="font-size: 14px; color: #475569; line-height: 1.6;">Thank you for subscribing to our newsletter! You will now receive our latest updates on Ceylon export products, tea harvests, and spice catalogs directly to your inbox.</p>
            </div>
            <div style="background-color: #f8fafc; padding: 14px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
              Ceylon Eco Fresh Infinity (Pvt) Ltd · No. 278/1/A, Meegasmulla, Dedigamuwa
            </div>
          </div>
        `
      } : null;

      const result = await sendDualEmails(adminOptions, customerOptions);
      customerSent = result.customerSent;
      if (result.adminSent) return result;
    } catch (err) {
      console.warn('⚠️ [Email] Newsletter email failed:', err.message);
    }
  }

  // Admin-only fallback
  const delivered = await sendAdminViaFormSubmit({
    _subject: emailSubject,
    _replyto: email,
    email,
    subscribed_at: new Date().toLocaleString()
  });
  return { success: delivered, method: 'formsubmit', adminSent: delivered, customerSent };
}

app.post('/api/newsletter', formLimiter, validateBody(schemas.newsletterSchema), async (req, res) => {
  const { email } = req.body;

  // MEDIUM FIX: Email format validation
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ success: false, message: 'A valid email address is required.' });
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log(`📬 New Newsletter Subscriber`);
  }
  const dispatchResult = await sendNewsletterEmail(email.trim().toLowerCase());
  if (!dispatchResult.adminSent) {
    return res.status(502).json({ success: false, message: 'We could not deliver your subscription right now. Please try again.', dispatch: dispatchResult });
  }
  return res.json({
    success: true,
    message: 'Successfully subscribed to the newsletter!',
    customerEmailed: dispatchResult.customerSent,
    dispatch: dispatchResult
  });
});

// ── Quote Request Email Delivery Function ────────────────────────────────────
async function sendQuoteEmail(record) {
  const targetEmail = ADMIN_INBOX;
  const { name, company, product, quantity, targetDestination, email, phone, notes } = record;
  const emailSubject = `📋 New Wholesale Quote Request: ${company || name} (${product})`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #1F532E; color: #ffffff; padding: 24px; text-align: center;">
        <h2 style="margin: 0; color: #D4AF37; font-size: 22px;">Ceylon Eco Fresh Infinity (Pvt) Ltd</h2>
        <p style="margin: 6px 0 0; font-size: 13px; color: #d1fae5;">Wholesale & Export Quotation Request</p>
      </div>
      <div style="padding: 24px; color: #334155;">
        <h3 style="color: #1F532E; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; font-size: 15px;">Client Information</h3>
        <table style="width: 100%; font-size: 13px; line-height: 1.6; margin-bottom: 20px;">
          <tr><td style="width: 150px; font-weight: bold; color: #64748b;">Contact Person:</td><td><strong>${name}</strong></td></tr>
          <tr><td style="font-weight: bold; color: #64748b;">Company Name:</td><td><strong>${company}</strong></td></tr>
          <tr><td style="font-weight: bold; color: #64748b;">Email Address:</td><td><a href="mailto:${email}" style="color: #1F532E; font-weight: bold;">${email}</a></td></tr>
          <tr><td style="font-weight: bold; color: #64748b;">Phone / WhatsApp:</td><td><strong>${phone || 'Not provided'}</strong></td></tr>
          <tr><td style="font-weight: bold; color: #64748b;">Requested Product:</td><td><strong style="color: #1F532E;">${product}</strong></td></tr>
          <tr><td style="font-weight: bold; color: #64748b;">Estimated Quantity:</td><td><strong>${quantity}</strong></td></tr>
          <tr><td style="font-weight: bold; color: #64748b;">Destination Port/City:</td><td><strong>${targetDestination}</strong></td></tr>
          <tr><td style="font-weight: bold; color: #64748b;">Submitted At:</td><td>${new Date().toLocaleString()}</td></tr>
        </table>

        ${notes ? `
        <h3 style="color: #1F532E; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; font-size: 15px;">Additional Requirements / Notes</h3>
        <div style="background-color: #f8fafc; border-left: 4px solid #D4AF37; padding: 16px; border-radius: 8px; font-size: 14px; line-height: 1.6; color: #1e293b; white-space: pre-wrap;">
${notes}
        </div>` : ''}
      </div>
      <div style="background-color: #f8fafc; padding: 14px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        Ceylon Eco Fresh Infinity (Pvt) Ltd · Automated Export Quote System
      </div>
    </div>
  `;

  // 1. Resend (verified domain), with Gmail SMTP as a per-message fallback
  let customerSent = false;
  if (resendClient || mailTransporter) {
    try {
      const adminOptions = {
        fromName: 'CEFI Export Desk',
        to: targetEmail,
        replyTo: email,
        subject: emailSubject,
        text: `New Wholesale Quote Request from ${name} (${company}):\n\nProduct: ${product}\nQuantity: ${quantity}\nDestination: ${targetDestination}\nContact: ${email} | ${phone}\n\nNotes:\n${notes}`,
        html: htmlContent,
      };

      const customerOptions = (email && email !== targetEmail) ? {
        fromName: 'Ceylon Eco Fresh Infinity',
        replyTo: targetEmail,
        to: email,
        subject: `✅ Quote Request Received — ${product} | CEFI`,
        text: `Dear ${name},\n\nThank you for your quotation request for ${product} (${quantity}) to ${targetDestination}.\n\nOur trade team will respond within 1–2 business days with a detailed proforma invoice.\n\nFor urgent matters, contact us at +94 714 634 485.\n\nBest regards,\nCeylon Eco Fresh Infinity Export Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
            <div style="background-color: #1F532E; color: #ffffff; padding: 24px; text-align: center;">
              <h2 style="margin: 0; color: #D4AF37; font-size: 22px;">Ceylon Eco Fresh Infinity (Pvt) Ltd</h2>
              <p style="margin: 6px 0 0; font-size: 13px; color: #d1fae5;">Your quotation request has been received!</p>
            </div>
            <div style="padding: 24px; color: #334155;">
              <p style="font-size: 15px; margin: 0 0 16px;">Dear <strong>${name}</strong>,</p>
              <p style="font-size: 14px; color: #475569; line-height: 1.6;">Thank you for your interest in our products. We have received your wholesale/export quotation request and our trade team will prepare a detailed quote within <strong>1–2 business days</strong>.</p>
              <div style="background-color: #f0fdf4; border-left: 4px solid #1F532E; padding: 14px 16px; border-radius: 8px; margin: 20px 0; font-size: 13px; color: #065f46;">
                <strong>Company:</strong> ${company}<br/>
                <strong>Product Requested:</strong> ${product}<br/>
                <strong>Estimated Quantity:</strong> ${quantity}<br/>
                <strong>Destination:</strong> ${targetDestination}<br/>
                <strong>Submitted:</strong> ${new Date().toLocaleString()}
              </div>
              <p style="font-size: 13px; color: #64748b;">For urgent inquiries, please contact us at <a href="tel:+94714634485" style="color: #1F532E;">+94 714 634 485</a> (WhatsApp available).</p>
            </div>
            <div style="background-color: #f8fafc; padding: 14px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
              Ceylon Eco Fresh Infinity (Pvt) Ltd · No. 278/1/A, Meegasmulla, Dedigamuwa · ceylonecofreshinfinity@gmail.com
            </div>
          </div>
        `
      } : null;

      const result = await sendDualEmails(adminOptions, customerOptions);
      customerSent = result.customerSent;
      if (result.adminSent) return result;
    } catch (err) {
      console.warn('⚠️ [Email] Quote email failed:', err.message);
    }
  }

  // 2. Admin-only fallback so the quote request still reaches the inbox
  const delivered = await sendAdminViaFormSubmit({
    _subject: emailSubject,
    _replyto: email,
    contact_person: name,
    company: company || 'Not specified',
    email,
    phone: phone || 'Not provided',
    requested_product: product,
    quantity,
    destination: targetDestination,
    notes: notes || '',
    submitted_at: new Date().toLocaleString()
  });
  return { success: delivered, method: 'formsubmit', adminSent: delivered, customerSent };
}

// ── Quote Route (POST /api/quotes) ───────────────────────────────────────────
app.post('/api/quotes', formLimiter, validateBody(schemas.quoteSchema), async (req, res) => {
  const { name, company, email, phone, product, quantity, targetDestination, destinationPort, notes, message } = req.body;

  // MEDIUM FIX: Strict validation on all quote fields
  if (!name || !isValidString(name, 200)) {
    return res.status(400).json({ success: false, message: 'A valid name is required.' });
  }
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ success: false, message: 'A valid email address is required.' });
  }
  if (!product || !isValidString(product, 300)) {
    return res.status(400).json({ success: false, message: 'A valid product name is required.' });
  }

  const record = {
    name:              sanitizeText(name, 200),
    company:           sanitizeText(company || 'Direct Buyer', 200),
    email:             email.trim().toLowerCase(),
    phone:             sanitizeText(phone || '', 30),
    product:           sanitizeText(product, 300),
    quantity:          sanitizeText(quantity || 'Sample Request', 100),
    targetDestination: sanitizeText(targetDestination || destinationPort || 'Worldwide', 200),
    notes:             sanitizeText(notes || message || '', 3000),
    createdAt:         new Date().toISOString()
  };

  if (process.env.NODE_ENV !== 'production') {
    console.log(`📋 New Quote Request for product from client`);
  }
  const dispatchResult = await sendQuoteEmail(record);
  if (!dispatchResult.adminSent) {
    return res.status(502).json({ success: false, message: 'We could not deliver your quote request right now. Please try again.', dispatch: dispatchResult });
  }
  return res.json({
    success: true,
    message: 'Your quote request has been submitted to Ceylon Eco Fresh Infinity!',
    customerEmailed: dispatchResult.customerSent,
    dispatch: dispatchResult
  });
});

// Dead code removed — duplicate /api/newsletter route deleted (security cleanup)

// Admin-only: every customer's order (name, address, phone) is in this list
app.get('/api/orders', requireAdmin, userApiLimiter, async (req, res) => {
  try {
    return res.json(await listOrders());
  } catch (err) {
    console.error('❌ [Orders] list failed:', err.message);
    return res.status(500).json({ success: false, message: 'Could not load orders. Please try again.' });
  }
});

// ── Shipping rule ─────────────────────────────────────────────────────────────
// Mirrors the frontend rule (free over $100). Recomputed server-side: the
// client's figures are display values and must never be trusted for billing.
function calculateShipping(subtotal) {
  return subtotal > 100 || subtotal === 0 ? 0 : 15.0;
}

const MAX_ITEM_QUANTITY = 10000;

/**
 * Rebuilds the cart from the catalogue: name and unit price come from the
 * product record, never from the request, so an edited cart (price: 0.01)
 * cannot change what the order and both emails say is owed.
 * Returns { items } or { error } when a line is unknown or malformed.
 */
async function priceOrderItems(rawItems) {
  let catalogue = mockData.products;
  if (supabase) {
    const { data, error } = await supabase.from('products').select('id, slug, name, price');
    if (!error && data && data.length > 0) catalogue = data;
  }

  const items = [];
  for (const raw of rawItems) {
    if (!raw || typeof raw !== 'object') return { error: 'Invalid item in cart.' };
    const product = catalogue.find((p) =>
      (raw.id != null && String(p.id) === String(raw.id)) ||
      (raw.slug && p.slug === raw.slug));
    if (!product) return { error: `"${sanitizeText(String(raw.name || 'An item'), 100)}" is no longer available. Please remove it from your basket.` };

    const quantity = Number(raw.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_ITEM_QUANTITY) {
      return { error: 'Each item quantity must be a whole number between 1 and 10000.' };
    }

    items.push({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: Number(product.price) || 0,
      quantity,
    });
  }
  return { items };
}

// requireAuth verifies the Supabase access token and attaches req.user.
app.post('/api/orders', requireAuth, orderLimiter, validateBody(schemas.orderSchema), async (req, res) => {
  // Shape, sizes and allowed fields already enforced by schemas.orderSchema.
  const { customer, items: rawItems, paymentMethod } = req.body;

  // The confirmation recipient is the buyer's REGISTERED account email, read
  // from the verified session token — never from the request body. A client
  // that edits the form or crafts its own request still cannot redirect the
  // confirmation (or order history) to a different address.
  const customerEmail = String(req.user.email || '').trim().toLowerCase();
  if (!isValidEmail(customerEmail)) {
    return res.status(400).json({ success: false, message: 'Your account has no valid email address. Please update your profile and try again.' });
  }
  // Only confirmed addresses count as "registered" — an unverified signup
  // could belong to someone else.
  if (!req.user.email_confirmed_at) {
    return res.status(403).json({ success: false, code: 'EMAIL_UNCONFIRMED', message: 'Please confirm your email address before placing an order.' });
  }
  if (customer.email && String(customer.email).trim().toLowerCase() !== customerEmail) {
    console.warn(`⚠️  [Orders] Body email '${customer.email}' ignored for user ${req.user.id}; using account email.`);
  }

  // LOW FIX: Crypto-secure order ID (not Math.random)
  const crypto = require('crypto');
  const orderId = `CEFI-ORD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  // MEDIUM FIX: Always use server-side admin email — never trust client-supplied destination.
  // This is the FIXED recipient of the "Order Confirmed" internal alert.
  const destinationEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER || 'ceylonecofreshinfinity@gmail.com';

  let priced;
  try {
    priced = await priceOrderItems(rawItems);
  } catch (err) {
    console.error(`❌ [Orders] Could not price order for user ${req.user.id}:`, err.message);
    return res.status(503).json({ success: false, message: 'We could not verify product prices right now. Please try again.' });
  }
  if (priced.error) {
    return res.status(400).json({ success: false, message: priced.error });
  }
  const items = priced.items;

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingCost = calculateShipping(subtotal);

  // Customer fields are listed explicitly (no spread) and sanitised: only
  // these reach storage and the emails.
  const orderRecord = {
    orderId,
    userId: req.user.id,
    customer: {
      name: sanitizeText(customer.name, 200),
      email: customerEmail,
      phone: sanitizeText(customer.phone || '', 30),
      address: sanitizeText(customer.address || '', 500),
      city: sanitizeText(customer.city || '', 120),
      postalCode: sanitizeText(customer.postalCode || '', 20),
      country: sanitizeText(customer.country || '', 120),
    },
    items,
    subtotal,
    shippingCost,
    totalAmount: subtotal + shippingCost,
    paymentMethod: sanitizeText(paymentMethod || 'Direct Export Order Request', 100),
    targetEmail: destinationEmail,
    status: 'Confirmed',
    createdAt: new Date().toISOString()
  };

  // Persist first: a failed save is a failed order; a failed email is not.
  try {
    await saveOrder(orderRecord);
  } catch (err) {
    console.error(`❌ [Orders] Could not save ${orderId} for user ${req.user.id}:`, err.message);
    return res.status(503).json({ success: false, message: 'We could not place your order right now. Nothing has been charged — please try again.' });
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log(`🛒 New Order [${orderId}] with ${items.length} items → confirmation to ${customerEmail}`);
  }

  // ── Dual notification ───────────────────────────────────────────────────────
  // customer  → "Order Received"  → dynamic, the address typed at checkout
  // admin     → "Order Confirmed" → fixed, ADMIN_EMAIL
  // Awaited so the response can tell the UI what actually happened. The service
  // never rejects, and the try/catch guarantees a saved order is still confirmed
  // to the buyer even if the mail layer fails outright.
  let emailStatus = { success: false, reason: 'not attempted' };
  try {
    emailStatus = await sendOrderEmails({
      customerEmail,
      customerName: orderRecord.customer.name,
      orderId,
      subtotal,
      shippingCost,
      totalAmount: orderRecord.totalAmount,
      items,
      paymentMethod: orderRecord.paymentMethod,
      placedAt: orderRecord.createdAt,
      shipping: {
        address: orderRecord.customer.address,
        city: orderRecord.customer.city,
        postalCode: orderRecord.customer.postalCode,
        country: orderRecord.customer.country,
        phone: orderRecord.customer.phone
      }
    });
  } catch (emailErr) {
    console.error(`⚠️  [Orders] Email dispatch failed for ${orderId}:`, emailErr.message);
    emailStatus = { success: false, reason: emailErr.message };
  }

  return res.json({
    success: true,
    orderId,
    totalAmount: orderRecord.totalAmount,
    message: 'Order placed successfully.',
    notifications: {
      emailed: emailStatus.success,
      // Echoed back so the confirmation screen can name the real recipients
      // instead of assuming the send worked.
      customerEmail: emailStatus.customer?.sent ? emailStatus.customer.to : null,
      adminEmail: emailStatus.admin?.sent ? emailStatus.admin.to : null,
      // Provider error text stays in the server log (above); the buyer gets a
      // fixed message, never internal detail.
      detail: emailStatus.success ? undefined : 'Your order is saved, but the confirmation email could not be sent. Our team has your order.'
    }
  });
});

// ── CORS rejection handler ────────────────────────────────────────────────────
// Without this, a rejected origin surfaces as a generic HTML 500, which the
// checkout treats as "API down" and silently falls back to admin-only email.
app.use((err, req, res, next) => {
  if (err && err.isCorsRejection) {
    console.warn(`⛔ ${err.message} (allowed: ${allowedOrigins.join(', ') || 'same-origin only — set FRONTEND_URL'})`);
    return res.status(403).json({ success: false, message: 'Requests from this origin are not allowed.' });
  }
  return next(err);
});

// Unknown API routes get a JSON 404; everything else that throws gets a
// generic message plus a correlation ID — never a stack trace or file path.
app.use('/api', notFoundHandler);
app.use(globalExceptionHandler);

// ── Start Server ──────────────────────────────────────────────────────────────
// Start Server locally
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`CEFI Backend REST API running on http://localhost:${PORT}`);
  });

  // Graceful shutdown: stop accepting connections, let in-flight requests
  // (e.g. an order mid-save) finish, then exit. Forced after 10 s.
  const shutdown = (signal) => {
    console.log(`\n${signal} received — shutting down gracefully…`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

module.exports = app;

