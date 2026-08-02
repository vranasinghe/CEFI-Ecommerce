import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Search, Package, RefreshCw, Eye, AlertTriangle, LayoutGrid } from 'lucide-react';

const CATEGORY_ICONS = {
  tea:        '🍵',
  herbal:     '🌿',
  spices:     '🌶️',
  fruits:     '🍋',
  vegetables: '🥦',
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [products, setProducts]       = useState([]);
  const [categories, setCategories]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]       = useState(false);
  const [toast, setToast]             = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/products').then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
    ])
      .then(([prods, cats]) => {
        setProducts(Array.isArray(prods) ? prods : []);
        setCategories(Array.isArray(cats) ? cats : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = async (product) => {
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

  // Filter by category tab + search
  const filtered = products.filter(p => {
    const matchCat    = activeCategory === 'all' || p.category_slug === activeCategory;
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category_name || '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const countFor = (slug) =>
    slug === 'all'
      ? products.length
      : products.filter(p => p.category_slug === slug).length;

  return (
    <div className="min-h-screen bg-[#F5F3EE]">

      {/* Toast */}
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
                onClick={() => handleDelete(deleteTarget)}
                disabled={deleting}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Top Header ── */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-cefi-green rounded-xl flex items-center justify-center shadow-sm">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-xl text-cefi-earth leading-tight">CEFI Admin</h1>
              <p className="text-[11px] text-gray-400">Product Management</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-cefi-green transition-colors px-3 py-2 rounded-lg hover:bg-gray-50"
            >
              <Eye className="w-4 h-4" /> View Site
            </Link>
            <Link
              to="/admin/products/new"
              className="flex items-center gap-2 px-4 py-2.5 bg-cefi-green hover:bg-cefi-green-dark text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Add Product
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Products',  value: products.length,                               color: 'text-cefi-green' },
            { label: 'Featured',        value: products.filter(p => p.is_featured).length,    color: 'text-blue-500' },
            { label: 'Wholesale Only',  value: products.filter(p => p.is_wholesale_only).length, color: 'text-amber-500' },
            { label: 'Categories',      value: categories.length,                              color: 'text-purple-500' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-400 mt-1 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ── Category Tabs ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-2 pt-4">
            <div className="flex items-center gap-1 overflow-x-auto pb-0 scrollbar-hide">
              {/* All tab */}
              <button
                onClick={() => setActiveCategory('all')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-semibold whitespace-nowrap transition-all border-b-2 -mb-px ${
                  activeCategory === 'all'
                    ? 'border-cefi-green text-cefi-green bg-cefi-green/5'
                    : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                All Products
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeCategory === 'all' ? 'bg-cefi-green text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {countFor('all')}
                </span>
              </button>

              {/* One tab per category */}
              {categories.map(cat => (
                <button
                  key={cat.slug}
                  onClick={() => setActiveCategory(cat.slug)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-semibold whitespace-nowrap transition-all border-b-2 -mb-px ${
                    activeCategory === cat.slug
                      ? 'border-cefi-green text-cefi-green bg-cefi-green/5'
                      : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>{CATEGORY_ICONS[cat.slug] || '📦'}</span>
                  {cat.name}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeCategory === cat.slug ? 'bg-cefi-green text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {countFor(cat.slug)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Search + Refresh bar ── */}
          <div className="px-6 py-3 border-b border-gray-50 flex items-center justify-between gap-4 bg-gray-50/40">
            <p className="text-xs text-gray-400 font-medium">
              {activeCategory === 'all'
                ? `Showing all ${filtered.length} products`
                : `Showing ${filtered.length} product${filtered.length !== 1 ? 's' : ''} in ${categories.find(c => c.slug === activeCategory)?.name || activeCategory}`
              }
              {search && ` matching "${search}"`}
            </p>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-cefi-green w-44 bg-white"
                />
              </div>
              <button
                onClick={loadData}
                className="p-2 text-gray-400 hover:text-cefi-green hover:bg-white rounded-xl transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ── Product Table ── */}
          {loading ? (
            <div className="py-20 text-center">
              <div className="w-10 h-10 border-[3px] border-cefi-green border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm text-gray-400">Loading products…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <div className="text-4xl">{CATEGORY_ICONS[activeCategory] || '📦'}</div>
              <p className="text-sm font-semibold text-gray-500">
                {search ? `No products match "${search}"` : `No products in this category yet`}
              </p>
              <Link
                to="/admin/products/new"
                className="inline-flex items-center gap-2 text-cefi-green text-sm font-semibold hover:underline"
              >
                <Plus className="w-4 h-4" /> Add a product
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80 text-left">
                    <th className="px-6 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Product</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Price</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(product => (
                    <tr key={product.id} className="hover:bg-gray-50/60 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-100">
                            {product.images?.[0] ? (
                              <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-lg">
                                {CATEGORY_ICONS[product.category_slug] || '📦'}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-cefi-earth line-clamp-1">{product.name}</p>
                            <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{product.short_description}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <button
                          onClick={() => setActiveCategory(product.category_slug)}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-cefi-green/10 text-cefi-green text-xs font-semibold rounded-full capitalize hover:bg-cefi-green/20 transition-colors"
                          title="Filter by this category"
                        >
                          {CATEGORY_ICONS[product.category_slug] || ''}
                          {product.category_name || product.category_slug}
                        </button>
                      </td>

                      <td className="px-4 py-4">
                        {product.is_wholesale_only ? (
                          <span className="text-amber-600 font-semibold text-xs">Inquire</span>
                        ) : (
                          <span className="font-bold text-cefi-earth">${product.price?.toFixed(2)}</span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex gap-1.5 flex-wrap">
                          {product.is_featured && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full">⭐ Featured</span>
                          )}
                          {product.is_wholesale_only && (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[10px] font-bold rounded-full">📦 Wholesale</span>
                          )}
                          {!product.is_featured && !product.is_wholesale_only && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-full">Standard</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => navigate(`/admin/products/edit/${product.id}`)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cefi-green bg-cefi-green/10 hover:bg-cefi-green hover:text-white rounded-lg transition-all"
                            title="Edit product"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </button>
                          <Link
                            to={`/products/${product.category_slug}/${product.slug}`}
                            target="_blank"
                            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View on site"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => setDeleteTarget(product)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
