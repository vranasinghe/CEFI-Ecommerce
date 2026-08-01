import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function CategoryCard({ category }) {
  // Extract initial letter for background watermark style
  const initial = category.name ? category.name.charAt(0).toUpperCase() : 'C';

  return (
    <div className="group relative bg-white rounded-2xl p-6 border border-gray-100 shadow-soft hover:shadow-hover transition-all duration-300 flex flex-col items-center text-center transform hover:-translate-y-1 overflow-hidden">
      
      {/* Background Watermark Initial */}
      <div className="absolute top-4 select-none pointer-events-none text-9xl font-serif font-black text-gray-100/60 group-hover:text-cefi-gold/10 transition-colors z-0">
        {initial}
      </div>

      {/* Category Image */}
      <div className="relative z-10 w-36 h-36 mb-4 rounded-full overflow-hidden border-4 border-cefi-cream shadow-md transform group-hover:scale-105 transition-transform duration-500">
        <img
          src={category.image_url}
          alt={category.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 space-y-2 max-w-xs">
        <h3 className="font-serif font-bold text-xl text-cefi-earth group-hover:text-cefi-green transition-colors">
          {category.name}
        </h3>
        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed font-sans min-h-[32px]">
          {category.description}
        </p>

        {/* Shop Link Pill Button */}
        <div className="pt-3">
          <Link
            to={`/products/${category.slug}`}
            className="inline-flex items-center space-x-2 px-5 py-2 bg-cefi-earth/85 hover:bg-cefi-green text-white rounded-full text-xs font-semibold shadow-sm transition-colors group-hover:bg-cefi-green"
          >
            <span>Shop now</span>
            <ArrowRight className="w-3.5 h-3.5 text-cefi-gold" />
          </Link>
        </div>
      </div>

    </div>
  );
}
