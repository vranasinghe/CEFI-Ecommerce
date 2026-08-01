const express = require('express');
const cors = require('cors');
require('dotenv').config();

const supabase = require('./supabaseClient');
const mockData = require('./mockData');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory fallback stores for dynamic POST submissions when DB isn't linked
const localContactMessages = [];
const localSubscribers = [];
const localQuotes = [];
const localOrders = [];

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    brand: 'Ceylon Eco Fresh Infinity (CEFI)',
    supabaseConnected: Boolean(supabase),
    timestamp: new Date().toISOString()
  });
});

// GET /api/categories
app.get('/api/categories', async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase.from('categories').select('*');
      if (!error && data && data.length > 0) {
        return res.json(data);
      }
    }
    return res.json(mockData.categories);
  } catch (err) {
    res.json(mockData.categories);
  }
});

// GET /api/categories/:slug
app.get('/api/categories/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    if (supabase) {
      const { data, error } = await supabase.from('categories').select('*').eq('slug', slug).single();
      if (!error && data) {
        return res.json(data);
      }
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

// GET /api/products (filters: category, search, sort, featured)
app.get('/api/products', async (req, res) => {
  const { category, search, sort, featured, wholesale } = req.query;

  try {
    let list = [...mockData.products];

    if (supabase) {
      const { data, error } = await supabase.from('products').select('*, categories(name, slug)');
      if (!error && data && data.length > 0) {
        list = data.map(p => ({
          ...p,
          category_slug: p.categories ? p.categories.slug : p.category_slug,
          category_name: p.categories ? p.categories.name : p.category_name
        }));
      }
    }

    // Category filter
    if (category && category !== 'all') {
      list = list.filter(p => p.category_slug.toLowerCase() === category.toLowerCase());
    }

    // Search filter
    if (search) {
      const query = search.toLowerCase();
      list = list.filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.short_description.toLowerCase().includes(query) ||
        (p.full_description && p.full_description.toLowerCase().includes(query))
      );
    }

    // Featured filter
    if (featured === 'true') {
      list = list.filter(p => p.is_featured);
    }

    // Wholesale filter
    if (wholesale === 'true') {
      list = list.filter(p => p.is_wholesale_only);
    }

    // Sorting
    if (sort === 'price-low') {
      list.sort((a, b) => a.price - b.price);
    } else if (sort === 'price-high') {
      list.sort((a, b) => b.price - a.price);
    } else if (sort === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return res.json(list);
  } catch (err) {
    console.error('Error fetching products:', err);
    return res.json(mockData.products);
  }
});

// GET /api/products/:slug
app.get('/api/products/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    if (supabase) {
      const { data, error } = await supabase.from('products').select('*').eq('slug', slug).single();
      if (!error && data) {
        return res.json(data);
      }
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

// GET /api/blog
app.get('/api/blog', async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase.from('blog_posts').select('*').order('published_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return res.json(data);
      }
    }
    return res.json(mockData.blogPosts);
  } catch (err) {
    return res.json(mockData.blogPosts);
  }
});

// GET /api/blog/:slug
app.get('/api/blog/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    if (supabase) {
      const { data, error } = await supabase.from('blog_posts').select('*').eq('slug', slug).single();
      if (!error && data) {
        return res.json(data);
      }
    }
    const post = mockData.blogPosts.find(b => b.slug === slug);
    if (post) return res.json(post);
    return res.status(404).json({ message: 'Blog post not found' });
  } catch (err) {
    const post = mockData.blogPosts.find(b => b.slug === slug);
    if (post) return res.json(post);
    return res.status(404).json({ message: 'Blog post not found' });
  }
});

// POST /api/contact
app.post('/api/contact', async (req, res) => {
  const { name, email, phone, subject, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'Name, email, and message are required.' });
  }

  const payload = {
    id: `msg-${Date.now()}`,
    name,
    email,
    phone: phone || '',
    subject: subject || 'General Inquiry',
    message,
    created_at: new Date().toISOString()
  };

  try {
    if (supabase) {
      const { error } = await supabase.from('contact_messages').insert([payload]);
      if (error) console.error('Supabase contact insert error:', error.message);
    }
  } catch (err) {
    console.error('Contact submit error:', err);
  }

  localContactMessages.push(payload);
  console.log('📬 Contact Submission Received:', payload);

  return res.json({
    success: true,
    message: 'Thank you for reaching out to Ceylon Eco Fresh Infinity (CEFI). Our export & customer care team will respond within 24 hours.'
  });
});

// POST /api/newsletter
app.post('/api/newsletter', async (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
  }

  const payload = {
    id: `sub-${Date.now()}`,
    email,
    subscribed_at: new Date().toISOString()
  };

  try {
    if (supabase) {
      await supabase.from('newsletter_subscribers').insert([payload]);
    }
  } catch (err) {
    // ignore duplicate key or fallback
  }

  if (!localSubscribers.includes(email)) {
    localSubscribers.push(email);
  }

  console.log('📧 Newsletter Subscription:', email);

  return res.json({
    success: true,
    message: 'Welcome to the CEFI Inner Circle! You are subscribed to new harvest updates and export offers.'
  });
});

// POST /api/quotes (Wholesale / Export Quote Requests)
app.post('/api/quotes', async (req, res) => {
  const { productName, companyName, contactPerson, email, phone, estimatedQuantity, targetDestination, notes } = req.body;

  if (!companyName || !contactPerson || !email || !estimatedQuantity) {
    return res.status(400).json({ success: false, message: 'Please fill in company name, contact person, email, and estimated quantity.' });
  }

  const payload = {
    id: `quote-${Date.now()}`,
    product_name: productName || 'General Export Portfolio',
    company_name: companyName,
    contact_person: contactPerson,
    email,
    phone: phone || '',
    estimated_quantity: estimatedQuantity,
    target_destination: targetDestination || 'International',
    additional_notes: notes || '',
    created_at: new Date().toISOString()
  };

  try {
    if (supabase) {
      await supabase.from('quote_requests').insert([payload]);
    }
  } catch (err) {
    console.error('Quote insert error:', err);
  }

  localQuotes.push(payload);
  console.log('📋 Wholesale Quote Request:', payload);

  return res.json({
    success: true,
    quoteId: payload.id,
    message: 'Your export quote inquiry has been submitted. A dedicated CEFI international trade representative will contact you with pricing & specifications.'
  });
});

// POST /api/orders
app.post('/api/orders', async (req, res) => {
  const { customer, items, total, paymentMethod } = req.body;

  if (!customer || !items || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Invalid order payload.' });
  }

  const orderId = `CEFI-ORD-${Math.floor(100000 + Math.random() * 900000)}`;

  const orderRecord = {
    orderId,
    customer,
    items,
    total,
    paymentMethod: paymentMethod || 'Card / PayHere',
    status: 'Confirmed',
    createdAt: new Date().toISOString()
  };

  localOrders.push(orderRecord);
  console.log('🛒 New Order Placed:', orderId, 'Total:', total);

  return res.json({
    success: true,
    orderId,
    message: 'Order placed successfully! Order confirmation has been dispatched.'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 CEFI Backend REST API running on http://localhost:${PORT}`);
});
