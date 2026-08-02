import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, ImagePlus } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminAddProduct() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    price: '',
    short_description: '',
    full_description: '',
    image_url: '',
    category_slug: '',
    is_wholesale_only: false,
    is_featured: false
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch categories on mount
  useEffect(() => {
    fetch('http://localhost:5000/api/categories')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCategories(data);
          if (data.length > 0) {
            setFormData(prev => ({ ...prev, category_slug: data[0].slug }));
          }
        }
      })
      .catch(err => console.error('Failed to load categories', err));
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Auto-generate slug from name
  const handleNameBlur = () => {
    if (!formData.slug && formData.name) {
      const generatedSlug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      setFormData(prev => ({ ...prev, slug: generatedSlug }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Format for backend
    const payload = {
      ...formData,
      images: formData.image_url ? [formData.image_url] : []
    };

    try {
      const response = await fetch('http://localhost:5000/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess('Product successfully added to the catalog!');
        // Reset form
        setFormData({
          name: '',
          slug: '',
          price: '',
          short_description: '',
          full_description: '',
          image_url: '',
          category_slug: categories.length > 0 ? categories[0].slug : '',
          is_wholesale_only: false,
          is_featured: false
        });
        window.scrollTo(0, 0);
      } else {
        setError(data.message || 'Failed to add product.');
      }
    } catch (err) {
      setError('A network error occurred while submitting.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-cefi-cream min-h-screen py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center text-sm font-semibold text-cefi-green hover:text-cefi-earth mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to site
          </Link>
          <h1 className="font-serif text-3xl font-bold text-cefi-earth">Admin: Add New Product</h1>
          <p className="text-gray-500 mt-2">Publish a new product to the CEFI catalog.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-soft p-8 border border-cefi-cream-dark">
          
          {error && (
            <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 text-cefi-green-dark p-4 rounded-xl border border-green-100 text-sm font-semibold">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-bold text-cefi-earth mb-2">Product Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  name="name" 
                  required
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={handleNameBlur}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cefi-green/20 focus:border-cefi-green bg-gray-50 transition-colors"
                  placeholder="e.g. Premium Ceylon Cinnamon"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-bold text-cefi-earth mb-2">URL Slug <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  name="slug" 
                  required
                  value={formData.slug}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cefi-green/20 focus:border-cefi-green bg-gray-50 transition-colors"
                  placeholder="premium-ceylon-cinnamon"
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-bold text-cefi-earth mb-2">Price ($) <span className="text-red-500">*</span></label>
                <input 
                  type="number" 
                  step="0.01"
                  name="price" 
                  required
                  value={formData.price}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cefi-green/20 focus:border-cefi-green bg-gray-50 transition-colors"
                  placeholder="12.99"
                />
              </div>

              {/* Category */}
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-bold text-cefi-earth mb-2">Category <span className="text-red-500">*</span></label>
                <select 
                  name="category_slug" 
                  required
                  value={formData.category_slug}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cefi-green/20 focus:border-cefi-green bg-gray-50 transition-colors appearance-none"
                >
                  {categories.map(cat => (
                    <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Short Description */}
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-bold text-cefi-earth mb-2">Short Description</label>
                <textarea 
                  name="short_description" 
                  rows="2"
                  value={formData.short_description}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cefi-green/20 focus:border-cefi-green bg-gray-50 transition-colors"
                  placeholder="Brief summary for product cards..."
                ></textarea>
              </div>

              {/* Full Description */}
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-bold text-cefi-earth mb-2">Full Description</label>
                <textarea 
                  name="full_description" 
                  rows="4"
                  value={formData.full_description}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cefi-green/20 focus:border-cefi-green bg-gray-50 transition-colors"
                  placeholder="Detailed description for the product page..."
                ></textarea>
              </div>

              {/* Image URL */}
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-bold text-cefi-earth mb-2">Image URL</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <ImagePlus className="h-5 w-5 text-gray-400" />
                  </div>
                  <input 
                    type="url" 
                    name="image_url" 
                    value={formData.image_url}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cefi-green/20 focus:border-cefi-green bg-gray-50 transition-colors"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="col-span-1 md:col-span-2 flex flex-col sm:flex-row gap-6 mt-2">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="is_featured"
                    checked={formData.is_featured}
                    onChange={handleChange}
                    className="w-5 h-5 rounded text-cefi-green border-gray-300 focus:ring-cefi-green"
                  />
                  <span className="text-sm font-bold text-cefi-earth">Show in Featured Products</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="is_wholesale_only"
                    checked={formData.is_wholesale_only}
                    onChange={handleChange}
                    className="w-5 h-5 rounded text-cefi-green border-gray-300 focus:ring-cefi-green"
                  />
                  <span className="text-sm font-bold text-cefi-earth">Wholesale / Export Only</span>
                </label>
              </div>

            </div>

            <div className="pt-6 border-t border-gray-100">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full sm:w-auto px-8 py-3 bg-cefi-green hover:bg-cefi-green-dark text-white rounded-full font-bold transition-all shadow-md hover:shadow-hover flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                <span>{loading ? 'Publishing...' : 'Publish Product'}</span>
              </button>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}
