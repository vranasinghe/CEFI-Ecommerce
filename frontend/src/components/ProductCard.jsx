import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Globe, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function ProductCard({ product, onOpenQuoteModal }) {
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const productUrl = `/products/${product.category_slug || 'all'}/${product.slug}`;

  const primaryImage = product.images && product.images.length > 0 
    ? product.images[0] 
    : 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80';

  return (
    <div 
      onClick={() => navigate(productUrl)}
      className="group bg-cefi-cream-dark hover:bg-white border border-gray-100 shadow-soft transition-colors duration-300 flex flex-col overflow-hidden cursor-pointer"
    >
      
      {/* Image Padding Container */}
      <div className="p-4 pb-0">
        {/* White Image Box */}
        <div className="relative aspect-square overflow-hidden bg-white">
          <img
            src={primaryImage}
            alt={product.name}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
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
      </div>

      {/* Product Content */}
      <div className="p-4 pt-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h3 className="font-serif font-bold text-lg text-cefi-earth group-hover:text-cefi-green transition-colors line-clamp-1">
            {product.name}
          </h3>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed font-sans">
            {product.short_description}
          </p>
        </div>

        {/* Price & Action Button */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
          <div>
            {product.is_wholesale_only && (
              <span className="text-xs font-bold text-cefi-gold tracking-wide uppercase">Inquire</span>
            )}
          </div>

          {product.is_wholesale_only ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenQuoteModal) onOpenQuoteModal(product.name);
              }}
              className="px-4 py-2 bg-cefi-gold hover:bg-cefi-gold-dark text-cefi-earth rounded-full text-xs font-bold transition-all shadow-xs flex items-center space-x-1"
            >
              <span>Quote</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                addToCart(product, 1);
              }}
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
