import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Clock, User, ArrowLeft, Share2, Calendar } from 'lucide-react';

export default function BlogPostPage() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/blog/${slug}`)
      .then(res => res.json())
      .then(data => {
        setPost(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return <div className="py-20 text-center text-sm text-gray-500">Loading article...</div>;
  }

  if (!post) {
    return (
      <div className="py-20 text-center space-y-4">
        <h2 className="font-serif font-bold text-2xl">Article Not Found</h2>
        <Link to="/blog" className="text-cefi-green underline text-xs">Back to Blog</Link>
      </div>
    );
  }

  return (
    <article className="max-w-4xl lg:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      
      <Link to="/blog" className="inline-flex items-center space-x-1.5 text-xs font-semibold text-cefi-green hover:underline">
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to All Articles</span>
      </Link>

      <div className="space-y-4">
        {post.category && (
          <span className="px-3 py-1 bg-cefi-green/10 text-cefi-green text-xs font-bold rounded-full inline-block">
            {post.category}
          </span>
        )}

        <h1 className="font-serif font-extrabold text-3xl sm:text-4xl lg:text-5xl text-cefi-earth leading-tight">
          {post.title}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 border-b border-gray-100 pb-4">
          <span className="flex items-center space-x-1.5">
            <User className="w-3.5 h-3.5 text-cefi-gold" />
            <strong className="text-cefi-earth font-medium">{post.author || 'CEFI Editorial'}</strong>
          </span>
          <span>•</span>
          <span className="flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-cefi-gold" />
            <span>{post.read_time_min || 5} min read</span>
          </span>
          <span>•</span>
          <span className="flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-cefi-gold" />
            <span>{post.published_at ? new Date(post.published_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Published'}</span>
          </span>
        </div>
      </div>

      <div className="aspect-[16/9] rounded-3xl overflow-hidden shadow-lg border border-gray-100">
        <img
          src={post.cover_image || 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=1200&q=80'}
          alt={post.title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Article Body Content */}
      <div className="max-w-none text-cefi-earth/90 leading-relaxed font-sans space-y-5 text-sm sm:text-base">
        {post.excerpt && (
          <div className="p-5 bg-cefi-cream rounded-2xl text-sm sm:text-base italic font-serif text-cefi-earth/90 border-l-4 border-cefi-gold shadow-xs leading-relaxed">
            {post.excerpt}
          </div>
        )}
        
        {/* Render content paragraphs with headings and lists */}
        {post.content.split('\n\n').map((paragraph, idx) => {
          if (paragraph.startsWith('###')) {
            return <h3 key={idx} className="font-serif font-bold text-2xl text-cefi-green pt-4">{paragraph.replace('###', '').trim()}</h3>;
          }
          if (paragraph.startsWith('####')) {
            return <h4 key={idx} className="font-serif font-bold text-lg text-cefi-earth pt-2">{paragraph.replace('####', '').trim()}</h4>;
          }
          if (paragraph.includes('\n- ') || paragraph.startsWith('- ')) {
            const items = paragraph.split('\n').filter(line => line.trim().startsWith('- '));
            return (
              <ul key={idx} className="list-disc list-inside space-y-2 text-gray-700 pl-2">
                {items.map((item, itemIdx) => (
                  <li key={itemIdx} className="leading-relaxed">
                    {item.replace(/^- /, '')}
                  </li>
                ))}
              </ul>
            );
          }
          return <p key={idx} className="text-gray-700 leading-relaxed">{paragraph}</p>;
        })}
      </div>

      {/* Footer Share CTA */}
      <div className="pt-8 border-t border-gray-200 flex items-center justify-between">
        <Link to="/blog" className="px-6 py-2.5 bg-cefi-cream hover:bg-cefi-cream-dark text-cefi-earth text-xs font-semibold rounded-full">
          ← More Articles
        </Link>
        <button 
          onClick={() => navigator.clipboard.writeText(window.location.href)}
          className="px-5 py-2.5 border border-gray-200 text-xs font-semibold rounded-full flex items-center space-x-1 hover:bg-gray-50"
        >
          <Share2 className="w-3.5 h-3.5 text-cefi-green" />
          <span>Copy Article Link</span>
        </button>
      </div>

    </article>
  );
}
