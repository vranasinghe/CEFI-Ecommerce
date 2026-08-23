import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, User, ArrowRight, BookOpen, Sparkles, Calendar, Tag } from 'lucide-react';

export default function BlogPage() {
  const [posts, setPosts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('/api/blog')
      .then(res => res.json())
      .then(data => {
        setPosts(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const categories = ['all', ...Array.from(new Set(posts.map(p => p.category || 'General Insights').filter(Boolean)))];

  const filteredPosts = selectedCategory === 'all'
    ? posts
    : posts.filter(p => (p.category || 'General Insights') === selectedCategory);

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 py-12 space-y-10">
      
      {/* Header Banner */}
      <div className="bg-cefi-green rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-lg border border-emerald-800">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cefi-gold/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-3xl space-y-3">
          <span className="text-xs uppercase font-bold tracking-widest text-cefi-gold inline-block">
            CEFI Insights & Trade Journal
          </span>
          <h1 className="font-serif font-bold text-3xl sm:text-4xl lg:text-5xl text-white leading-tight">
            Ceylon Tea, Spices & Sustainability Articles
          </h1>
          <p className="text-xs sm:text-sm lg:text-base text-emerald-100/90 font-sans leading-relaxed">
            Deep dives into Ceylon cinnamon grading, high-altitude tea flavor profiles, agricultural export trends, and organic outgrower partnerships.
          </p>
        </div>
      </div>

      {/* Category Filter Pills */}
      {categories.length > 2 && (
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-cefi-green text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-100'
              }`}
            >
              {cat === 'all' ? 'All Articles' : cat}
            </button>
          ))}
        </div>
      )}

      {/* Grid of Blog Posts */}
      {loading ? (
        <div className="py-20 text-center text-sm text-gray-500">Loading trade articles...</div>
      ) : filteredPosts.length === 0 ? (
        <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-gray-100">
          <BookOpen className="w-8 h-8 text-gray-400 mx-auto" />
          <h3 className="font-serif font-bold text-lg text-gray-700">No articles in this category yet</h3>
          <button
            onClick={() => setSelectedCategory('all')}
            className="text-xs font-bold text-cefi-green underline"
          >
            View All Articles
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.map(post => (
            <article
              key={post.id || post.slug}
              className="bg-white rounded-3xl border border-gray-100 shadow-soft hover:shadow-hover transition-all overflow-hidden flex flex-col justify-between group"
            >
              <div>
                <div className="aspect-[16/10] overflow-hidden bg-gray-100 relative">
                  <img
                    src={post.cover_image || 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=800&q=80'}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-4 left-4 px-3 py-1 bg-cefi-green/90 backdrop-blur-xs text-white text-[10px] font-bold rounded-full shadow-xs">
                    {post.category || 'Trade Article'}
                  </span>
                </div>

                <div className="p-6 sm:p-7 space-y-3">
                  <div className="flex items-center space-x-3 text-xs text-gray-400">
                    <span className="flex items-center space-x-1 font-medium text-gray-600">
                      <User className="w-3.5 h-3.5 text-cefi-gold" />
                      <span>{post.author || 'CEFI Editorial'}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-cefi-gold" />
                      <span>{post.read_time_min || 5} min read</span>
                    </span>
                  </div>

                  <Link to={`/blog/${post.slug}`}>
                    <h2 className="font-serif font-bold text-xl text-cefi-earth group-hover:text-cefi-green transition-colors line-clamp-2 leading-snug">
                      {post.title}
                    </h2>
                  </Link>

                  <p className="text-xs sm:text-sm text-gray-500 line-clamp-3 leading-relaxed">
                    {post.excerpt || post.content?.substring(0, 140)}
                  </p>
                </div>
              </div>

              <div className="p-6 sm:p-7 pt-0 border-t border-gray-50 mt-2 flex items-center justify-between">
                <span className="text-[11px] text-gray-400 flex items-center space-x-1">
                  <Calendar className="w-3 h-3 text-gray-400" />
                  <span>{post.published_at ? new Date(post.published_at).toLocaleDateString() : 'Published'}</span>
                </span>
                <Link
                  to={`/blog/${post.slug}`}
                  className="text-xs font-bold text-cefi-green group-hover:text-cefi-gold transition-colors flex items-center space-x-1"
                >
                  <span>Read Full Article</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

            </article>
          ))}
        </div>
      )}

    </div>
  );
}
