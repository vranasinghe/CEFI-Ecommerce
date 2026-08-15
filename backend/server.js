const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

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
  const { name, email, phone, subject, message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ success: false, message: 'Missing required fields.' });
  const record = { id: `msg-${Date.now()}`, name, email, phone, subject, message, createdAt: new Date().toISOString() };
  localContactMessages.push(record);
  try {
    if (supabase) await supabase.from('contact_messages').insert([record]);
  } catch (e) {}

  // Trigger Email Dispatch to ceylonecofreshinfinity@gmail.com
  sendContactEmail(record).catch(err => console.error('Contact email send error:', err));

  return res.json({ success: true, message: 'Message sent & email notification dispatched successfully!' });
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
  const { productName, product, companyName, company, contactPerson, name, email, phone, estimatedQuantity, quantity, targetDestination, destination, notes, message } = req.body;
  const record = {
    id: `quote-${Date.now()}`,
    name: contactPerson || name || 'Wholesale Client',
    company: companyName || company || 'N/A',
    product: productName || product || 'Ceylon Tea & Spices',
    quantity: estimatedQuantity || quantity || 'Custom',
    targetDestination: targetDestination || destination || 'N/A',
    email,
    phone,
    notes: notes || message || '',
    createdAt: new Date().toISOString()
  };
  localQuotes.push(record);
  try {
    if (supabase) await supabase.from('quote_requests').insert([record]);
  } catch (e) {}

  // Trigger Email Dispatch to ceylonecofreshinfinity@gmail.com
  sendQuoteEmail(record).catch(err => console.error('Quote email send error:', err));

  return res.json({ success: true, message: 'Quote request sent & email notification dispatched successfully!' });
});

app.get('/api/orders', (req, res) => {
  return res.json(localOrders);
});

// ── Contact Email Delivery Function ──────────────────────────────────────────
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

  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      // 1. Notify CEFI admin
      await transporter.sendMail({
        from: `"CEFI Contact Form" <${process.env.EMAIL_USER}>`,
        to: targetEmail,
        replyTo: email,
        subject: emailSubject,
        text: `New Contact Form Message from ${name} (${email}, ${phone || 'No phone'})\n\nSubject: ${subject}\n\nMessage:\n${message}`,
        html: htmlContent,
      });
      console.log(`✅ [Nodemailer] Contact email successfully delivered to ${targetEmail} from ${email}`);

      // 2. Send confirmation email to the customer
      if (email && email !== targetEmail) {
        const customerConfirmHtml = `
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
        `;
        await transporter.sendMail({
          from: `"Ceylon Eco Fresh Infinity" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: `✅ We received your message, ${name.split(' ')[0]}! — CEFI`,
          text: `Dear ${name},\n\nThank you for contacting Ceylon Eco Fresh Infinity. We have received your message regarding "${subject}" and our team will respond within 24 hours.\n\nFor urgent matters, contact us at +94 714 634 485.\n\nBest regards,\nCeylon Eco Fresh Infinity Team`,
          html: customerConfirmHtml,
        });
        console.log(`✅ [Nodemailer] Contact confirmation sent to customer: ${email}`);
      }

      return { success: true, method: 'smtp' };
    } catch (err) {
      console.error('⚠️ [Nodemailer] Contact email SMTP failed:', err.message);
    }
  }
}

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

  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      // 1. Notify CEFI admin
      await transporter.sendMail({
        from: `"CEFI Export Quotes" <${process.env.EMAIL_USER}>`,
        to: targetEmail,
        replyTo: email,
        subject: emailSubject,
        text: `New Quote Request from ${name} (${company})\nProduct: ${product}\nQuantity: ${quantity}\nEmail: ${email}\nPhone: ${phone}\nNotes: ${notes}`,
        html: htmlContent,
      });
      console.log(`✅ [Nodemailer] Quote email successfully delivered to ${targetEmail} for ${company}`);

      // 2. Send confirmation email to the client
      if (email && email !== targetEmail) {
        const clientConfirmHtml = `
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
        `;
        await transporter.sendMail({
          from: `"Ceylon Eco Fresh Infinity" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: `✅ Quote Request Received — ${product} | CEFI`,
          text: `Dear ${name},\n\nThank you for your quotation request for ${product} (${quantity}) to ${targetDestination}.\n\nOur trade team will respond within 1–2 business days with a detailed proforma invoice.\n\nFor urgent matters, contact us at +94 714 634 485.\n\nBest regards,\nCeylon Eco Fresh Infinity Export Team`,
          html: clientConfirmHtml,
        });
        console.log(`✅ [Nodemailer] Quote confirmation sent to client: ${email}`);
      }

      return { success: true, method: 'smtp' };
    } catch (err) {
      console.error('⚠️ [Nodemailer] Quote email SMTP failed:', err.message);
    }
  }
}

