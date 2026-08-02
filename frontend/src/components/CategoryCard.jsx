import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function CategoryCard({ category }) {
  // Extract initial letter for background watermark style
  const initial = category.name ? category.name.charAt(0).toUpperCase() : 'C';

  return (
    <div className="group relative bg-white p-6 border-2 border-gray-100 shadow-sm hover:border-cefi-earth hover:shadow-md transition-all duration-300 flex flex-col items-center text-center overflow-hidden">
      
      {/* Background Watermark Initial */}
      <div className="absolute top-12 left-6 select-none pointer-events-none text-[10rem] leading-none font-serif font-black text-gray-200/70 group-hover:text-cefi-earth transition-colors duration-300 z-0">
        {initial}
      </div>

      {/* Category Image - true transparent PNG, no blend mode needed */}
      <div className="relative z-10 w-44 h-44 mb-6 transform group-hover:scale-105 transition-transform duration-500 flex items-center justify-center">
        <img
          src={category.image_url}
          alt={category.name}
          className="max-w-full max-h-full object-contain drop-shadow-lg"
          loading="lazy"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 space-y-3 max-w-xs">
        <h3 className="font-serif font-bold text-lg text-cefi-earth">
          {category.name}
        </h3>
        <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed font-sans min-h-[48px]">
          {category.description}
        </p>

        {/* Shop Link (Icon circle + Text) */}
        <div className="pt-4 pb-2">
          <Link
            to={`/products/${category.slug}`}
            className="inline-flex items-center space-x-3 text-sm font-bold text-cefi-earth hover:text-cefi-green transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-cefi-earth text-white flex items-center justify-center group-hover:bg-cefi-green-dark transition-colors">
              <ArrowRight className="w-4 h-4" />
            </div>
            <span>Shop now</span>
          </Link>
        </div>
      </div>

    </div>
  );
}
