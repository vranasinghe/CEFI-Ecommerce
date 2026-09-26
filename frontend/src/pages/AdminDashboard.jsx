import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users, ShoppingBag, Package, Plus, Pencil, Trash2, Search, RefreshCw,
  Eye, AlertTriangle, LayoutGrid, ShieldCheck, LogOut, CheckCircle2,
  Clock, Globe, Filter, ExternalLink, Sliders, Sparkles, Save, RotateCcw,
  FileText, Image as ImageIcon, BookOpen, Upload, Calendar, ArrowUpRight,
  X, Check, Mail
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../utils/authFetch';

const CATEGORY_ICONS = {
  'herbal-leaves':  '🌿',
  'herbal-flowers': '🌸',
  tea:              '🍵',
  herbal:           '🌿',
  spices:           '🌶️',
  fruits:           '🍋',
  vegetables:       '🥦',
};

const DEFAULT_CATALOG_PROFILE = {
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

const EMPTY_BLOG_FORM = {
  id: '',
  title: '',
  slug: '',
  category: 'Trade & Insights',
  author: 'CEFI Editorial Team',
  read_time_min: 5,
  cover_image: '',
  excerpt: '',
  content: ''
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user: currentUser, logout } = useAuth();

  // Left Sidebar Tab State: 'users' | 'orders' | 'products' | 'catalog' | 'blogs'
  const [activeTab, setActiveTab] = useState('products');

  // Data States
  const [products, setProducts]             = useState([]);
  const [categories, setCategories]         = useState([]);
  const [orders, setOrders]                 = useState([]);
  const [blogs, setBlogs]                   = useState([]);
  const [usersList, setUsersList]           = useState(() => {
    try {
      const savedUser = localStorage.getItem('cefi_user');
      return savedUser ? [JSON.parse(savedUser)] : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading]               = useState(true);

  // Catalog Profile Editor State
  const [catalogProfile, setCatalogProfile] = useState(DEFAULT_CATALOG_PROFILE);
  const [savingCatalog, setSavingCatalog]   = useState(false);
  const [profilePreviewTab, setProfilePreviewTab] = useState('all');

  // Blog Editor State
  const [blogSearch, setBlogSearch]         = useState('');
  const [isEditingBlog, setIsEditingBlog]   = useState(false);
  const [blogForm, setBlogForm]             = useState(EMPTY_BLOG_FORM);
  const [savingBlog, setSavingBlog]         = useState(false);
  const [deleteBlogTarget, setDeleteBlogTarget] = useState(null);
  const [deletingBlog, setDeletingBlog]     = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Products Tab Filters
  const [search, setSearch]                 = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [deleteTarget, setDeleteTarget]     = useState(null);
  const [deleting, setDeleting]             = useState(false);

  // Orders Tab Filters
  const [orderSearch, setOrderSearch]       = useState('');
  const [userSearch, setUserSearch]         = useState('');
  // orderId currently sending its "Order Confirmed" email (disables just that button)
  const [sendingConfirmationFor, setSendingConfirmationFor] = useState(null);

  const [toast, setToast]                   = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/products').then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
      authFetch('/api/orders').then(r => r.json()).catch(() => []),
      fetch('/api/catalog-profile').then(r => r.json()).catch(() => {
        try {
          const cached = localStorage.getItem('cefi_catalog_profile');
          if (cached) return JSON.parse(cached);
        } catch {}
        return null;
      }),
      fetch('/api/blog').then(r => r.json()).catch(() => []),
    ])
      .then(([prods, cats, ords, catProfile, blogData]) => {
        setProducts(Array.isArray(prods) ? prods : []);
        setCategories(Array.isArray(cats) ? cats : []);
        setOrders(Array.isArray(ords) ? ords : []);
        setBlogs(Array.isArray(blogData) ? blogData : []);
        if (catProfile && catProfile.all) {
          setCatalogProfile(catProfile);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleSaveCatalogProfile = async () => {
    setSavingCatalog(true);
    try {
      try { localStorage.setItem('cefi_catalog_profile', JSON.stringify(catalogProfile)); } catch {}
      const res = await authFetch('/api/catalog-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(catalogProfile)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Catalog profile updated & published to storefront!');
      } else {
        showToast(data.error || 'Failed to save catalog profile.', 'error');
      }
    } catch {
      showToast('Network error saving catalog profile.', 'error');
    } finally {
      setSavingCatalog(false);
    }
  };

  const handleResetCatalogProfile = () => {
    setCatalogProfile(DEFAULT_CATALOG_PROFILE);
    showToast('Catalog profile restored to defaults.');
  };

  // Blog Handlers
  const handleOpenNewBlog = () => {
    setBlogForm(EMPTY_BLOG_FORM);
    setIsEditingBlog(true);
  };

  const handleEditBlog = (post) => {
    setBlogForm({
      id: post.id || '',
      title: post.title || '',
      slug: post.slug || '',
      category: post.category || 'Trade & Insights',
      author: post.author || 'CEFI Editorial Team',
      read_time_min: post.read_time_min || 5,
      cover_image: post.cover_image || '',
      excerpt: post.excerpt || '',
      content: post.content || ''
    });
    setIsEditingBlog(true);
  };

  const handleSaveBlog = async (e) => {
    e.preventDefault();
    if (!blogForm.title || !blogForm.content) {
      showToast('Title and content are required', 'error');
      return;
    }

    setSavingBlog(true);
    try {
      const isNew = !blogForm.id;
      const url = isNew ? '/api/blog' : `/api/blog/${blogForm.id}`;
      const method = isNew ? 'POST' : 'PUT';

      // Send only the article fields: the API rejects unknown fields (the id
      // travels in the URL).
      const { title, slug, category, author, read_time_min, cover_image, excerpt, content } = blogForm;
      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, slug, category, author, read_time_min, cover_image, excerpt, content })
      });
      const data = await res.json();

      if (data.success) {
        showToast(isNew ? 'Blog article published!' : 'Blog article updated!');
        setIsEditingBlog(false);
        setBlogForm(EMPTY_BLOG_FORM);
        loadData();
      } else {
        showToast(data.message || 'Failed to save blog post', 'error');
      }
    } catch {
      showToast('Network error saving blog post', 'error');
    } finally {
      setSavingBlog(false);
    }
  };

  const handleDeleteBlog = async (post) => {
    if (!post) return;
    setDeletingBlog(true);
    try {
      const res = await authFetch(`/api/blog/${post.id || post.slug}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Blog article deleted');
        setDeleteBlogTarget(null);
        loadData();
      } else {
        showToast(data.message || 'Failed to delete blog article', 'error');
      }
    } catch {
      showToast('Error deleting article', 'error');
    } finally {
      setDeletingBlog(false);
    }
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    const fd = new FormData();
    fd.append('image', file);

    try {
      const res = await authFetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.url) {
        setBlogForm(prev => ({ ...prev, cover_image: data.url }));
        showToast('Cover image uploaded successfully!');
      } else {
        showToast('Upload failed', 'error');
      }
    } catch {
      showToast('Network error uploading cover image', 'error');
    } finally {
      setUploadingCover(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update registered users if current logged in user exists
  useEffect(() => {
    if (currentUser) {
      setUsersList(prev => {
        if (prev.find(u => u.email === currentUser.email)) return prev;
        return [
          {
            id: currentUser.id || `usr-${Date.now()}`,
            name: currentUser.name || 'User',
            email: currentUser.email,
            provider: currentUser.provider || 'Supabase Auth',
            role: currentUser.role || 'customer',
            status: 'Active',
            joinedAt: currentUser.joinedAt || new Date().toLocaleDateString()
          },
          ...prev
        ];
      });
    }
  }, [currentUser]);

  const handleDeleteProduct = async (product) => {
    setDeleting(true);
    try {
      const res  = await authFetch(`/api/products/${product.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setProducts(prev => prev.filter(p => p.id !== product.id));
        showToast(`"${product.name}" deleted successfully.`);
      } else {
        showToast('Failed to delete product.', 'error');
      }
    } catch {
      showToast('Network error.', 'error');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  // Filtered Products
  const filteredProducts = products.filter(p => {
    const matchCat    = activeCategory === 'all' || p.category_slug === activeCategory;
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category_name || '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  // Filtered Orders
  const filteredOrders = orders.filter(o => {
    if (!orderSearch) return true;
    const term = orderSearch.toLowerCase();
    return (
      (o.orderId || '').toLowerCase().includes(term) ||
      (o.customer?.name || '').toLowerCase().includes(term) ||
      (o.customer?.email || '').toLowerCase().includes(term)
    );
  });

  // Manually (re)sends the "Order Confirmed" email to the buyer. The backend
  // looks the address up itself from the stored order — nothing customer-
  // supplied is sent in this request.
  const handleSendOrderConfirmation = async (orderId) => {
    setSendingConfirmationFor(orderId);
    try {
      const res = await authFetch(`/api/orders/${encodeURIComponent(orderId)}/send-confirmation`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        showToast(`Order Confirmed email sent to ${data.sentTo}`);
      } else {
        showToast(data.message || 'Could not send the email.', 'error');
      }
    } catch {
      showToast('Network error sending the email.', 'error');
    } finally {
      setSendingConfirmationFor(null);
    }
  };

  // Filtered Users
  const filteredUsers = usersList.filter(u => {
    if (!userSearch) return true;
    const term = userSearch.toLowerCase();
    return u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
  });

  const countFor = (slug) =>
    slug === 'all'
      ? products.length
      : products.filter(p => p.category_slug === slug).length;

  return (
    <div className="min-h-screen bg-[#F4F6F8] flex flex-col md:flex-row">

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-semibold ${toast.type === 'error' ? 'bg-red-500' : 'bg-cefi-green'}`}>
          {toast.msg}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="font-bold text-lg text-gray-800">Delete Product?</h3>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              Are you sure you want to delete <strong className="text-gray-700">"{deleteTarget.name}"</strong>?
              This action cannot be undone.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteProduct(deleteTarget)}
                disabled={deleting}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE BLOG CONFIRMATION MODAL ─────────────────────────────── */}
      {deleteBlogTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center space-x-3 text-red-600">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="font-bold text-lg text-gray-800">Delete Blog Article?</h3>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              Are you sure you want to delete <strong className="text-gray-700">"{deleteBlogTarget.title}"</strong>?
              This action cannot be undone.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteBlogTarget(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteBlog(deleteBlogTarget)}
                disabled={deletingBlog}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {deletingBlog ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LEFT SIDEBAR ────────────────────────────────────────────────── */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col justify-between shrink-0 border-r border-slate-800">
        <div>
          {/* Admin Header */}
          <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
            <div className="w-10 h-10 bg-cefi-gold text-slate-950 font-bold rounded-2xl flex items-center justify-center shadow-md shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-lg text-white leading-tight">CEFI Admin</h2>
              <span className="text-[10px] uppercase tracking-widest text-cefi-gold font-semibold block">
                Management Portal
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="p-4 space-y-1.5">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Portal Sections
            </div>

            {/* Tab 1: User Accounts */}
            <button
              onClick={() => { setActiveTab('users'); setIsEditingBlog(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-semibold text-xs transition-all ${
                activeTab === 'users'
                  ? 'bg-cefi-green text-white shadow-md'
                  : 'hover:bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Users className="w-4 h-4" />
                <span>1. User Accounts</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'users' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {usersList.length}
              </span>
            </button>

            {/* Tab 2: User Orders */}
            <button
              onClick={() => { setActiveTab('orders'); setIsEditingBlog(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-semibold text-xs transition-all ${
                activeTab === 'orders'
                  ? 'bg-cefi-green text-white shadow-md'
                  : 'hover:bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <ShoppingBag className="w-4 h-4" />
                <span>2. User Orders</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'orders' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {orders.length}
              </span>
            </button>

            {/* Tab 3: Current Edit Product */}
            <button
              onClick={() => { setActiveTab('products'); setIsEditingBlog(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-semibold text-xs transition-all ${
                activeTab === 'products'
                  ? 'bg-cefi-green text-white shadow-md'
                  : 'hover:bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Package className="w-4 h-4" />
                <span>3. Edit Products</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'products' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {products.length}
              </span>
            </button>

            {/* Tab 4: Catalog Profile Banner Editor */}
            <button
              onClick={() => { setActiveTab('catalog'); setIsEditingBlog(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-semibold text-xs transition-all ${
                activeTab === 'catalog'
                  ? 'bg-cefi-green text-white shadow-md'
                  : 'hover:bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Sliders className="w-4 h-4 text-cefi-gold" />
                <span>4. Catalog Profile</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300">
                Banner
              </span>
            </button>

            {/* Tab 5: Blog Articles & Insights Manager */}
            <button
              onClick={() => { setActiveTab('blogs'); setIsEditingBlog(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-semibold text-xs transition-all ${
                activeTab === 'blogs'
                  ? 'bg-cefi-green text-white shadow-md'
                  : 'hover:bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <BookOpen className="w-4 h-4 text-cefi-gold" />
                <span>5. Blog Articles</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'blogs' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {blogs.length}
              </span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <Link
            to="/"
            className="flex items-center justify-center space-x-2 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            <Eye className="w-4 h-4 text-cefi-gold" />
            <span>View Public Store</span>
          </Link>
          <button
            onClick={() => {
              logout();
              navigate('/account');
            }}
            className="flex items-center justify-center space-x-2 w-full py-2.5 text-red-400 hover:bg-red-500/10 rounded-xl text-xs font-semibold transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ───────────────────────────────────────────── */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">

        {/* Top Header Bar */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 bg-cefi-gold/20 text-cefi-earth text-[10px] font-bold uppercase rounded-full">
                Admin Privilege Level
              </span>
              <span className="text-xs text-gray-400 font-mono">
                {currentUser?.email || 'Signed-in admin'}
              </span>
            </div>
            <h1 className="font-serif font-bold text-2xl text-cefi-earth mt-1">
              {activeTab === 'users' && '1. User Account Logins & Profiles'}
              {activeTab === 'orders' && '2. User Orders & Dispatches'}
              {activeTab === 'products' && '3. Current Product Catalog & Editor'}
              {activeTab === 'catalog' && '4. Catalog Portfolio Profile & Banner Settings'}
              {activeTab === 'blogs' && '5. Blog Articles & Insights Manager'}
            </h1>
          </div>

          {activeTab === 'products' && (
            <Link
              to="/admin/products/new"
              className="flex items-center justify-center space-x-2 px-5 py-3 bg-cefi-green hover:bg-cefi-green-dark text-white rounded-2xl text-xs font-bold shadow-md transition-all shrink-0"
            >
              <Plus className="w-4 h-4 text-cefi-gold" />
              <span>Add New Product</span>
            </Link>
          )}

          {activeTab === 'blogs' && (
            <div className="flex items-center space-x-3">
              {isEditingBlog ? (
                <button
                  onClick={() => setIsEditingBlog(false)}
                  className="flex items-center space-x-1.5 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold transition-all shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Back to Article List</span>
                </button>
              ) : (
                <button
                  onClick={handleOpenNewBlog}
                  className="flex items-center justify-center space-x-2 px-5 py-3 bg-cefi-green hover:bg-cefi-green-dark text-white rounded-2xl text-xs font-bold shadow-md transition-all shrink-0"
                >
                  <Plus className="w-4 h-4 text-cefi-gold" />
                  <span>Create New Article</span>
                </button>
              )}
            </div>
          )}

          {activeTab === 'catalog' && (
            <div className="flex items-center space-x-3">
              <button
                onClick={handleResetCatalogProfile}
                className="flex items-center space-x-1.5 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold transition-all shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>
              <button
                onClick={handleSaveCatalogProfile}
                disabled={savingCatalog}
                className="flex items-center space-x-2 px-6 py-2.5 bg-cefi-green hover:bg-cefi-green-dark text-white rounded-2xl text-xs font-bold shadow-md transition-all shrink-0 disabled:opacity-50"
              >
                {savingCatalog ? <RefreshCw className="w-4 h-4 animate-spin text-cefi-gold" /> : <Save className="w-4 h-4 text-cefi-gold" />}
                <span>{savingCatalog ? 'Publishing...' : 'Save & Publish Profile'}</span>
              </button>
            </div>
          )}
        </div>

        {/* ── TAB 1: USER ACCOUNTS ──────────────────────────────────────── */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <span className="text-xs text-gray-400 font-medium">Total Registered Users</span>
                <p className="text-2xl font-serif font-bold text-cefi-green mt-1">{usersList.length}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <span className="text-xs text-gray-400 font-medium">Admin Accounts</span>
                <p className="text-2xl font-serif font-bold text-amber-600 mt-1">
                  {usersList.filter(u => u.role === 'admin').length}
                </p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <span className="text-xs text-gray-400 font-medium">Active Customer Accounts</span>
                <p className="text-2xl font-serif font-bold text-blue-600 mt-1">
                  {usersList.filter(u => u.role !== 'admin').length}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-4">
                <h3 className="font-serif font-bold text-lg text-cefi-earth">User Accounts Registry</h3>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    className="pl-8 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-cefi-green w-48"
                  />
                </div>
              </div>

              {filteredUsers.length === 0 ? (
                <div className="py-16 text-center text-xs text-gray-400">
                  No user accounts registered yet. Registered customer logins will appear here automatically.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-gray-50 text-gray-400 uppercase font-bold text-[10px]">
                        <th className="px-6 py-3">User Name</th>
                        <th className="px-4 py-3">Email Address</th>
                        <th className="px-4 py-3">Auth Provider</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Joined Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredUsers.map(u => (
                        <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-6 py-4 font-bold text-cefi-earth flex items-center space-x-2">
                            <div className="w-7 h-7 bg-cefi-green/10 text-cefi-green rounded-full flex items-center justify-center font-bold text-xs">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <span>{u.name}</span>
                          </td>
                          <td className="px-4 py-4 text-gray-600 font-mono">{u.email}</td>
                          <td className="px-4 py-4">
                            <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full font-semibold text-[10px]">
                              {u.provider}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${
                              u.role === 'admin' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-blue-50 text-blue-700'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                              {u.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-gray-400">{u.joinedAt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 2: USER ORDERS ─────────────────────────────────────────── */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-4">
                <h3 className="font-serif font-bold text-lg text-cefi-earth">Customer Orders List</h3>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search orders..."
                      value={orderSearch}
                      onChange={e => setOrderSearch(e.target.value)}
                      className="pl-8 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-cefi-green w-48"
                    />
                  </div>
                  <button onClick={loadData} className="p-2 text-gray-400 hover:text-cefi-green rounded-xl border border-gray-200">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="py-16 text-center text-xs text-gray-400">
                  No customer orders found. Placed orders will appear here automatically.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredOrders.map(ord => (
                    <div key={ord.orderId} className="p-6 hover:bg-gray-50/50 transition-colors space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                        <div className="flex items-center space-x-3">
                          <span className="font-mono font-bold text-sm text-cefi-green bg-cefi-green/10 px-3 py-1 rounded-xl">
                            {ord.orderId}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(ord.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <span className="px-3 py-1 bg-emerald-100 text-cefi-green font-bold text-xs rounded-full inline-block w-fit">
                          {ord.status || 'Confirmed'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div>
                          <strong className="block text-cefi-earth font-serif text-sm">{ord.customer?.name}</strong>
                          <span className="text-gray-500 block">{ord.customer?.email} • {ord.customer?.phone}</span>
                          <span className="text-gray-400 block mt-0.5">{ord.customer?.address}, {ord.customer?.city}, {ord.customer?.country}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-400 block text-[11px]">Total Amount</span>
                          <span className="font-serif font-bold text-xl text-cefi-green">${(ord.totalAmount ?? 0).toFixed(2)}</span>
                          <span className="text-gray-500 block text-[11px] mt-0.5">Method: {ord.paymentMethod}</span>
                        </div>
                      </div>

                      <div className="bg-cefi-cream/50 p-3 rounded-2xl space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-cefi-gold block">
                          Ordered Items ({ord.items?.length || 0})
                        </span>
                        {ord.items?.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs gap-2">
                            <span className="text-cefi-earth font-medium">• {item.name}</span>
                            <span className="text-gray-500 text-right">
                              {[item.type, item.size].filter(Boolean).join(' · ') || '—'} · Qty: <strong className="text-cefi-green">{item.quantity}</strong>
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-end">
                        <button
                          onClick={() => handleSendOrderConfirmation(ord.orderId)}
                          disabled={sendingConfirmationFor === ord.orderId}
                          className="flex items-center gap-1.5 px-4 py-2 bg-cefi-green text-white text-xs font-bold rounded-xl hover:bg-cefi-green/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          {sendingConfirmationFor === ord.orderId ? 'Sending…' : 'Send Order Confirmed Email'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 3: CURRENT EDIT PRODUCT CATALOG ───────────────────────── */}
        {activeTab === 'products' && (
          <div className="space-y-6">

            {/* Category Filter Tabs */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
              <div className="border-b border-gray-100 px-2 pt-4">
                <div className="flex items-center gap-1 overflow-x-auto pb-0 scrollbar-hide">
                  <button
                    onClick={() => setActiveCategory('all')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold whitespace-nowrap transition-all border-b-2 -mb-px ${
                      activeCategory === 'all'
                        ? 'border-cefi-green text-cefi-green bg-cefi-green/5'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    All Products
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeCategory === 'all' ? 'bg-cefi-green text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {countFor('all')}
                    </span>
                  </button>

                  {categories.map(cat => (
                    <button
                      key={cat.slug}
                      onClick={() => setActiveCategory(cat.slug)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold whitespace-nowrap transition-all border-b-2 -mb-px ${
                        activeCategory === cat.slug
                          ? 'border-cefi-green text-cefi-green bg-cefi-green/5'
                          : 'border-transparent text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <span>{CATEGORY_ICONS[cat.slug] || '📦'}</span>
                      {cat.name}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeCategory === cat.slug ? 'bg-cefi-green text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {countFor(cat.slug)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Search + Filter Header */}
              <div className="px-6 py-3 border-b border-gray-50 flex items-center justify-between gap-4 bg-gray-50/40">
                <p className="text-xs text-gray-400 font-medium">
                  Showing {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
                </p>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search product..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="pl-8 pr-4 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-cefi-green w-44 bg-white"
                    />
                  </div>
                  <button onClick={loadData} className="p-1.5 text-gray-400 hover:text-cefi-green rounded-xl border border-gray-200">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Product Table */}
              {loading ? (
                <div className="py-20 text-center">
                  <div className="w-8 h-8 border-2 border-cefi-green border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-gray-400">Loading catalog...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-gray-50 text-gray-400 uppercase font-bold text-[10px]">
                        <th className="px-6 py-3">Product Name</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Price</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredProducts.map(product => (
                        <tr key={product.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-3">
                              <img
                                src={product.images?.[0] || 'https://via.placeholder.com/60'}
                                alt=""
                                className="w-10 h-10 object-cover rounded-xl shrink-0"
                              />
                              <div>
                                <p className="font-semibold text-cefi-earth line-clamp-1">{product.name}</p>
                                <p className="text-[11px] text-gray-400 line-clamp-1">{product.short_description}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 font-medium text-gray-600">
                            {product.category_name || product.category_slug}
                          </td>
                          <td className="px-4 py-3.5 font-bold text-cefi-green">
                            ${product.price?.toFixed(2)}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-full text-[10px]">
                              Active
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right space-x-1">
                            <button
                              onClick={() => navigate(`/admin/products/edit/${product.id}`)}
                              className="px-2.5 py-1 bg-cefi-green/10 text-cefi-green hover:bg-cefi-green hover:text-white rounded-lg font-bold transition-all text-[11px]"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteTarget(product)}
                              className="p-1 text-gray-400 hover:text-red-600 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ── TAB 4: CATALOG PROFILE & BANNER EDITOR ─────────────────────── */}
        {activeTab === 'catalog' && (
          <div className="space-y-8">
            
            {/* Live Storefront Preview Card */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-cefi-gold" />
                  <h3 className="font-serif font-bold text-base text-cefi-earth">
                    Storefront Live Preview
                  </h3>
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
                    Real-time
                  </span>
                </div>
                
                {/* Category Preview Selector */}
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  <button
                    onClick={() => setProfilePreviewTab('all')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                      profilePreviewTab === 'all'
                        ? 'bg-cefi-green text-white shadow-xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    All Products
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.slug}
                      onClick={() => setProfilePreviewTab(cat.slug)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                        profilePreviewTab === cat.slug
                          ? 'bg-cefi-green text-white shadow-xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rendered Live Banner */}
              <div className="bg-cefi-green rounded-3xl p-8 sm:p-10 text-white relative overflow-hidden shadow-lg border border-emerald-800">
                <div className="absolute top-0 right-0 w-80 h-80 bg-cefi-gold/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-10 right-10 w-48 h-48 opacity-20 pointer-events-none select-none bg-white rounded-full p-4 flex items-center justify-center">
                  <img src="/CEFI%20LOGO.svg" alt="" className="w-full h-full object-contain" />
                </div>

                <div className="relative z-10 max-w-3xl space-y-2.5">
                  <span className="text-xs uppercase font-bold tracking-widest text-cefi-gold inline-block">
                    {profilePreviewTab === 'all'
                      ? (catalogProfile.all?.badge || 'Catalog Portfolio')
                      : (catalogProfile.categories?.[profilePreviewTab]?.badge || catalogProfile.all?.badge || 'Catalog Portfolio')}
                  </span>
                  <h2 className="font-serif font-bold text-2xl sm:text-3xl lg:text-4xl leading-tight text-white">
                    {profilePreviewTab === 'all'
                      ? (catalogProfile.all?.title || 'All Ceylon Products')
                      : (catalogProfile.categories?.[profilePreviewTab]?.title || `${categories.find(c => c.slug === profilePreviewTab)?.name || profilePreviewTab} Collection`)}
                  </h2>
                  <p className="text-xs sm:text-sm text-emerald-100/90 font-sans leading-relaxed">
                    {profilePreviewTab === 'all'
                      ? (catalogProfile.all?.description || 'Explore 100% natural Ceylon teas...')
                      : (catalogProfile.categories?.[profilePreviewTab]?.description || catalogProfile.all?.description || 'Authentic single-origin Ceylon produce.')}
                  </p>
                </div>
              </div>
            </div>

            {/* 2-Column Profile Configuration Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Box 1: Global Main Catalog Banner */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-5">
                <div className="flex items-center space-x-2.5 border-b border-gray-100 pb-3">
                  <div className="w-8 h-8 rounded-xl bg-cefi-green/10 flex items-center justify-center text-cefi-green font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-base text-cefi-earth">
                      Main Catalog Portfolio (All Products)
                    </h3>
                    <p className="text-xs text-gray-400">Header banner shown on the main /products catalog page</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Top Badge / Pill Tag
                    </label>
                    <input
                      type="text"
                      value={catalogProfile.all?.badge || ''}
                      onChange={e => setCatalogProfile(prev => ({
                        ...prev,
                        all: { ...prev.all, badge: e.target.value }
                      }))}
                      placeholder="e.g. Catalog Portfolio"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs text-cefi-earth focus:outline-none focus:border-cefi-green font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Main Headline Title
                    </label>
                    <input
                      type="text"
                      value={catalogProfile.all?.title || ''}
                      onChange={e => setCatalogProfile(prev => ({
                        ...prev,
                        all: { ...prev.all, title: e.target.value }
                      }))}
                      placeholder="e.g. All Ceylon Products"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs text-cefi-earth focus:outline-none focus:border-cefi-green font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Catalog Subtitle / Description
                    </label>
                    <textarea
                      rows={3}
                      value={catalogProfile.all?.description || ''}
                      onChange={e => setCatalogProfile(prev => ({
                        ...prev,
                        all: { ...prev.all, description: e.target.value }
                      }))}
                      placeholder="Describe your catalog portfolio offerings..."
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs text-cefi-earth focus:outline-none focus:border-cefi-green leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              {/* Box 2: Category Profiles */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-5">
                <div className="flex items-center space-x-2.5 border-b border-gray-100 pb-3">
                  <div className="w-8 h-8 rounded-xl bg-cefi-green/10 flex items-center justify-center text-cefi-green font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-base text-cefi-earth">
                      Category Profile Customizer
                    </h3>
                    <p className="text-xs text-gray-400">Headlines & descriptions when filtering specific categories</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Category Selector */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Select Category to Customize
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {categories.map(cat => (
                        <button
                          key={cat.slug}
                          type="button"
                          onClick={() => setProfilePreviewTab(cat.slug)}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                            profilePreviewTab === cat.slug
                              ? 'bg-cefi-green text-white shadow-sm'
                              : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-100'
                          }`}
                        >
                          <span>{CATEGORY_ICONS[cat.slug] || '📦'}</span>
                          <span className="truncate">{cat.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {profilePreviewTab !== 'all' && (
                    <div className="space-y-3 pt-2 border-t border-gray-100">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                          {categories.find(c => c.slug === profilePreviewTab)?.name || profilePreviewTab} — Tag / Badge
                        </label>
                        <input
                          type="text"
                          value={catalogProfile.categories?.[profilePreviewTab]?.badge || ''}
                          onChange={e => {
                            const val = e.target.value;
                            setCatalogProfile(prev => ({
                              ...prev,
                              categories: {
                                ...prev.categories,
                                [profilePreviewTab]: {
                                  ...(prev.categories?.[profilePreviewTab] || {}),
                                  badge: val
                                }
                              }
                            }));
                          }}
                          placeholder="e.g. Herbal Wellness"
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-xs text-cefi-earth focus:outline-none focus:border-cefi-green"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                          {categories.find(c => c.slug === profilePreviewTab)?.name || profilePreviewTab} — Headline
                        </label>
                        <input
                          type="text"
                          value={catalogProfile.categories?.[profilePreviewTab]?.title || ''}
                          onChange={e => {
                            const val = e.target.value;
                            setCatalogProfile(prev => ({
                              ...prev,
                              categories: {
                                ...prev.categories,
                                [profilePreviewTab]: {
                                  ...(prev.categories?.[profilePreviewTab] || {}),
                                  title: val
                                }
                              }
                            }));
                          }}
                          placeholder="e.g. Pure Ceylon Tea Collection"
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-xs text-cefi-earth focus:outline-none focus:border-cefi-green"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                          {categories.find(c => c.slug === profilePreviewTab)?.name || profilePreviewTab} — Description
                        </label>
                        <textarea
                          rows={2}
                          value={catalogProfile.categories?.[profilePreviewTab]?.description || ''}
                          onChange={e => {
                            const val = e.target.value;
                            setCatalogProfile(prev => ({
                              ...prev,
                              categories: {
                                ...prev.categories,
                                [profilePreviewTab]: {
                                  ...(prev.categories?.[profilePreviewTab] || {}),
                                  description: val
                                }
                              }
                            }));
                          }}
                          placeholder="Category specific harvesting & origin description..."
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 text-xs text-cefi-earth focus:outline-none focus:border-cefi-green"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Bottom Save Action Bar */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <CheckCircle2 className="w-4 h-4 text-cefi-green" />
                <span>All changes will immediately reflect on the public product storefront upon saving.</span>
              </div>
              <button
                onClick={handleSaveCatalogProfile}
                disabled={savingCatalog}
                className="flex items-center space-x-2 px-6 py-2.5 bg-cefi-green hover:bg-cefi-green-dark text-white rounded-xl text-xs font-bold shadow-md transition-all shrink-0 disabled:opacity-50"
              >
                {savingCatalog ? <RefreshCw className="w-4 h-4 animate-spin text-cefi-gold" /> : <Save className="w-4 h-4 text-cefi-gold" />}
                <span>{savingCatalog ? 'Saving...' : 'Save & Publish Profile'}</span>
              </button>
            </div>

          </div>
        )}

        {/* ── TAB 5: BLOG ARTICLES & INSIGHTS MANAGER ───────────────────── */}
        {activeTab === 'blogs' && (
          <div className="space-y-6">

            {/* If In Blog Editor Mode */}
            {isEditingBlog ? (
              <form onSubmit={handleSaveBlog} className="space-y-6">
                
                {/* Editor Header Banner */}
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-cefi-green/10 text-cefi-green flex items-center justify-center font-bold">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-serif font-bold text-xl text-cefi-earth">
                        {blogForm.id ? 'Edit Blog Article' : 'Create New Blog Article'}
                      </h2>
                      <p className="text-xs text-gray-400">
                        {blogForm.id ? `Editing article ID: ${blogForm.id}` : 'Draft and publish a new trade article for the public storefront'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => setIsEditingBlog(false)}
                      className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingBlog}
                      className="flex items-center space-x-2 px-6 py-2.5 bg-cefi-green hover:bg-cefi-green-dark text-white rounded-2xl text-xs font-bold shadow-md transition-all disabled:opacity-50"
                    >
                      {savingBlog ? <RefreshCw className="w-4 h-4 animate-spin text-cefi-gold" /> : <Save className="w-4 h-4 text-cefi-gold" />}
                      <span>{savingBlog ? 'Publishing...' : (blogForm.id ? 'Save Changes' : 'Publish Article')}</span>
                    </button>
                  </div>
                </div>

                {/* 2-Column Grid: Form on Left, Live Preview on Right */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Column: Form Fields (7 cols) */}
                  <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xs space-y-5">
                    
                    {/* Article Title */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                        Article Headline Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={blogForm.title}
                        onChange={e => {
                          const val = e.target.value;
                          const autoSlug = val.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
                          setBlogForm(prev => ({
                            ...prev,
                            title: val,
                            slug: prev.id ? prev.slug : autoSlug
                          }));
                        }}
                        placeholder="e.g. Why True Ceylon Cinnamon Outshines Cassia on the Global Market"
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm font-semibold text-cefi-earth focus:outline-none focus:border-cefi-green"
                      />
                    </div>

                    {/* Slug & Category Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                          URL Slug Identifier *
                        </label>
                        <input
                          type="text"
                          required
                          value={blogForm.slug}
                          onChange={e => setBlogForm({ ...blogForm, slug: e.target.value })}
                          placeholder="e.g. true-ceylon-cinnamon-vs-cassia"
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-mono text-gray-600 focus:outline-none focus:border-cefi-green"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                          Category / Topic
                        </label>
                        <input
                          type="text"
                          value={blogForm.category}
                          onChange={e => setBlogForm({ ...blogForm, category: e.target.value })}
                          placeholder="e.g. Spices & Cinnamon / Tea Culture"
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-800 focus:outline-none focus:border-cefi-green"
                        />
                      </div>
                    </div>

                    {/* Author & Read Time Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                          Author Byline
                        </label>
                        <input
                          type="text"
                          value={blogForm.author}
                          onChange={e => setBlogForm({ ...blogForm, author: e.target.value })}
                          placeholder="e.g. Dr. K. Jayawardena / CEFI Tea Master"
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-800 focus:outline-none focus:border-cefi-green"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                          Estimated Read Time (Minutes)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="60"
                          value={blogForm.read_time_min}
                          onChange={e => setBlogForm({ ...blogForm, read_time_min: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-800 focus:outline-none focus:border-cefi-green"
                        />
                      </div>
                    </div>

                    {/* Cover Image Upload & URL */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                        Cover Feature Image *
                      </label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="text"
                          value={blogForm.cover_image}
                          onChange={e => setBlogForm({ ...blogForm, cover_image: e.target.value })}
                          placeholder="https://images.unsplash.com/... or upload below"
                          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-800 focus:outline-none focus:border-cefi-green"
                        />
                        <label className="cursor-pointer inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-cefi-green/10 hover:bg-cefi-green text-cefi-green hover:text-white rounded-xl text-xs font-bold transition-all shrink-0">
                          {uploadingCover ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          <span>{uploadingCover ? 'Uploading...' : 'Upload Image'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleCoverUpload}
                            disabled={uploadingCover}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Excerpt / Summary */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                        Excerpt / Short Summary (Card Preview)
                      </label>
                      <textarea
                        rows={3}
                        value={blogForm.excerpt}
                        onChange={e => setBlogForm({ ...blogForm, excerpt: e.target.value })}
                        placeholder="Brief summary that appears on blog cards and Google snippets..."
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-800 focus:outline-none focus:border-cefi-green leading-relaxed"
                      />
                    </div>

                    {/* Full Content Body */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                          Full Article Content *
                        </label>
                        <span className="text-[10px] text-gray-400">
                          Use ### for headings, #### for subheadings, double enter for paragraphs
                        </span>
                      </div>
                      <textarea
                        rows={12}
                        required
                        value={blogForm.content}
                        onChange={e => setBlogForm({ ...blogForm, content: e.target.value })}
                        placeholder="Write your article body here...
### Introduction
The spice heritage of Ceylon...

#### Why Quality Matters
Handcrafted quills in Matara..."
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-xs sm:text-sm text-gray-800 focus:outline-none focus:border-cefi-green font-mono leading-relaxed"
                      />
                    </div>

                  </div>

                  {/* Right Column: Live Card & Article Preview (5 cols) */}
                  <div className="lg:col-span-5 space-y-6 sticky top-6">
                    
                    {/* Live Card Preview */}
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <div className="flex items-center space-x-2">
                          <Sparkles className="w-4 h-4 text-cefi-gold" />
                          <h3 className="font-serif font-bold text-sm text-cefi-earth">Storefront Card Preview</h3>
                        </div>
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
                          Live
                        </span>
                      </div>

                      {/* Mock Article Card */}
                      <article className="bg-white rounded-2xl border border-gray-100 shadow-soft overflow-hidden flex flex-col">
                        <div className="aspect-[16/10] overflow-hidden bg-gray-100 relative">
                          {blogForm.cover_image ? (
                            <img
                              src={blogForm.cover_image}
                              alt="Cover Preview"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                              <ImageIcon className="w-8 h-8 text-gray-300 mb-1" />
                            </div>
                          )}
                          <span className="absolute top-3 left-3 px-2.5 py-1 bg-cefi-green/90 backdrop-blur-xs text-white text-[10px] font-bold rounded-full">
                            {blogForm.category || 'Insights'}
                          </span>
                        </div>

                        <div className="p-5 space-y-3">
                          <div className="flex items-center space-x-3 text-[11px] text-gray-400">
                            <span>{blogForm.author || 'CEFI Editorial'}</span>
                            <span>•</span>
                            <span>{blogForm.read_time_min || 5} min read</span>
                          </div>

                          <h4 className="font-serif font-bold text-base text-cefi-earth line-clamp-2">
                            {blogForm.title || 'Untitled Article Headline'}
                          </h4>

                          <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">
                            {blogForm.excerpt || blogForm.content?.substring(0, 120) || 'Article summary preview will appear here...'}
                          </p>

                          <div className="pt-2 border-t border-gray-100 flex items-center text-xs font-bold text-cefi-green">
                            <span>Read Full Article</span>
                            <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                          </div>
                        </div>
                      </article>
                    </div>

                    {/* Quick Publishing Tips */}
                    <div className="bg-emerald-50/70 border border-emerald-100 rounded-3xl p-5 space-y-2 text-xs text-emerald-900">
                      <strong className="block text-cefi-green font-serif text-sm">💡 Editorial Guidelines</strong>
                      <p className="leading-relaxed">
                        Articles published here will immediately display on the public <strong>/blog</strong> page and single article page <strong>/blog/{blogForm.slug || 'slug'}</strong>.
                      </p>
                    </div>

                  </div>

                </div>

              </form>
            ) : (
              /* If In Blog List Mode */
              <div className="space-y-6">

                {/* Stats Summary Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-xs text-gray-400 font-medium">Published Articles</span>
                      <p className="text-2xl font-serif font-bold text-cefi-green mt-1">{blogs.length}</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-cefi-green/10 text-cefi-green flex items-center justify-center">
                      <BookOpen className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-xs text-gray-400 font-medium">Trade Categories</span>
                      <p className="text-2xl font-serif font-bold text-cefi-earth mt-1">
                        {new Set(blogs.map(b => b.category || 'General')).size}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Sparkles className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="text-xs text-gray-400 font-medium">Avg. Read Duration</span>
                      <p className="text-2xl font-serif font-bold text-emerald-700 mt-1">
                        {blogs.length > 0 ? Math.round(blogs.reduce((acc, b) => acc + (b.read_time_min || 5), 0) / blogs.length) : 5} mins
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Clock className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                {/* Search Bar & Actions */}
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search articles by title, topic, or author..."
                      value={blogSearch}
                      onChange={e => setBlogSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-cefi-green"
                    />
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={handleOpenNewBlog}
                      className="flex items-center space-x-2 px-5 py-2.5 bg-cefi-green hover:bg-cefi-green-dark text-white rounded-xl text-xs font-bold shadow-xs transition-all"
                    >
                      <Plus className="w-4 h-4 text-cefi-gold" />
                      <span>Write New Article</span>
                    </button>
                  </div>
                </div>

                {/* Articles Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {blogs
                    .filter(b => {
                      if (!blogSearch) return true;
                      const q = blogSearch.toLowerCase();
                      return (
                        (b.title || '').toLowerCase().includes(q) ||
                        (b.category || '').toLowerCase().includes(q) ||
                        (b.author || '').toLowerCase().includes(q) ||
                        (b.excerpt || '').toLowerCase().includes(q)
                      );
                    })
                    .map(post => (
                      <div
                        key={post.id || post.slug}
                        className="bg-white rounded-3xl border border-gray-100 shadow-soft hover:shadow-hover transition-all overflow-hidden flex flex-col justify-between group"
                      >
                        {/* Cover Image */}
                        <div>
                          <div className="aspect-[16/9] overflow-hidden bg-gray-100 relative">
                            <img
                              src={post.cover_image || 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=800&q=80'}
                              alt={post.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <span className="absolute top-3 left-3 px-2.5 py-1 bg-cefi-green/90 backdrop-blur-xs text-white text-[10px] font-bold rounded-full">
                              {post.category || 'Trade Article'}
                            </span>
                          </div>

                          <div className="p-6 space-y-3">
                            <div className="flex items-center space-x-2 text-[11px] text-gray-400">
                              <span>{post.author || 'CEFI Editorial'}</span>
                              <span>•</span>
                              <span>{post.read_time_min || 5} min</span>
                              <span>•</span>
                              <span>{post.published_at ? new Date(post.published_at).toLocaleDateString() : 'Published'}</span>
                            </div>

                            <h3 className="font-serif font-bold text-lg text-cefi-earth group-hover:text-cefi-green transition-colors line-clamp-2">
                              {post.title}
                            </h3>

                            <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">
                              {post.excerpt || post.content?.substring(0, 130)}
                            </p>
                          </div>
                        </div>

                        {/* Card Actions Footer */}
                        <div className="p-6 pt-0 border-t border-gray-50 mt-2 flex items-center justify-between gap-2">
                          <Link
                            to={`/blog/${post.slug}`}
                            target="_blank"
                            className="text-xs font-bold text-gray-500 hover:text-cefi-green flex items-center space-x-1"
                          >
                            <span>Preview</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEditBlog(post)}
                              className="px-3 py-1.5 bg-cefi-green/10 text-cefi-green hover:bg-cefi-green hover:text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => setDeleteBlogTarget(post)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                      </div>
                    ))}
                </div>

              </div>
            )}

          </div>
        )}

      </main>
    </div>
  );
}