// ── Order Email Delivery Function ────────────────────────────────────────────
async function sendOrderEmail(orderRecord) {
  const targetEmail = orderRecord.targetEmail || 'ceylonecofreshinfinity@gmail.com';
  const customer = orderRecord.customer || {};
  const items = orderRecord.items || [];

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #1F532E;">${item.name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${item.price ? (item.price * item.quantity).toFixed(2) : '0.00'}</td>
    </tr>
  `).join('');

  const itemsText = items.map(item => `• ${item.name} (Qty: ${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}`).join('\n');

  const subject = `🛒 New CEFI Order [${orderRecord.orderId}] - ${customer.name || 'Customer'}`;

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
          <tr><td style="width: 130px; font-weight: bold; color: #64748b;">Full Name:</td><td><strong>${customer.name}</strong></td></tr>
          <tr><td style="font-weight: bold; color: #64748b;">Email Address:</td><td><a href="mailto:${customer.email}" style="color: #1F532E; font-weight: bold;">${customer.email}</a></td></tr>
          <tr><td style="font-weight: bold; color: #64748b;">Phone Number:</td><td><strong>${customer.phone || 'N/A'}</strong></td></tr>
          <tr><td style="font-weight: bold; color: #64748b;">Delivery Address:</td><td>${customer.address || ''}, ${customer.city || ''}, ${customer.postalCode || ''}, ${customer.country || ''}</td></tr>
        </table>

        <h3 style="color: #1F532E; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; font-size: 15px;">Ordered Products</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px;">
          <thead>
            <tr style="background-color: #f1f5f9; text-align: left; color: #475569;">
              <th style="padding: 8px 10px;">Product</th>
              <th style="padding: 8px 10px; text-align: center;">Qty</th>
              <th style="padding: 8px 10px; text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 12px 10px; font-weight: bold; text-align: right; font-size: 14px;">Total Amount:</td>
              <td style="padding: 12px 10px; font-weight: bold; text-align: right; color: #1F532E; font-size: 16px;">$${Number(orderRecord.total || 0).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        <div style="background-color: #ecfdf5; border-left: 4px solid #1F532E; padding: 12px 16px; border-radius: 6px; font-size: 12px; color: #065f46;">
          <strong>Order Type:</strong> ${orderRecord.paymentMethod || 'Direct Email Order'} — Please verify dispatch timeline and issue proforma invoice to customer.
        </div>
      </div>
      <div style="background-color: #f8fafc; padding: 14px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        Ceylon Eco Fresh Infinity (Pvt) Ltd · E-Commerce Automated Dispatch System
      </div>
    </div>
  `;

  // 1. Send via Nodemailer SMTP if credentials provided
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      // 1a. Notify CEFI admin
      await transporter.sendMail({
        from: `"CEFI Export Orders" <${process.env.EMAIL_USER}>`,
        to: targetEmail,
        replyTo: customer.email,
        subject: subject,
        headers: { 'X-Priority': '1', 'X-MSMail-Priority': 'High', 'Importance': 'High' },
        text: `New Order: ${orderRecord.orderId}\nCustomer: ${customer.name} (${customer.email})\nPhone: ${customer.phone}\nAddress: ${customer.address}, ${customer.city}, ${customer.country}\n\nProducts:\n${itemsText}\n\nTotal: $${orderRecord.total}`,
        html: htmlContent,
      });
      console.log(`✅ [Nodemailer] Order notification delivered to ${targetEmail}`);

      // 1b. Send order confirmation to the customer
      if (customer.email && customer.email !== targetEmail) {
        const customerOrderHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
            <div style="background-color: #1F532E; color: #ffffff; padding: 24px; text-align: center;">
              <h2 style="margin: 0; color: #D4AF37; font-size: 22px;">Ceylon Eco Fresh Infinity (Pvt) Ltd</h2>
              <p style="margin: 6px 0 0; font-size: 13px; color: #d1fae5;">Order Confirmation</p>
            </div>
            <div style="padding: 24px; color: #334155;">
              <p style="font-size: 15px; margin: 0 0 4px;">Dear <strong>${customer.name}</strong>,</p>
              <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 20px;">Thank you for your order! We have received it and our team will contact you within <strong>24 hours</strong> to confirm dispatch details and arrange payment.</p>
              <div style="background-color: #f0fdf4; padding: 12px 16px; border-radius: 10px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 14px;"><strong>Order ID:</strong> <span style="font-family: monospace; color: #1F532E; font-weight: bold;">${orderRecord.orderId}</span></p>
                <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">Date: ${new Date().toLocaleString()}</p>
              </div>
              <h3 style="color: #1F532E; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; font-size: 14px;">Your Order Summary</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px;">
                <thead>
                  <tr style="background-color: #f1f5f9; text-align: left; color: #475569;">
                    <th style="padding: 8px 10px;">Product</th>
                    <th style="padding: 8px 10px; text-align: center;">Qty</th>
                    <th style="padding: 8px 10px; text-align: right;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
                <tfoot>
                  <tr>
                    <td colspan="2" style="padding: 12px 10px; font-weight: bold; text-align: right; font-size: 14px;">Total Amount:</td>
                    <td style="padding: 12px 10px; font-weight: bold; text-align: right; color: #1F532E; font-size: 16px;">$${Number(orderRecord.total || 0).toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
              <div style="background-color: #f8fafc; border-left: 4px solid #D4AF37; padding: 12px 16px; border-radius: 6px; font-size: 13px; color: #92400e; margin-bottom: 16px;">
                <strong>Delivery To:</strong> ${customer.address || ''}, ${customer.city || ''}, ${customer.postalCode || ''}, ${customer.country || ''}
              </div>
              <p style="font-size: 13px; color: #64748b;">If you have any questions, reply to this email or contact us at <a href="tel:+94714634485" style="color: #1F532E;">+94 714 634 485</a>.</p>
            </div>
            <div style="background-color: #f8fafc; padding: 14px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
              Ceylon Eco Fresh Infinity (Pvt) Ltd · No. 278/1/A, Meegasmulla, Dedigamuwa · ceylonecofreshinfinity@gmail.com
            </div>
          </div>
        `;
        await transporter.sendMail({
          from: `"Ceylon Eco Fresh Infinity" <${process.env.EMAIL_USER}>`,
          to: customer.email,
          subject: `✅ Order Confirmed [${orderRecord.orderId}] — Ceylon Eco Fresh Infinity`,
          text: `Dear ${customer.name},\n\nThank you for your order! Your Order ID is: ${orderRecord.orderId}\n\nProducts:\n${itemsText}\n\nTotal: $${orderRecord.total}\n\nDelivery to: ${customer.address}, ${customer.city}, ${customer.country}\n\nWe will contact you within 24 hours to confirm dispatch.\n\nBest regards,\nCeylon Eco Fresh Infinity`,
          html: customerOrderHtml,
        });
        console.log(`✅ [Nodemailer] Order confirmation sent to customer: ${customer.email}`);
      }

      return { success: true, method: 'smtp' };
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
      total_due: `$${Number(orderRecord.total || 0).toFixed(2)}`,
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
  const { customer, items, total, paymentMethod, targetEmail } = req.body;
  if (!customer || !items || !total) return res.status(400).json({ success: false, message: 'Invalid order data.' });
  const orderId = `CEFI-ORD-${Math.floor(100000 + Math.random() * 900000)}`;
  const destinationEmail = targetEmail || 'ceylonecofreshinfinity@gmail.com';
  const orderRecord = {
    orderId,
    customer,
    items,
    total,
    paymentMethod: paymentMethod || 'Direct Email Order',
    targetEmail: destinationEmail,
    status: 'Confirmed',
    createdAt: new Date().toISOString()
  };
  localOrders.unshift(orderRecord);
  console.log(`🛒 New Order Received [${orderId}] Total: $${total}`);

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

