import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Globe, ArrowLeft, ShieldCheck, Truck, RefreshCw, Plus, Minus, CheckCircle, Share2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import ProductCard from '../components/ProductCard';

export default function ProductDetailPage({ onOpenQuoteModal }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [selectedImage, setSelectedImage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('retail'); // 'retail' vs 'wholesale'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/products/${slug}`)
      .then(res => res.json())
      .then(data => {
        setProduct(data);
        if (data.images && data.images.length > 0) {
          setSelectedImage(data.images[0]);
        }
        if (data.is_wholesale_only) {
          setActiveTab('wholesale');
        }

        // Fetch related category products
        fetch(`/api/products?category=${data.category_slug}`)
          .then(r => r.json())
          .then(rel => setRelatedProducts(rel.filter(p => p.id !== data.id)))
          .catch(() => {});

        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-cefi-green animate-spin mx-auto" />
        <p className="text-sm text-gray-500 font-medium">Fetching Ceylon product specifications...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="font-serif font-bold text-2xl text-cefi-earth">Product Not Found</h2>
        <p className="text-xs text-gray-500">The Ceylon product you requested does not exist or has been updated.</p>
        <Link to="/products" className="inline-block px-6 py-2.5 bg-cefi-green text-white text-xs font-semibold rounded-full">
          Back to Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-xs text-gray-500">
        <Link to="/" className="hover:text-cefi-green">Home</Link>
        <span>/</span>
        <Link to="/products" className="hover:text-cefi-green">Products</Link>
        <span>/</span>
        <Link to={`/products/${product.category_slug}`} className="hover:text-cefi-green capitalize">{product.category_name || product.category_slug}</Link>
        <span>/</span>
        <span className="text-cefi-earth font-semibold truncate max-w-xs">{product.name}</span>
      </div>

      {/* Main Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* Left Column: Image Gallery */}
        <div className="lg:col-span-6 space-y-4">
          
          <div className="relative aspect-square rounded-3xl overflow-hidden bg-white border border-gray-100 shadow-lg">
            <img
              src={selectedImage || (product.images && product.images[0])}
              alt={product.name}
              className="w-full h-full object-cover transition-all duration-300"
            />
            
            {product.is_wholesale_only && (
              <span className="absolute top-4 right-4 px-3 py-1 bg-cefi-gold text-cefi-earth font-bold text-xs rounded-full shadow-sm flex items-center space-x-1">
                <Globe className="w-3.5 h-3.5" />
                <span>Export / Bulk Product</span>
              </span>
            )}
          </div>

          {/* Thumbnail Strip */}
          {product.images && product.images.length > 1 && (
            <div className="flex items-center space-x-3 overflow-x-auto pb-2">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                    selectedImage === img ? 'border-cefi-green shadow-md scale-105' : 'border-gray-200 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

        </div>

        {/* Right Column: Product Content & Retail vs Wholesale Mode */}
        <div className="lg:col-span-6 space-y-6">
          
          <div>
            <span className="text-xs uppercase tracking-widest font-bold text-cefi-gold">
              {product.category_name || product.category_slug} • Pure Ceylon
            </span>
            <h1 className="font-serif font-bold text-3xl sm:text-4xl text-cefi-earth mt-1 leading-tight">
              {product.name}
            </h1>
            <p className="text-xs text-gray-500 mt-2 flex items-center space-x-4">
              <span>Origin: <strong>{product.origin || 'Sri Lanka'}</strong></span>
              <span>•</span>
              <span>Weight: <strong>{product.weight_g}g net</strong></span>
            </p>
          </div>

          {/* Retail vs Wholesale Inquiry Toggle Segment */}
          <div className="bg-cefi-cream p-1.5 rounded-2xl flex items-center border border-cefi-cream-dark">
            <button
              onClick={() => setActiveTab('retail')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all text-center ${
                activeTab === 'retail' 
                  ? 'bg-white text-cefi-green shadow-sm' 
                  : 'text-gray-500 hover:text-cefi-earth'
              }`}
            >
              Retail Purchase
            </button>
            <button
              onClick={() => setActiveTab('wholesale')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1 ${
                activeTab === 'wholesale' 
                  ? 'bg-cefi-green text-white shadow-sm' 
                  : 'text-gray-500 hover:text-cefi-earth'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-cefi-gold" />
              <span>Wholesale / Export Quote</span>
            </button>
          </div>

          {/* Pricing / Mode Description */}
          {activeTab === 'retail' ? (
            <div className="space-y-4">
              <div className="flex items-baseline space-x-3">
                <span className="font-serif font-extrabold text-3xl text-cefi-green">
                  ${product.price ? product.price.toFixed(2) : '12.00'}
                </span>
                <span className="text-xs text-gray-400">USD / package</span>
              </div>

              {/* Quantity Selector & Add to Cart */}
              <div className="flex items-center space-x-4 pt-2">
                <div className="flex items-center space-x-3 bg-white border border-gray-200 rounded-full px-4 py-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-1 hover:bg-gray-100 rounded-full"
                  >
                    <Minus className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                  <span className="font-bold text-sm text-cefi-earth w-6 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-1 hover:bg-gray-100 rounded-full"
                  >
                    <Plus className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                </div>

                <button
                  onClick={() => addToCart(product, quantity)}
                  className="flex-1 py-3.5 bg-cefi-green hover:bg-cefi-green-dark text-white rounded-full font-serif font-bold text-sm shadow-md flex items-center justify-center space-x-2 transition-all"
                >
                  <ShoppingBag className="w-4 h-4 text-cefi-gold" />
                  <span>Add {quantity} to Basket</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center space-x-2 text-cefi-green font-bold text-sm">
                <Globe className="w-4 h-4 text-cefi-gold" />
                <span>Bulk Commercial Export Dispatch</span>
              </div>
              <p className="text-xs text-emerald-900 leading-relaxed">
                CEFI exports bulk tea bags, spices in 25kg sacks, and custom OEM private label containers to distributors in over 40 countries.
              </p>
              <button
                onClick={() => onOpenQuoteModal && onOpenQuoteModal(product.name)}
                className="w-full py-3 bg-cefi-gold hover:bg-cefi-gold-dark text-cefi-earth font-serif font-bold text-sm rounded-full shadow-sm transition-all"
              >
                Request Export Quotation for {product.name}
              </button>
            </div>
          )}

          {/* Full Description */}
          <div className="space-y-2 pt-4 border-t border-gray-100">
            <h3 className="font-serif font-bold text-base text-cefi-earth">Product Overview</h3>
            <p className="text-xs text-cefi-earth/80 leading-relaxed font-sans whitespace-pre-line">
              {product.full_description || product.short_description}
            </p>
          </div>

          {/* Value Badges */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100 text-xs">
            <div className="flex items-center space-x-2.5 text-gray-600">
              <ShieldCheck className="w-4 h-4 text-cefi-green shrink-0" />
              <span>ISO 22000 Certified Quality</span>
            </div>
            <div className="flex items-center space-x-2.5 text-gray-600">
              <Truck className="w-4 h-4 text-cefi-green shrink-0" />
              <span>Worldwide Air & Freight</span>
            </div>
          </div>

        </div>

      </div>

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <div className="pt-12 border-t border-gray-200 space-y-6">
          <h3 className="font-serif font-bold text-2xl text-cefi-earth">You Might Also Like</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.slice(0, 4).map(rel => (
              <ProductCard key={rel.id} product={rel} onOpenQuoteModal={onOpenQuoteModal} />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
