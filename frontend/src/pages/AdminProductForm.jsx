import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Upload, X, Plus, ImagePlus, CheckCircle } from 'lucide-react';

// Reusable form for both Add and Edit
export default function AdminProductForm({ mode = 'add' }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = mode === 'edit';

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(isEdit);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [productId, setProductId] = useState(null);

  const emptyForm = {
    name: '', slug: '', price: '', short_description: '', full_description: '',
    category_slug: '', is_wholesale_only: false, is_featured: false,
    images: [], variantTypes: '', variantSizes: '', weight_g: '', origin: '', stock_quantity: ''
  };
  const [formData, setFormData] = useState(emptyForm);

  // Load categories
  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCategories(data);
          if (!isEdit && data.length > 0) setFormData(prev => ({ ...prev, category_slug: data[0].slug }));
        }
      })
      .catch(() => {});
  }, []);

  // Load existing product for edit
  useEffect(() => {
    if (!isEdit || !id) return;
    setPageLoading(true);
    fetch('/api/products')
      .then(r => r.json())
      .then(products => {
        const p = products.find(x => x.id === id || x.slug === id);
        if (p) {
          setProductId(p.id);
          setFormData({
            name: p.name || '',
            slug: p.slug || '',
            price: p.price ?? '',
            short_description: p.short_description || '',
            full_description: p.full_description || '',
            category_slug: p.category_slug || '',
            is_wholesale_only: Boolean(p.is_wholesale_only),
            is_featured: Boolean(p.is_featured),
            images: p.images || [],
            variantTypes: p.variants?.type?.join(', ') || '',
            variantSizes: p.variants?.size?.join(', ') || '',
            weight_g: p.weight_g || '',
            origin: p.origin || '',
            stock_quantity: p.stock_quantity || ''
          });
        }
        setPageLoading(false);
      })
      .catch(() => setPageLoading(false));
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleNameBlur = () => {
    if (!formData.slug && formData.name) {
      setFormData(prev => ({ ...prev, slug: prev.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') }));
    }
  };

  // Upload image files
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingImages(true);
    const fd = new FormData();
    files.forEach(f => fd.append('images', f));
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success && data.urls) {
        setFormData(prev => ({ ...prev, images: [...prev.images, ...data.urls] }));
      } else {
        setError(data.message || 'Upload failed.');
      }
    } catch {
      setError('Upload failed. Make sure the backend is running.');
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (idx) => {
    setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));
  };

  const addImageUrl = () => {
    const url = prompt('Paste an image URL:');
    if (url && url.startsWith('http')) {
      setFormData(prev => ({ ...prev, images: [...prev.images, url.trim()] }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const payload = {
      name: formData.name,
      slug: formData.slug,
      price: parseFloat(formData.price) || 0,
      short_description: formData.short_description,
      full_description: formData.full_description,
      category_slug: formData.category_slug,
      is_wholesale_only: formData.is_wholesale_only,
      is_featured: formData.is_featured,
      images: formData.images,
      weight_g: formData.weight_g ? parseInt(formData.weight_g) : null,
      origin: formData.origin,
      stock_quantity: formData.stock_quantity ? parseInt(formData.stock_quantity) : 100,
      variants: {
        type: formData.variantTypes ? formData.variantTypes.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        size: formData.variantSizes ? formData.variantSizes.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      }
    };
    if (!payload.variants.type) delete payload.variants.type;
    if (!payload.variants.size) delete payload.variants.size;
    if (Object.keys(payload.variants).length === 0) payload.variants = null;

    try {
      const url = isEdit ? `/api/products/${productId || id}` : '/api/products';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) {
        setSuccess(isEdit ? 'Product updated successfully!' : 'Product added successfully!');
        setTimeout(() => navigate('/admin'), 1500);
      } else {
        setError(data.message || 'Something went wrong.');
      }
    } catch {
      setError('Network error. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-[#F5F3EE] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-cefi-green border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-gray-500">Loading product...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F3EE]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="p-2 text-gray-400 hover:text-cefi-green hover:bg-gray-100 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-serif font-bold text-xl text-cefi-earth">
                {isEdit ? 'Edit Product' : 'Add New Product'}
              </h1>
              <p className="text-xs text-gray-400">{isEdit ? 'Update product details' : 'Publish to the CEFI catalog'}</p>
            </div>
          </div>
          <button
            type="submit"
            form="product-form"
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-cefi-green hover:bg-cefi-green-dark text-white rounded-xl text-sm font-bold transition-all shadow-sm disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {loading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Publish Product')}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Status Messages */}
        {error && (
          <div className="mb-6 bg-red-50 text-red-700 px-5 py-3 rounded-xl border border-red-100 text-sm font-medium">
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div className="mb-6 bg-green-50 text-cefi-green px-5 py-3 rounded-xl border border-green-100 text-sm font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> {success} Redirecting...
          </div>
        )}

        <form id="product-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Left/Main Column ── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Basic Info */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                <h2 className="font-semibold text-cefi-earth text-sm border-b border-gray-100 pb-3">Basic Information</h2>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Product Name <span className="text-red-500">*</span></label>
                  <input type="text" name="name" required value={formData.name} onChange={handleChange} onBlur={handleNameBlur}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-cefi-green bg-gray-50 text-sm"
                    placeholder="e.g. Premium Ceylon Cinnamon" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">URL Slug <span className="text-red-500">*</span></label>
                    <input type="text" name="slug" required value={formData.slug} onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-cefi-green bg-gray-50 text-sm"
                      placeholder="premium-ceylon-cinnamon" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Price (USD)</label>
                    <input type="number" step="0.01" name="price" value={formData.price} onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-cefi-green bg-gray-50 text-sm"
                      placeholder="12.99" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Category <span className="text-red-500">*</span></label>
                  <select name="category_slug" required value={formData.category_slug} onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-cefi-green bg-gray-50 text-sm appearance-none">
                    {categories.map(cat => <option key={cat.slug} value={cat.slug}>{cat.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Short Description</label>
                  <textarea name="short_description" rows="2" value={formData.short_description} onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-cefi-green bg-gray-50 text-sm resize-none"
                    placeholder="Brief summary for product cards..." />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Full Description</label>
                  <p className="text-xs text-gray-400 mb-2">Use headers ending with ":" like "About:", "Usage:", "Known to:" — they will appear as section headings.</p>
                  <textarea name="full_description" rows="10" value={formData.full_description} onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-cefi-green bg-gray-50 text-sm font-mono"
                    placeholder={"About:\nPremium quality product...\n\nUsage:\nSuitable for...\n\nKnown to:\nRich in antioxidants.\nSupport wellness."} />
                </div>
              </div>

              {/* Images */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                <h2 className="font-semibold text-cefi-earth text-sm border-b border-gray-100 pb-3">Product Images</h2>

                {/* Image Grid */}
                {formData.images.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {formData.images.map((img, idx) => (
                      <div key={idx} className="relative group rounded-xl overflow-hidden aspect-square bg-gray-100 border border-gray-200">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        {idx === 0 && (
                          <span className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-semibold">MAIN</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Controls */}
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex flex-col items-center justify-center gap-2 py-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${uploadingImages ? 'border-cefi-green bg-cefi-green/5' : 'border-gray-200 hover:border-cefi-green hover:bg-cefi-green/5'}`}>
                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImages} />
                    {uploadingImages ? (
                      <Loader2 className="w-6 h-6 text-cefi-green animate-spin" />
                    ) : (
                      <Upload className="w-6 h-6 text-gray-400" />
                    )}
                    <span className="text-xs font-semibold text-gray-500">{uploadingImages ? 'Uploading...' : 'Upload Photos'}</span>
                    <span className="text-[10px] text-gray-400">JPG, PNG, WebP</span>
                  </label>

                  <button
                    type="button"
                    onClick={addImageUrl}
                    className="flex flex-col items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-cefi-green hover:bg-cefi-green/5 transition-colors"
                  >
                    <ImagePlus className="w-6 h-6 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-500">Paste Image URL</span>
                    <span className="text-[10px] text-gray-400">From the internet</span>
                  </button>
                </div>
              </div>

              {/* Variants */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                <h2 className="font-semibold text-cefi-earth text-sm border-b border-gray-100 pb-3">Variants (Optional)</h2>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Available Types</label>
                  <input type="text" name="variantTypes" value={formData.variantTypes} onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-cefi-green bg-gray-50 text-sm"
                    placeholder="Dried Leaves, Tea Bags, Powder" />
                  <p className="text-xs text-gray-400 mt-1">Separate each option with a comma</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Available Sizes</label>
                  <input type="text" name="variantSizes" value={formData.variantSizes} onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-cefi-green bg-gray-50 text-sm"
                    placeholder="50g, 100g, 250g, 500g, 1kg" />
                  <p className="text-xs text-gray-400 mt-1">Separate each size with a comma</p>
                </div>
              </div>
            </div>

            {/* ── Right Sidebar ── */}
            <div className="space-y-6">

              {/* Status */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                <h2 className="font-semibold text-cefi-earth text-sm border-b border-gray-100 pb-3">Product Status</h2>
                <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Featured Product</p>
                    <p className="text-xs text-gray-400">Show on homepage</p>
                  </div>
                  <div className={`relative w-11 h-6 rounded-full transition-colors ${formData.is_featured ? 'bg-cefi-green' : 'bg-gray-200'}`}
                    onClick={() => setFormData(prev => ({ ...prev, is_featured: !prev.is_featured }))}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${formData.is_featured ? 'translate-x-6' : 'translate-x-1'}`}></div>
                  </div>
                </label>
                <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl hover:bg-gray-50">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Wholesale Only</p>
                    <p className="text-xs text-gray-400">Export / bulk pricing</p>
                  </div>
                  <div className={`relative w-11 h-6 rounded-full transition-colors ${formData.is_wholesale_only ? 'bg-amber-500' : 'bg-gray-200'}`}
                    onClick={() => setFormData(prev => ({ ...prev, is_wholesale_only: !prev.is_wholesale_only }))}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${formData.is_wholesale_only ? 'translate-x-6' : 'translate-x-1'}`}></div>
                  </div>
                </label>
              </div>

              {/* Extra Details */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                <h2 className="font-semibold text-cefi-earth text-sm border-b border-gray-100 pb-3">Product Details</h2>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Origin</label>
                  <input type="text" name="origin" value={formData.origin} onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-cefi-green bg-gray-50 text-sm"
                    placeholder="Dimbula, Sri Lanka" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Weight (grams)</label>
                  <input type="number" name="weight_g" value={formData.weight_g} onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-cefi-green bg-gray-50 text-sm"
                    placeholder="250" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Stock Quantity</label>
                  <input type="number" name="stock_quantity" value={formData.stock_quantity} onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-cefi-green bg-gray-50 text-sm"
                    placeholder="100" />
                </div>
              </div>

              {/* Tip box */}
              <div className="bg-cefi-green/10 rounded-2xl p-5 space-y-2">
                <p className="text-xs font-bold text-cefi-green">💡 Description Tips</p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Format your description using section headers (ending with ":") like <strong>About:</strong>, <strong>Usage:</strong>, <strong>Known to:</strong>. Each line after a header becomes a bullet point on the product page.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
