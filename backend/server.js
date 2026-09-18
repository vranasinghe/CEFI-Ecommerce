const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const { requireAuth } = require('./middleware/auth');
const { sanitizeText, sanitizeHtml, sanitizeHeader, isValidEmail, isValidString } = require('./lib/sanitize');
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const { sendOrderEmails } = require('./lib/order-email-service');

// ── CRITICAL SECURITY: No hardcoded credentials. Fail loudly if env vars missing.
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'CEFI Notifications <onboarding@resend.dev>';

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

// Helper to send individual message via Resend
async function sendViaResend(options) {
  if (!resendClient) return { error: { message: 'Resend not initialized' } };
  return await resendClient.emails.send({
    from: RESEND_FROM_EMAIL,
    to: options.to,
    reply_to: options.replyTo || options.reply_to || undefined,
    subject: options.subject,
    html: options.html,
    text: options.text || undefined
  });
}

// Helper to send admin and customer emails concurrently (Smart Hybrid Dual Send)
async function sendDualEmails(adminOptions, customerOptions) {
  let adminSent = false;
  let customerSent = false;

  // ── 1. Dispatch Admin Notification via Resend (Fast & Serverless Ready) ─────
  if (resendClient) {
    try {
      const adminRes = await sendViaResend(adminOptions);
      if (adminRes && !adminRes.error) {
        adminSent = true;
        console.log(`✅ [Resend] Admin notification sent to ${adminOptions.to} (ID: ${adminRes.data?.id || 'ok'})`);
      } else {
        console.warn(`⚠️ [Resend] Admin send notice:`, adminRes?.error?.message || 'Unknown error');
      }
    } catch (err) {
      console.warn(`⚠️ [Resend] Admin send exception:`, err.message);
    }
  }

  // If Admin not sent via Resend, fallback to SMTP
  if (!adminSent && mailTransporter) {
    try {
      const info = await mailTransporter.sendMail(adminOptions);
      adminSent = true;
      console.log(`✅ [Nodemailer] Admin notification sent via SMTP to ${adminOptions.to} (${info.messageId})`);
    } catch (smtpErr) {
      console.error(`❌ [Nodemailer] Admin SMTP error:`, smtpErr.message);
    }
  }

  // ── 2. Dispatch Customer Confirmation ────────────────────────────────────────
  if (customerOptions && customerOptions.to && customerOptions.to !== adminOptions.to) {
    // A. First try Resend (succeeds if custom domain verified or account email)
    if (resendClient) {
      try {
        const custRes = await sendViaResend(customerOptions);
        if (custRes && !custRes.error) {
          customerSent = true;
          console.log(`✅ [Resend] Customer confirmation sent to ${customerOptions.to} (ID: ${custRes.data?.id || 'ok'})`);
        } else {
          console.log(`ℹ️ [Resend] Customer domain not yet verified in Resend. Falling back to Gmail SMTP for customer...`);
        }
      } catch (err) {
        console.log(`ℹ️ [Resend] Customer send notice: ${err.message}. Routing to Gmail SMTP...`);
      }
    }

    // B. If Resend cannot send to external customer (onboarding@resend.dev restriction), send via Gmail SMTP!
    if (!customerSent && mailTransporter) {
      try {
        const custInfo = await mailTransporter.sendMail(customerOptions);
        customerSent = true;
        console.log(`✅ [Nodemailer] Customer confirmation sent via Gmail SMTP to ${customerOptions.to} (${custInfo.messageId})`);
      } catch (smtpErr) {
        console.warn(`⚠️ [Nodemailer] Customer SMTP error:`, smtpErr.message);
      }
    }
  }

  return {
    success: adminSent || customerSent,
    adminSent,
    customerSent: customerOptions ? customerSent : true
  };
}

// Try to load multer (for file uploads)
let multer;
try {
  multer = require('multer');
} catch (e) {
  multer = null;
}

const supabase = require('./supabaseClient');
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

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

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
    allowedOrigins.length === 0 ||        // not configured yet: open
    allowedOrigins.includes(origin) ||    // explicitly whitelisted
    isSameOrigin(req, rawOrigin);         // same deployment

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
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(uploadsDir));

