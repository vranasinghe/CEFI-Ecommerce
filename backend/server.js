const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

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
  try {
    if (supabase) {
      const { data, error } = await supabase.from('categories').select('*');
      if (!error && data && data.length > 0) return res.json(data);
    }
    return res.json(mockData.categories);
  } catch (err) {
    res.json(mockData.categories);
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

// ── Blog ─────────────────────────────────────────────────────────────────────
app.get('/api/blog', async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase.from('blog_posts').select('*').order('published_at', { ascending: false });
      if (!error && data && data.length > 0) return res.json(data);
    }
    return res.json(mockData.blogPosts);
  } catch (err) { res.json(mockData.blogPosts); }
});

app.get('/api/blog/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    if (supabase) {
      const { data, error } = await supabase.from('blog_posts').select('*').eq('slug', slug).single();
      if (!error && data) return res.json(data);
    }
    const post = mockData.blogPosts.find(b => b.slug === slug);
    if (post) return res.json(post);
    return res.status(404).json({ message: 'Post not found' });
  } catch (err) {
    const post = mockData.blogPosts.find(b => b.slug === slug);
    if (post) return res.json(post);
    return res.status(404).json({ message: 'Post not found' });
  }
});

// ── Contact / Quotes / Orders ─────────────────────────────────────────────────
app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ success: false, message: 'Missing fields.' });
  const record = { id: `msg-${Date.now()}`, name, email, subject, message, createdAt: new Date().toISOString() };
  localContactMessages.push(record);
  try {
    if (supabase) await supabase.from('contact_messages').insert([record]);
  } catch (e) {}
  return res.json({ success: true, message: 'Message received!' });
});

app.post('/api/subscribe', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email required.' });
  if (localSubscribers.find(s => s.email === email)) return res.json({ success: true, message: 'Already subscribed!' });
  localSubscribers.push({ email, subscribedAt: new Date().toISOString() });
  try {
    if (supabase) await supabase.from('newsletter_subscribers').insert([{ email }]);
  } catch (e) {}
  return res.json({ success: true, message: 'Subscribed successfully!' });
});

app.post('/api/quotes', async (req, res) => {
  const { name, email, company, product, quantity, message } = req.body;
  const record = { id: `quote-${Date.now()}`, name, email, company, product, quantity, message, createdAt: new Date().toISOString() };
  localQuotes.push(record);
  try {
    if (supabase) await supabase.from('quote_requests').insert([record]);
  } catch (e) {}
  return res.json({ success: true, message: 'Quote request received!' });
});

app.post('/api/orders', async (req, res) => {
  const { customer, items, total, paymentMethod } = req.body;
  if (!customer || !items || !total) return res.status(400).json({ success: false, message: 'Invalid order data.' });
  const orderId = `CEFI-ORD-${Math.floor(100000 + Math.random() * 900000)}`;
  const orderRecord = { orderId, customer, items, total, paymentMethod: paymentMethod || 'Card / PayHere', status: 'Confirmed', createdAt: new Date().toISOString() };
  localOrders.push(orderRecord);
  console.log('🛒 New Order:', orderId, 'Total:', total);
  return res.json({ success: true, orderId, message: 'Order placed successfully!' });
});

// ── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 CEFI Backend REST API running on http://localhost:${PORT}`);
});
