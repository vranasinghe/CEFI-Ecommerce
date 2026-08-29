const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const { Resend } = require('resend');
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const EMAIL_USER = process.env.EMAIL_USER || 'ceylonecofreshinfinity@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS || 'hlgjksvsobiresqc';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'CEFI Notifications <onboarding@resend.dev>';

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

// Helper to send admin and customer emails concurrently (Dual Send)
async function sendDualEmails(adminOptions, customerOptions) {
  let adminSent = false;
  let customerSent = false;

  // 1. Primary Attempt: Resend HTTPS API (Fastest & 100% serverless compatible)
  if (resendClient) {
    try {
      const promises = [sendViaResend(adminOptions)];
      if (customerOptions && customerOptions.to && customerOptions.to !== adminOptions.to) {
        promises.push(sendViaResend(customerOptions));
      }

      const resendResults = await Promise.allSettled(promises);
      const adminRes = resendResults[0];
      const customerRes = resendResults[1];

      if (adminRes.status === 'fulfilled' && !adminRes.value?.error) {
        adminSent = true;
        console.log(`✅ [Resend] Admin email dispatched to ${adminOptions.to} (ID: ${adminRes.value?.data?.id || 'ok'})`);
      } else {
        console.warn(`⚠️ [Resend] Admin email notice:`, adminRes.value?.error?.message || adminRes.reason?.message || adminRes.reason);
      }

      if (customerRes) {
        if (customerRes.status === 'fulfilled' && !customerRes.value?.error) {
          customerSent = true;
          console.log(`✅ [Resend] Customer confirmation dispatched to ${customerOptions.to} (ID: ${customerRes.value?.data?.id || 'ok'})`);
        } else {
          console.warn(`⚠️ [Resend] Customer email notice:`, customerRes.value?.error?.message || customerRes.reason?.message || customerRes.reason);
        }
      }

      if (adminSent) {
        return {
          success: true,
          method: 'resend',
          adminSent,
          customerSent: customerOptions ? customerSent : true
        };
      }
    } catch (resendError) {
      console.warn('⚠️ [Resend] Error during dual dispatch:', resendError.message);
    }
  }

  // 2. Fallback Attempt: Nodemailer SMTP
  if (mailTransporter) {
    try {
      const promises = [mailTransporter.sendMail(adminOptions)];
      if (customerOptions && customerOptions.to && customerOptions.to !== adminOptions.to) {
        promises.push(mailTransporter.sendMail(customerOptions));
      }

      const results = await Promise.allSettled(promises);
      const adminResult = results[0];
      const customerResult = results[1];

      if (adminResult.status === 'fulfilled') {
        adminSent = true;
        console.log(`✅ [Nodemailer] Admin notification sent to ${adminOptions.to} (${adminResult.value.messageId})`);
      } else {
        console.error(`❌ [Nodemailer] Failed to send admin email:`, adminResult.reason?.message || adminResult.reason);
      }

      if (customerResult) {
        if (customerResult.status === 'fulfilled') {
          customerSent = true;
          console.log(`✅ [Nodemailer] Customer confirmation sent to ${customerOptions.to} (${customerResult.value.messageId})`);
        } else {
          console.warn(`⚠️ [Nodemailer] Customer confirmation failed:`, customerResult.reason?.message || customerResult.reason);
        }
      }

      return {
        success: adminResult.status === 'fulfilled',
        method: 'smtp',
        adminSent,
        customerSent: customerResult ? customerResult.status === 'fulfilled' : true
      };
    } catch (smtpErr) {
      console.warn('⚠️ [Nodemailer] SMTP exception:', smtpErr.message);
    }
  }

  return { success: false, error: 'No email service succeeded' };
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
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// ── Multer storage config ────────────────────────────────────────────────────
let upload = null;
if (multer) {
  const storage = multer.memoryStorage();
  upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
}

// ── In-memory fallback stores ────────────────────────────────────────────────
const localContactMessages = [];
const localSubscribers = [];
const localQuotes = [];
const localOrders = [];

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

app.post('/api/catalog-profile', (req, res) => {
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

app.put('/api/catalog-profile', (req, res) => {
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
    if (supabase) {
      const { data, error } = await supabase.from('products').select('*');
      if (!error && data && data.length > 0) {
        list = data;
      }
    }
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
app.post('/api/products', async (req, res) => {
  const { name, slug, price, short_description, full_description, images, category_slug, is_wholesale_only, is_featured, variants } = req.body;
  if (!name || !slug || !category_slug) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }
  const category = mockData.categories.find(c => c.slug === category_slug);
  const payload = {
    name, slug,
    price: parseFloat(price) || 0,
    short_description: short_description || '',
    full_description: full_description || '',
    images: images && images.length > 0 ? images : [],
    category_slug,
    category_name: category ? category.name : category_slug,
    is_wholesale_only: Boolean(is_wholesale_only),
    is_featured: Boolean(is_featured),
    variants: variants || null
  };
  try {
    if (supabase) {
      const { data, error } = await supabase.from('products').insert([payload]).select();
      if (error) {
        console.error('Supabase insert error:', error.message);
        return res.status(500).json({ success: false, message: error.message });
      }
      console.log('📦 Product Added to Supabase:', payload.name);
      return res.json({ success: true, message: 'Product added!', product: data[0] });
    }
  } catch (err) { console.error(err); }

  // Fallback for mock data if no Supabase
  payload.id = `prod-${Date.now()}`;
  mockData.products.push(payload);
  console.log('📦 Product Added:', payload.name);
  return res.json({ success: true, message: 'Product added!', product: payload });
});

app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const updates = { ...req.body };
  delete updates.id; // don't update ID

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
app.delete('/api/products/:id', async (req, res) => {
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

// ── Image Upload ──────────────────────────────────────────────────────────────
app.post('/api/upload', (req, res) => {
  if (!upload) {
    return res.status(500).json({ success: false, message: 'Image upload not available. Run: npm install multer in the backend folder.' });
  }
  upload.array('images', 10)(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: 'No files uploaded.' });
    
    try {
      if (supabase) {
        const urls = [];
        for (const file of req.files) {
          const fileExt = path.extname(file.originalname);
          const fileName = `${Date.now()}-${Math.round(Math.random() * 1e5)}${fileExt}`;
          
          const { data, error } = await supabase.storage
            .from('product-images')
            .upload(fileName, file.buffer, {
              contentType: file.mimetype,
              cacheControl: '3600',
              upsert: false
            });
            
          if (error) throw error;
          
          const { data: publicData } = supabase.storage
            .from('product-images')
            .getPublicUrl(fileName);
            
          urls.push(publicData.publicUrl);
        }
        return res.json({ success: true, urls });
      }
      
      // Fallback if no supabase
      const urls = req.files.map(f => `http://localhost:${PORT}/uploads/${f.originalname}`);
      return res.json({ success: true, urls });
    } catch (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return res.status(500).json({ success: false, message: 'Failed to upload to Supabase' });
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
app.post('/api/blog', async (req, res) => {
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

  const newPost = {
    id: `blog-${Date.now()}`,
    title,
    slug: generatedSlug,
    category: category || 'Trade & Insights',
    cover_image: cover_image || 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=800&q=80',
    excerpt: excerpt || (content.length > 160 ? content.substring(0, 160) + '...' : content),
    content,
    author: author || 'CEFI Editorial Team',
    read_time_min: parseInt(read_time_min, 10) || 5,
    published_at: new Date().toISOString()
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
app.put('/api/blog/:id', async (req, res) => {
  const { id } = req.params;
  const { title, slug, cover_image, excerpt, content, author, category, read_time_min } = req.body;

  const currentBlogs = getStoredBlogs();
  const index = currentBlogs.findIndex(b => b.id === id || b.slug === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Article not found.' });
  }

  const updatedPost = {
    ...currentBlogs[index],
    title: title !== undefined ? title : currentBlogs[index].title,
    slug: slug !== undefined ? slug : currentBlogs[index].slug,
    category: category !== undefined ? category : currentBlogs[index].category,
    cover_image: cover_image !== undefined ? cover_image : currentBlogs[index].cover_image,
    excerpt: excerpt !== undefined ? excerpt : currentBlogs[index].excerpt,
    content: content !== undefined ? content : currentBlogs[index].content,
    author: author !== undefined ? author : currentBlogs[index].author,
    read_time_min: read_time_min !== undefined ? (parseInt(read_time_min, 10) || 5) : currentBlogs[index].read_time_min,
    updated_at: new Date().toISOString()
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
app.delete('/api/blog/:id', async (req, res) => {
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
  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'Name, email, and message are required.' });
  }

  const record = {
    name,
    email,
    phone: phone || '',
    subject: subject || 'General Inquiry',
    message,
    createdAt: new Date().toISOString()
  };

  console.log(`📬 New Contact Message Received from ${name} (${email})`);
  const dispatchResult = await sendContactEmail(record);
  return res.json({
    success: true,
    message: 'Your message has been sent to Ceylon Eco Fresh Infinity!',
    targetEmail: process.env.EMAIL_USER || 'ceylonecofreshinfinity@gmail.com',
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
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required.' });
  }

  console.log(`📬 New Newsletter Subscriber: ${email}`);
  const dispatchResult = await sendNewsletterEmail(email);
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
  if (!name || !email || !product) {
    return res.status(400).json({ success: false, message: 'Name, email, and product are required.' });
  }

  const record = {
    name,
    company: company || 'Direct Buyer',
    email,
    phone: phone || '',
    product,
    quantity: quantity || 'Sample Request',
    targetDestination: targetDestination || destinationPort || 'Worldwide',
    notes: notes || message || '',
    createdAt: new Date().toISOString()
  };

  console.log(`📋 New Quote Request Received for ${product} from ${name} (${company})`);
  const dispatchResult = await sendQuoteEmail(record);
  return res.json({
    success: true,
    message: 'Your quote request has been submitted to Ceylon Eco Fresh Infinity!',
    targetEmail: process.env.EMAIL_USER || 'ceylonecofreshinfinity@gmail.com',
    dispatch: dispatchResult
  });
});

// ── Newsletter Route (POST /api/newsletter) ───────────────────────────────────
app.post('/api/newsletter', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email address is required.' });
  }
  console.log(`📰 Newsletter Subscription: ${email}`);
  return res.json({ success: true, message: 'Thank you for subscribing to Ceylon Eco Fresh Infinity updates!' });
});

app.get('/api/orders', (req, res) => {
  return res.json(localOrders);
});

// ── Order Email Delivery Function ────────────────────────────────────────────
async function sendOrderEmail(orderRecord) {
  const targetEmail = orderRecord.targetEmail || 'ceylonecofreshinfinity@gmail.com';
  const customer = orderRecord.customer || {};
  const items = orderRecord.items || [];

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 10px 14px; border-bottom: 1px solid #eee; font-weight: bold; color: #1F532E;">${item.name}</td>
      <td style="padding: 10px 14px; border-bottom: 1px solid #eee; text-align: center; font-weight: bold; color: #1F532E; background-color: #f8fafc;">${item.quantity} ${item.quantity > 1 ? 'Units' : 'Unit'}</td>
    </tr>
  `).join('');

  const itemsText = items.map(item => `• ${item.name} (Quantity: ${item.quantity})`).join('\n');

  const subject = `🛒 New CEFI Export Order Request [${orderRecord.orderId}] - ${customer.name || 'Customer'}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #1F532E; color: #ffffff; padding: 24px; text-align: center;">
        <h2 style="margin: 0; color: #D4AF37; font-size: 22px;">Ceylon Eco Fresh Infinity (Pvt) Ltd</h2>
        <p style="margin: 6px 0 0; font-size: 13px; color: #d1fae5;">New Customer Order Notification</p>
      </div>
      <div style="padding: 24px; color: #334155;">
        <div style="background-color: #f8fafc; padding: 12px 16px; border-radius: 10px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 14px;"><strong>Order ID:</strong> <span style="font-family: monospace; color: #1F532E; font-weight: bold;">${orderRecord.orderId}</span></p>
          <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">Date: ${new Date().toLocaleString()}</p>
        </div>

        <h3 style="color: #1F532E; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; font-size: 15px;">Customer & Delivery Details</h3>
        <table style="width: 100%; font-size: 13px; line-height: 1.6; margin-bottom: 20px;">
          <tr><td style="width: 140px; font-weight: bold; color: #64748b;">Full Name:</td><td><strong>${customer.name}</strong></td></tr>
          <tr><td style="font-weight: bold; color: #64748b;">Email Address:</td><td><a href="mailto:${customer.email}" style="color: #1F532E; font-weight: bold;">${customer.email}</a></td></tr>
          <tr><td style="font-weight: bold; color: #64748b;">Phone / WhatsApp:</td><td><strong>${customer.phone || 'N/A'}</strong></td></tr>
          <tr><td style="font-weight: bold; color: #64748b;">Delivery Address:</td><td>${customer.address || ''}, ${customer.city || ''}, ${customer.postalCode || ''}, ${customer.country || ''}</td></tr>
        </table>

        <h3 style="color: #1F532E; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; font-size: 15px;">Requested Products</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <thead>
            <tr style="background-color: #f1f5f9; text-align: left; color: #475569;">
              <th style="padding: 10px 14px;">Product</th>
              <th style="padding: 10px 14px; text-align: center;">Requested Quantity</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="background-color: #ecfdf5; border-left: 4px solid #1F532E; padding: 12px 16px; border-radius: 6px; font-size: 12px; color: #065f46;">
          <strong>Order Type:</strong> ${orderRecord.paymentMethod || 'Direct Export Order'} — Please review dispatch inventory and contact client with proforma invoice.
        </div>
      </div>
      <div style="background-color: #f8fafc; padding: 14px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        Ceylon Eco Fresh Infinity (Pvt) Ltd · E-Commerce Automated Dispatch System
      </div>
    </div>
  `;

  // 1. Send via Persistent SMTP
  if (mailTransporter) {
    try {
      const adminOptions = {
        from: `"CEFI Export Orders" <${EMAIL_USER.replace('@', '+website@')}>`,
        to: targetEmail,
        replyTo: customer.email,
        subject: subject,
        headers: { 'X-Priority': '1', 'X-MSMail-Priority': 'High', 'Importance': 'High' },
        text: `New Order: ${orderRecord.orderId}\nCustomer: ${customer.name} (${customer.email})\nPhone: ${customer.phone}\nAddress: ${customer.address}, ${customer.city}, ${customer.country}\n\nProducts:\n${itemsText}`,
        html: htmlContent,
      };

      const customerOptions = (customer.email && customer.email !== targetEmail) ? {
        from: `"Ceylon Eco Fresh Infinity" <${EMAIL_USER}>`,
        to: customer.email,
        subject: `✅ Order Received [${orderRecord.orderId}] — Ceylon Eco Fresh Infinity`,
        text: `Dear ${customer.name},\n\nThank you for your order! Your Order ID is: ${orderRecord.orderId}\n\nProducts:\n${itemsText}\n\nDelivery to: ${customer.address}, ${customer.city}, ${customer.country}\n\nWe will contact you within 24 hours.\n\nBest regards,\nCeylon Eco Fresh Infinity`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
            <div style="background-color: #1F532E; color: #ffffff; padding: 24px; text-align: center;">
              <h2 style="margin: 0; color: #D4AF37; font-size: 22px;">Ceylon Eco Fresh Infinity (Pvt) Ltd</h2>
              <p style="margin: 6px 0 0; font-size: 13px; color: #d1fae5;">Order Request Received</p>
            </div>
            <div style="padding: 24px; color: #334155;">
              <p style="font-size: 15px; margin: 0 0 4px;">Dear <strong>${customer.name}</strong>,</p>
              <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 20px;">Thank you for your order request! We have received it and our export team will contact you within <strong>24 hours</strong> to confirm stock availability, logistics, and dispatch schedule.</p>
              <div style="background-color: #f0fdf4; padding: 12px 16px; border-radius: 10px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 14px;"><strong>Order Reference:</strong> <span style="font-family: monospace; color: #1F532E; font-weight: bold;">${orderRecord.orderId}</span></p>
                <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">Date: ${new Date().toLocaleString()}</p>
              </div>
              <h3 style="color: #1F532E; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; font-size: 14px;">Your Requested Items</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <thead>
                  <tr style="background-color: #f1f5f9; text-align: left; color: #475569;">
                    <th style="padding: 10px 14px;">Product</th>
                    <th style="padding: 10px 14px; text-align: center;">Quantity</th>
                  </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
              </table>
              <div style="background-color: #f8fafc; border-left: 4px solid #D4AF37; padding: 12px 16px; border-radius: 6px; font-size: 13px; color: #92400e; margin-bottom: 16px;">
                <strong>Delivery Destination:</strong> ${customer.address || ''}, ${customer.city || ''}, ${customer.postalCode || ''}, ${customer.country || ''}
              </div>
              <p style="font-size: 13px; color: #64748b;">If you have any questions, reply to this email or contact us at <a href="tel:+94714634485" style="color: #1F532E;">+94 714 634 485</a> (WhatsApp available).</p>
            </div>
            <div style="background-color: #f8fafc; padding: 14px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
              Ceylon Eco Fresh Infinity (Pvt) Ltd · No. 278/1/A, Meegasmulla, Dedigamuwa · ceylonecofreshinfinity@gmail.com
            </div>
          </div>
        `
      } : null;

      const result = await sendDualEmails(adminOptions, customerOptions);
      if (result.success) return { success: true, method: 'smtp' };
    } catch (smtpErr) {
      console.warn('⚠️ [Nodemailer] SMTP failed, attempting fallback API delivery:', smtpErr.message);
    }
  }

  // 2. Direct HTTP email delivery fallback to target inbox
  try {
    const payload = {
      _subject: subject,
      _replyto: customer.email,
      order_reference: orderRecord.orderId,
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      delivery_address: `${customer.address}, ${customer.city}, ${customer.country}`,
      products: itemsText,
      date: new Date().toLocaleString()
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
    console.log(`✅ [Email Dispatcher] Order email dispatched to ${targetEmail}:`, resData);
    return { success: true, method: 'formsubmit' };
  } catch (apiErr) {
    console.warn(`⚠️ [Email Dispatcher] Notice:`, apiErr.message);
    return { success: false, error: apiErr.message };
  }
}

app.post('/api/orders', async (req, res) => {
  const { customer, items, paymentMethod, targetEmail } = req.body;
  if (!customer || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Invalid order data: customer details and items are required.' });
  }

  const orderId = `CEFI-ORD-${Math.floor(100000 + Math.random() * 900000)}`;
  const destinationEmail = targetEmail || 'ceylonecofreshinfinity@gmail.com';
  const orderRecord = {
    orderId,
    customer,
    items,
    paymentMethod: paymentMethod || 'Direct Export Order Request',
    targetEmail: destinationEmail,
    status: 'Confirmed',
    createdAt: new Date().toISOString()
  };
  localOrders.unshift(orderRecord);
  console.log(`🛒 New Order Received [${orderId}] with ${items.length} items from ${customer.name}`);

  // Trigger Email Dispatch to ceylonecofreshinfinity@gmail.com
  sendOrderEmail(orderRecord).catch(err => console.error('Email send error:', err));

  return res.json({ success: true, orderId, targetEmail: destinationEmail, message: 'Order placed & email notification dispatched successfully!' });
});

// ── Start Server ──────────────────────────────────────────────────────────────
// Start Server locally
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`CEFI Backend REST API running on http://localhost:${PORT}`);
  });
}

module.exports = app;

