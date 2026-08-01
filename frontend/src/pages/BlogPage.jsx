import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, User, ArrowRight, BookOpen } from 'lucide-react';

export default function BlogPage() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    fetch('/api/blog')
      .then(res => res.json())
      .then(data => setPosts(data))
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      
      {/* Banner */}
      <div className="bg-cefi-cream p-10 rounded-3xl border border-cefi-cream-dark text-center max-w-3xl mx-auto space-y-3">
        <span className="text-xs uppercase font-bold tracking-widest text-cefi-gold">CEFI Insights & Trade Journal</span>
        <h1 className="font-serif font-bold text-4xl text-cefi-earth">
          Ceylon Tea, Spices & Sustainability Articles
        </h1>
        <p className="text-xs text-gray-500 font-sans leading-relaxed">
          Deep dives into Ceylon cinnamon grading, high-altitude tea flavor profiles, agricultural export trends, and organic outgrower partnerships.
        </p>
      </div>

      {/* Grid of Blog Posts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {posts.map(post => (
          <article key={post.id} className="bg-white rounded-3xl border border-gray-100 shadow-soft hover:shadow-hover transition-all overflow-hidden flex flex-col group">
            
            <div className="aspect-[16/10] overflow-hidden bg-gray-100 relative">
              <img
                src={post.cover_image}
                alt={post.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>

            <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-3 text-xs text-gray-400">
                  <span className="flex items-center space-x-1">
                    <User className="w-3.5 h-3.5 text-cefi-gold" />
                    <span>{post.author}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-cefi-gold" />
                    <span>{post.read_time_min} min read</span>
                  </span>
                </div>

                <Link to={`/blog/${post.slug}`}>
                  <h2 className="font-serif font-bold text-xl text-cefi-earth group-hover:text-cefi-green transition-colors line-clamp-2">
                    {post.title}
                  </h2>
                </Link>

                <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">
                  {post.excerpt}
                </p>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <Link
                  to={`/blog/${post.slug}`}
                  className="text-xs font-bold text-cefi-green group-hover:text-cefi-gold transition-colors flex items-center space-x-1"
                >
                  <span>Read Article</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

          </article>
        ))}
      </div>

    </div>
  );
}
