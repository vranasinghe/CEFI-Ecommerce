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
    <article className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      
      <Link to="/blog" className="inline-flex items-center space-x-1 text-xs text-cefi-green hover:underline">
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to All Articles</span>
      </Link>

      <div className="space-y-4">
        <h1 className="font-serif font-extrabold text-3xl sm:text-5xl text-cefi-earth leading-tight">
          {post.title}
        </h1>

        <div className="flex items-center space-x-4 text-xs text-gray-500 border-b border-gray-100 pb-4">
          <span className="flex items-center space-x-1">
            <User className="w-3.5 h-3.5 text-cefi-gold" />
            <strong className="text-cefi-earth">{post.author}</strong>
          </span>
          <span>•</span>
          <span className="flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-cefi-gold" />
            <span>{post.read_time_min} min read</span>
          </span>
          <span>•</span>
          <span className="flex items-center space-x-1">
            <Calendar className="w-3.5 h-3.5 text-cefi-gold" />
            <span>{new Date(post.published_at).toLocaleDateString()}</span>
          </span>
        </div>
      </div>

      <div className="aspect-[16/9] rounded-3xl overflow-hidden shadow-lg border border-gray-100">
        <img
          src={post.cover_image}
          alt={post.title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Article Body Content */}
      <div className="prose prose-lg max-w-none text-cefi-earth/90 leading-relaxed font-sans space-y-4">
        <div className="p-4 bg-cefi-cream rounded-2xl text-sm italic font-serif text-cefi-earth/80 border-l-4 border-cefi-gold">
          {post.excerpt}
        </div>
        
        {/* Render content paragraphs */}
        {post.content.split('\n\n').map((paragraph, idx) => {
          if (paragraph.startsWith('###')) {
            return <h3 key={idx} className="font-serif font-bold text-2xl text-cefi-green pt-4">{paragraph.replace('###', '').trim()}</h3>;
          }
          if (paragraph.startsWith('####')) {
            return <h4 key={idx} className="font-serif font-bold text-lg text-cefi-earth pt-2">{paragraph.replace('####', '').trim()}</h4>;
          }
          return <p key={idx} className="text-sm sm:text-base text-gray-700 leading-relaxed">{paragraph}</p>;
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
