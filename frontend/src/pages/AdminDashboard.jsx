import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users, ShoppingBag, Package, Plus, Pencil, Trash2, Search, RefreshCw,
  Eye, AlertTriangle, LayoutGrid, ShieldCheck, LogOut, CheckCircle2,
  Clock, Globe, Filter, ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const CATEGORY_ICONS = {
  tea:        '🍵',
  herbal:     '🌿',
  spices:     '🌶️',
  fruits:     '🍋',
  vegetables: '🥦',
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user: currentUser, logout } = useAuth();

  // Left Sidebar Tab State: 'users' | 'orders' | 'products'
  const [activeTab, setActiveTab] = useState('products');

  // Data States
  const [products, setProducts]             = useState([]);
  const [categories, setCategories]         = useState([]);
  const [orders, setOrders]                 = useState([]);
  const [usersList, setUsersList]           = useState(() => {
    try {
      const savedUser = localStorage.getItem('cefi_user');
      return savedUser ? [JSON.parse(savedUser)] : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading]               = useState(true);

  // Products Tab Filters
  const [search, setSearch]                 = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [deleteTarget, setDeleteTarget]     = useState(null);
  const [deleting, setDeleting]             = useState(false);

  // Orders Tab Filters
  const [orderSearch, setOrderSearch]       = useState('');
  const [userSearch, setUserSearch]         = useState('');

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
      fetch('/api/orders').then(r => r.json()).catch(() => []),
    ])
      .then(([prods, cats, ords]) => {
        setProducts(Array.isArray(prods) ? prods : []);
        setCategories(Array.isArray(cats) ? cats : []);
        setOrders(Array.isArray(ords) ? ords : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
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
      const res  = await fetch(`/api/products/${product.id}`, { method: 'DELETE' });
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
              onClick={() => setActiveTab('users')}
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
              onClick={() => setActiveTab('orders')}
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
              onClick={() => setActiveTab('products')}
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
                {currentUser?.email || 'rodney1st@gmail.com'}
              </span>
            </div>
            <h1 className="font-serif font-bold text-2xl text-cefi-earth mt-1">
              {activeTab === 'users' && '1. User Account Logins & Profiles'}
              {activeTab === 'orders' && '2. User Orders & Dispatches'}
              {activeTab === 'products' && '3. Current Product Catalog & Editor'}
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
                          <span className="font-serif font-bold text-xl text-cefi-green">${ord.total?.toFixed(2)}</span>
                          <span className="text-gray-500 block text-[11px] mt-0.5">Method: {ord.paymentMethod}</span>
                        </div>
                      </div>

                      <div className="bg-cefi-cream/50 p-3 rounded-2xl space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-cefi-gold block">
                          Ordered Items ({ord.items?.length || 0})
                        </span>
                        {ord.items?.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs">
                            <span className="text-cefi-earth font-medium">• {item.name} × {item.quantity}</span>
                            <span className="font-bold text-cefi-green">${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
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

      </main>
    </div>
  );
}