// ── Debug / Health Check (safe — no secrets exposed) ────────────────────────
app.get('/api/debug', (req, res) => {
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
  upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
}

// ── In-memory fallback stores ────────────────────────────────────────────────
const MAX_LOCAL_STORE = 500;
function pushBounded(arr, item) {
  arr.unshift(item);
  if (arr.length > MAX_LOCAL_STORE) arr.pop();
}

const localContactMessages = [];
const localSubscribers = [];
const localQuotes = [];
const localOrders = [];

// ── Email Diagnostic Test Endpoint ───────────────────────────────────────────
// CRITICAL FIX: requireAuth added — prevents spam relay abuse
app.get('/api/test-email', requireAuth, async (req, res) => {
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
      const { data, error } = await supabase.from('categories').select('*');
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
      const { data, error } = await supabase.from('categories').select('*').eq('slug', slug).single();
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

app.post('/api/catalog-profile', requireAuth, (req, res) => {
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

app.put('/api/catalog-profile', requireAuth, (req, res) => {
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
      const { data, error } = await supabase.from('products').select('*');
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
      const { data, error } = await supabase.from('products').select('*').eq('slug', slug).single();
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
app.post('/api/products', requireAuth, async (req, res) => {
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
      const { data, error } = await supabase.from('products').insert([payload]).select();
      if (error) {
        console.error('Supabase insert error:', error.message);
        return res.status(500).json({ success: false, message: error.message });
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

app.put('/api/products/:id', requireAuth, async (req, res) => {
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
      
      const { data, error } = await query.select();
      if (error) {
        console.error('Supabase update error:', error.message);
        return res.status(500).json({ success: false, message: error.message });
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
app.delete('/api/products/:id', requireAuth, async (req, res) => {
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
        return res.status(500).json({ success: false, message: error.message });
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

// MEDIUM FIX: requireAuth prevents storage quota exhaustion by anonymous users
app.post('/api/upload', requireAuth, (req, res) => {
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

const blogsFilePath = path.join(__dirname, 'blogs.json');

function getStoredBlogs() {
  try {
    if (fs.existsSync(blogsFilePath)) {
      return JSON.parse(fs.readFileSync(blogsFilePath, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading blogs.json:', e);
  }
  return mockData.blogPosts || [];
}

function saveStoredBlogs(blogs) {
  try {
    fs.writeFileSync(blogsFilePath, JSON.stringify(blogs, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing blogs.json:', e);
  }
}

// ── Blog: GET all ─────────────────────────────────────────────────────────────
app.get('/api/blog', async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase.from('blog_posts').select('*').order('published_at', { ascending: false });
      if (!error && data && data.length > 0) return res.json(data);
    }
    return res.json(getStoredBlogs());
  } catch {
    return res.json(getStoredBlogs());
  }
});

// ── Blog: GET one by slug or id ───────────────────────────────────────────────
app.get('/api/blog/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    if (supabase) {
      const { data, error } = await supabase.from('blog_posts').select('*').eq('slug', slug).single();
      if (!error && data) return res.json(data);
    }
    const blogs = getStoredBlogs();
    const post = blogs.find(b => b.slug === slug || b.id === slug);
    if (post) return res.json(post);
    return res.status(404).json({ message: 'Post not found' });
  } catch {
    const blogs = getStoredBlogs();
    const post = blogs.find(b => b.slug === slug || b.id === slug);
    if (post) return res.json(post);
    return res.status(404).json({ message: 'Post not found' });
  }
});

// ── Blog: POST (Create New Article) ──────────────────────────────────────────
// CRITICAL FIX: All blog write endpoints now require authentication
app.post('/api/blog', requireAuth, async (req, res) => {
  const { title, slug, cover_image, excerpt, content, author, category, read_time_min } = req.body;
  if (!title || !content) {
    return res.status(400).json({ success: false, message: 'Title and content are required.' });
  }

  const generatedSlug = (slug || title)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  // HIGH FIX: Sanitize all user-supplied strings to prevent Stored XSS
  const newPost = {
    id: `blog-${Date.now()}`,
    title:          sanitizeText(title, 300),
    slug:           generatedSlug,
    category:       sanitizeText(category || 'Trade & Insights', 100),
    cover_image:    sanitizeText(cover_image || 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=800&q=80', 500),
    excerpt:        sanitizeText(excerpt || content.substring(0, 160), 500),
    content:        sanitizeHtml(content),
    author:         sanitizeText(author || 'CEFI Editorial Team', 100),
    read_time_min:  parseInt(read_time_min, 10) || 5,
    published_at:   new Date().toISOString()
  };

  try {
    if (supabase) {
      await supabase.from('blog_posts').insert([newPost]);
    }
  } catch (e) {
    console.warn('Supabase blog insert fallback:', e.message);
  }

  const currentBlogs = getStoredBlogs();
  currentBlogs.unshift(newPost);
  saveStoredBlogs(currentBlogs);

  console.log(`📝 New Blog Post Created: "${newPost.title}"`);
  return res.json({ success: true, message: 'Blog article published successfully!', post: newPost });
});

// ── Blog: PUT (Update Article) ────────────────────────────────────────────────
app.put('/api/blog/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { title, slug, cover_image, excerpt, content, author, category, read_time_min } = req.body;

  const currentBlogs = getStoredBlogs();
  const index = currentBlogs.findIndex(b => b.id === id || b.slug === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Article not found.' });
  }

  // XSS FIX: Sanitize all fields before storage
  const updatedPost = {
    ...currentBlogs[index],
    title:        title        !== undefined ? sanitizeText(title, 300)        : currentBlogs[index].title,
    slug:         slug         !== undefined ? slug                            : currentBlogs[index].slug,
    category:     category     !== undefined ? sanitizeText(category, 100)    : currentBlogs[index].category,
    cover_image:  cover_image  !== undefined ? sanitizeText(cover_image, 500) : currentBlogs[index].cover_image,
    excerpt:      excerpt      !== undefined ? sanitizeText(excerpt, 500)      : currentBlogs[index].excerpt,
    content:      content      !== undefined ? sanitizeHtml(content)           : currentBlogs[index].content,
    author:       author       !== undefined ? sanitizeText(author, 100)       : currentBlogs[index].author,
    read_time_min: read_time_min !== undefined ? (parseInt(read_time_min, 10) || 5) : currentBlogs[index].read_time_min,
    updated_at:   new Date().toISOString()
  };

  try {
    if (supabase) {
      await supabase.from('blog_posts').update(updatedPost).eq('id', id);
    }
  } catch (e) {
    console.warn('Supabase blog update fallback:', e.message);
  }

  currentBlogs[index] = updatedPost;
  saveStoredBlogs(currentBlogs);

  console.log(`📝 Blog Post Updated: "${updatedPost.title}"`);
  return res.json({ success: true, message: 'Blog article updated successfully!', post: updatedPost });
});

// ── Blog: DELETE Article ──────────────────────────────────────────────────────
app.delete('/api/blog/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const currentBlogs = getStoredBlogs();
  const filtered = currentBlogs.filter(b => b.id !== id && b.slug !== id);

  try {
    if (supabase) {
      await supabase.from('blog_posts').delete().eq('id', id);
    }
  } catch (e) {
    console.warn('Supabase blog delete fallback:', e.message);
  }

  saveStoredBlogs(filtered);
  console.log(`🗑️ Blog Post Deleted: ${id}`);
  return res.json({ success: true, message: 'Blog article deleted successfully!' });
});

// ── Contact / Quotes / Orders ─────────────────────────────────────────────────
async function sendContactEmail(record) {
  const targetEmail = process.env.EMAIL_USER || 'ceylonecofreshinfinity@gmail.com';
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

  // 1. Send via Persistent SMTP
  if (mailTransporter) {
    try {
      const adminOptions = {
        from: `"CEFI Contact Form" <${EMAIL_USER.replace('@', '+website@')}>`,
        to: targetEmail,
        replyTo: email,
        subject: emailSubject,
        text: `New Contact Form Message from ${name} (${email}, ${phone || 'No phone'})\n\nSubject: ${subject}\n\nMessage:\n${message}`,
        html: htmlContent,
      };

      const customerOptions = (email && email !== targetEmail) ? {
        from: `"Ceylon Eco Fresh Infinity" <${EMAIL_USER}>`,
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
      if (result.success) return { success: true, method: 'smtp' };
    } catch (err) {
      console.warn('⚠️ [Nodemailer] Contact email failed:', err.message);
    }
  }

  // 2. Direct HTTP email delivery fallback to target inbox
  try {
    const payload = {
      _subject: emailSubject,
      _replyto: email,
      name,
      email,
      phone: phone || 'Not provided',
      subject: subject || 'General Inquiry',
      message,
      submitted_at: new Date().toLocaleString()
    };

    const res = await fetch(`https://formsubmit.co/ajax/${targetEmail}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const resData = await res.json();
    console.log(`✅ [Email Dispatcher] Contact inquiry delivered to ${targetEmail}:`, resData);
    return { success: true, method: 'formsubmit' };
  } catch (apiErr) {
    console.error(`❌ [Email Dispatcher] Error delivering contact email:`, apiErr.message);
    return { success: true, method: 'recorded' };
  }
}

// ── Contact Route (POST /api/contact) ─────────────────────────────────────────
app.post('/api/contact', async (req, res) => {
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
  return res.json({
    success: true,
    message: 'Your message has been sent to Ceylon Eco Fresh Infinity!',
    dispatch: dispatchResult
  });
});

// ── Newsletter Route (POST /api/newsletter) ──────────────────────────────────
async function sendNewsletterEmail(email) {
  const targetEmail = process.env.EMAIL_USER || 'ceylonecofreshinfinity@gmail.com';
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

  if (mailTransporter) {
    try {
      const adminOptions = {
        from: `"CEFI Newsletter" <${EMAIL_USER.replace('@', '+website@')}>`,
        to: targetEmail,
        replyTo: email,
        subject: emailSubject,
        text: `New Newsletter Subscription from ${email}`,
        html: htmlContent,
      };

      const customerOptions = (email && email !== targetEmail) ? {
        from: `"Ceylon Eco Fresh Infinity" <${EMAIL_USER}>`,
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
      if (result.success) return { success: true, method: 'smtp' };
    } catch (err) {
      console.warn('⚠️ [Nodemailer] Newsletter email failed:', err.message);
    }
  }

  // Fallback
  try {
    const payload = {
      _subject: emailSubject,
      _replyto: email,
      email,
      subscribed_at: new Date().toLocaleString()
    };
    await fetch(`https://formsubmit.co/ajax/${targetEmail}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    });
    return { success: true, method: 'formsubmit' };
  } catch (apiErr) {
    return { success: true, method: 'recorded' };
  }
}

app.post('/api/newsletter', async (req, res) => {
  const { email } = req.body;

  // MEDIUM FIX: Email format validation
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ success: false, message: 'A valid email address is required.' });
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log(`📬 New Newsletter Subscriber`);
  }
  const dispatchResult = await sendNewsletterEmail(email.trim().toLowerCase());
  return res.json({
    success: true,
    message: 'Successfully subscribed to the newsletter!',
    dispatch: dispatchResult
  });
});

// ── Quote Request Email Delivery Function ────────────────────────────────────
async function sendQuoteEmail(record) {
  const targetEmail = process.env.EMAIL_USER || 'ceylonecofreshinfinity@gmail.com';
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

  // 1. Send via Persistent SMTP
  if (mailTransporter) {
    try {
      const adminOptions = {
        from: `"CEFI Export Desk" <${EMAIL_USER.replace('@', '+website@')}>`,
        to: targetEmail,
        replyTo: email,
        subject: emailSubject,
        text: `New Wholesale Quote Request from ${name} (${company}):\n\nProduct: ${product}\nQuantity: ${quantity}\nDestination: ${targetDestination}\nContact: ${email} | ${phone}\n\nNotes:\n${notes}`,
        html: htmlContent,
      };

      const customerOptions = (email && email !== targetEmail) ? {
        from: `"Ceylon Eco Fresh Infinity" <${EMAIL_USER}>`,
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
      if (result.success) return { success: true, method: 'smtp' };
    } catch (err) {
      console.warn('⚠️ [Nodemailer] Quote email failed:', err.message);
    }
  }

  // 2. HTTP delivery fallback
  try {
    const payload = {
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
    };

    const res = await fetch(`https://formsubmit.co/ajax/${targetEmail}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const resData = await res.json();
    console.log(`✅ [Email Dispatcher] Quote request delivered to ${targetEmail}:`, resData);
    return { success: true, method: 'formsubmit' };
  } catch (apiErr) {
    console.error(`❌ [Email Dispatcher] Error delivering quote email:`, apiErr.message);
    return { success: true, method: 'recorded' };
  }
}

// ── Quote Route (POST /api/quotes) ───────────────────────────────────────────
app.post('/api/quotes', async (req, res) => {
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
  return res.json({
    success: true,
    message: 'Your quote request has been submitted to Ceylon Eco Fresh Infinity!',
    dispatch: dispatchResult
  });
});

// Dead code removed — duplicate /api/newsletter route deleted (security cleanup)

// MEDIUM FIX: requireAuth prevents public PII exposure of all customer orders
app.get('/api/orders', requireAuth, (req, res) => {
  return res.json(localOrders);
});

// ── Shipping rule ─────────────────────────────────────────────────────────────
// Mirrors the frontend rule (free over $100). Recomputed server-side: the
// client's figures are display values and must never be trusted for billing.
function calculateShipping(subtotal) {
  return subtotal > 100 || subtotal === 0 ? 0 : 15.0;
}

// requireAuth verifies the Supabase access token and attaches req.user.
app.post('/api/orders', requireAuth, async (req, res) => {
  // MEDIUM FIX: Remove attacker-controlled targetEmail from req.body
  const { customer, items, paymentMethod } = req.body;
  if (!customer || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Invalid order data: customer details and items are required.' });
  }

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

  const subtotal = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
  const shippingCost = calculateShipping(subtotal);

  // MEDIUM FIX: Bounded array — cap in-memory store to prevent DoS
  const orderRecord = {
    orderId,
    userId: req.user.id,
    customer: { ...customer, email: customerEmail },
    items,
    subtotal,
    shippingCost,
    totalAmount: subtotal + shippingCost,
    paymentMethod: paymentMethod || 'Direct Export Order Request',
    targetEmail: destinationEmail,
    status: 'Confirmed',
    createdAt: new Date().toISOString()
  };
  pushBounded(localOrders, orderRecord);

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
      customerName: customer.name,
      orderId,
      subtotal,
      shippingCost,
      totalAmount: orderRecord.totalAmount,
      items,
      paymentMethod: orderRecord.paymentMethod,
      placedAt: orderRecord.createdAt,
      shipping: {
        address: customer.address,
        city: customer.city,
        postalCode: customer.postalCode,
        country: customer.country,
        phone: customer.phone
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
      detail: emailStatus.success ? undefined : (emailStatus.reason || emailStatus.customer?.error || 'One or more emails failed to send.')
    }
  });
});

// ── CORS rejection handler ────────────────────────────────────────────────────
// Without this, a rejected origin surfaces as a generic HTML 500, which the
// checkout treats as "API down" and silently falls back to admin-only email.
app.use((err, req, res, next) => {
  if (err && err.isCorsRejection) {
    console.warn(`⛔ ${err.message} (allowed: ${allowedOrigins.join(', ') || 'any'})`);
    return res.status(403).json({ success: false, message: 'Requests from this origin are not allowed.' });
  }
  return next(err);
});

// ── Start Server ──────────────────────────────────────────────────────────────
// Start Server locally
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`CEFI Backend REST API running on http://localhost:${PORT}`);
  });
}

module.exports = app;

