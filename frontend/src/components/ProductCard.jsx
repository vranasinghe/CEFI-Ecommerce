import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Globe, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function ProductCard({ product, onOpenQuoteModal }) {
  const { addToCart } = useCart();

  const primaryImage = product.images && product.images.length > 0 
    ? product.images[0] 
    : 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80';

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 shadow-soft hover:shadow-hover transition-all duration-300 flex flex-col overflow-hidden transform hover:-translate-y-1">
      
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden bg-cefi-cream/40">
        <img
          src={primaryImage}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        
        {/* Category Pill */}
        <div className="absolute top-3 left-3">
          <span className="px-3 py-1 bg-white/90 backdrop-blur-md text-cefi-green text-[11px] font-bold tracking-wider uppercase rounded-full shadow-sm">
            {product.category_name || product.category_slug}
          </span>
        </div>

        {/* Wholesale Only Badge */}
        {product.is_wholesale_only && (
          <div className="absolute top-3 right-3">
            <span className="px-2.5 py-1 bg-cefi-gold text-cefi-earth text-[10px] font-extrabold uppercase rounded-full shadow-sm flex items-center space-x-1">
              <Globe className="w-3 h-3" />
              <span>Export Bulk</span>
            </span>
          </div>
        )}
      </div>

      {/* Product Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <Link to={`/products/${product.category_slug || 'all'}/${product.slug}`}>
            <h3 className="font-serif font-bold text-lg text-cefi-earth group-hover:text-cefi-green transition-colors line-clamp-1">
              {product.name}
            </h3>
          </Link>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed font-sans">
            {product.short_description}
          </p>
        </div>

        {/* Price & Action Button */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
          <div>
            {product.is_wholesale_only ? (
              <span className="text-xs font-bold text-cefi-gold tracking-wide uppercase">Inquire Price</span>
            ) : (
              <span className="font-serif font-bold text-xl text-cefi-green">
                ${product.price ? product.price.toFixed(2) : '12.00'}
              </span>
            )}
          </div>

          {product.is_wholesale_only ? (
            <button
              onClick={() => onOpenQuoteModal && onOpenQuoteModal(product.name)}
              className="px-4 py-2 bg-cefi-gold hover:bg-cefi-gold-dark text-cefi-earth rounded-full text-xs font-bold transition-all shadow-xs flex items-center space-x-1"
            >
              <span>Quote</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => addToCart(product, 1)}
              className="px-4 py-2 bg-cefi-green hover:bg-cefi-green-dark text-white rounded-full text-xs font-semibold transition-all shadow-xs flex items-center space-x-1.5"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-cefi-gold" />
              <span>Add</span>
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
