import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Filter, Search, SlidersHorizontal, RefreshCw, Globe, Check } from 'lucide-react';
import ProductCard from '../components/ProductCard';

export default function ProductsPage({ onOpenQuoteModal }) {
  const { category: categoryParam } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const selectedCategory = categoryParam || searchParams.get('category') || 'all';
  const searchQuery = searchParams.get('search') || '';
  const [sortOption, setSortOption] = useState('featured');
  const [wholesaleOnly, setWholesaleOnly] = useState(false);

  useEffect(() => {
    // Fetch categories
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    let url = `/api/products?category=${selectedCategory}`;
    if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
    if (sortOption !== 'featured') url += `&sort=${sortOption}`;
    if (wholesaleOnly) url += `&wholesale=true`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedCategory, searchQuery, sortOption, wholesaleOnly]);

  const handleCategorySelect = (slug) => {
    if (slug === 'all') {
      searchParams.delete('category');
      setSearchParams(searchParams);
    } else {
      searchParams.set('category', slug);
      setSearchParams(searchParams);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Header Banner */}
      <div className="bg-cefi-green rounded-3xl p-8 text-white relative overflow-hidden shadow-lg">
        <div className="relative z-10 max-w-2xl space-y-2">
          <span className="text-xs uppercase font-bold tracking-widest text-cefi-gold">Catalog Portfolio</span>
          <h1 className="font-serif font-bold text-3xl sm:text-4xl capitalize">
            {selectedCategory === 'all' ? 'All Ceylon Products' : `${selectedCategory} Collection`}
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 font-sans">
            Explore 100% natural Ceylon teas, true cinnamon, spices, dried tropical fruits, and herbs harvested directly from Sri Lankan estates.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        
        {/* Category Pills Bar */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
          <button
            onClick={() => handleCategorySelect('all')}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-cefi-green text-white shadow-md'
                : 'bg-white border border-gray-200 text-cefi-earth hover:bg-gray-50'
            }`}
          >
            All Products
          </button>
          
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              to={`/products/${cat.slug}`}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory.toLowerCase() === cat.slug.toLowerCase()
                  ? 'bg-cefi-green text-white shadow-md'
                  : 'bg-white border border-gray-200 text-cefi-earth hover:bg-gray-50'
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </div>

        {/* Controls: Sort & Wholesale Toggle */}
        <div className="flex items-center space-x-3 shrink-0">
          
          {/* Wholesale Export Toggle */}
          <button
            onClick={() => setWholesaleOnly(!wholesaleOnly)}
            className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all flex items-center space-x-1.5 border ${
              wholesaleOnly
                ? 'bg-cefi-gold text-cefi-earth border-cefi-gold shadow-sm'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Export Bulk Only</span>
            {wholesaleOnly && <Check className="w-3.5 h-3.5" />}
          </button>

          {/* Sort Selector */}
          <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-full border border-gray-200 text-xs">
            <SlidersHorizontal className="w-4 h-4 text-gray-400" />
            <select
              value={sortOption}
              onChange={e => setSortOption(e.target.value)}
              className="bg-transparent border-none text-xs font-semibold text-cefi-earth focus:outline-none"
            >
              <option value="featured">Featured First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="name">Alphabetical</option>
            </select>
          </div>

        </div>

      </div>

      {/* Active Filter Notice */}
      {searchQuery && (
        <div className="flex items-center justify-between bg-cefi-cream p-3 rounded-xl text-xs text-cefi-earth">
          <span>Search results for: <strong>"{searchQuery}"</strong></span>
          <button 
            onClick={() => {
              searchParams.delete('search');
              setSearchParams(searchParams);
            }}
            className="text-cefi-green underline font-semibold"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Product Grid */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-cefi-green animate-spin mx-auto" />
          <p className="text-sm font-medium text-gray-500">Loading Ceylon products...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="py-20 text-center space-y-4 bg-white rounded-3xl border border-gray-100 shadow-soft">
          <div className="w-16 h-16 bg-cefi-cream text-cefi-green rounded-full flex items-center justify-center mx-auto">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="font-serif font-bold text-xl text-cefi-earth">No products found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            We couldn't find any products matching your selected category or search filters.
          </p>
          <button
            onClick={() => {
              setSearchParams({});
              setWholesaleOnly(false);
            }}
            className="px-6 py-2.5 bg-cefi-green text-white text-xs font-semibold rounded-full hover:bg-cefi-green-dark transition-all"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map(product => (
            <ProductCard key={product.id} product={product} onOpenQuoteModal={onOpenQuoteModal} />
          ))}
        </div>
      )}

    </div>
  );
}
