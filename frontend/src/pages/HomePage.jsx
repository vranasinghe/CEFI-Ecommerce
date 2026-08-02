import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Award, ShieldCheck, Truck, RefreshCw, Send, CheckCircle2, Sparkles, CreditCard, Headset } from 'lucide-react';
import CategoryCard from '../components/CategoryCard';
import ProductCard from '../components/ProductCard';
import Reveal from '../components/Reveal';

export default function HomePage({ onOpenQuoteModal }) {
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categoryScrollIndex, setCategoryScrollIndex] = useState(0);
  const [carouselDirection, setCarouselDirection] = useState('right');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  useEffect(() => {
    // Fetch categories
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => {
        const order = ['herbal-leaves', 'herbal-flowers', 'tea', 'spices', 'fruits', 'vegetables'];
        const sortedData = data.sort((a, b) => {
          let indexA = order.indexOf(a.slug);
          let indexB = order.indexOf(b.slug);
          if (indexA === -1) indexA = 999;
          if (indexB === -1) indexB = 999;
          return indexA - indexB;
        });
        setCategories([...sortedData]);
      })
      .catch(() => {});

    // Fetch featured products
    fetch('/api/products?featured=true')
      .then(res => res.json())
      .then(data => setFeaturedProducts(data))
      .catch(() => {});
  }, []);

  const handleNewsletter = async (e) => {
    e.preventDefault();
    if (newsletterEmail) {
      try {
        await fetch('/api/newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: newsletterEmail })
        });
      } catch (err) {}
      setNewsletterSubscribed(true);
      setNewsletterEmail('');
    }
  };

  const nextCategory = () => {
    if (categories.length > 0) {
      setCarouselDirection('right');
      setCategoryScrollIndex((prev) => (prev + 1) % categories.length);
    }
  };

  const prevCategory = () => {
    if (categories.length > 0) {
      setCarouselDirection('left');
      setCategoryScrollIndex((prev) => (prev - 1 + categories.length) % categories.length);
    }
  };

  return (
    <div className="space-y-20 pb-16">
      
      {/* 2. Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#F5F3EE] via-[#F0EDE5] to-[#EAE6DC]" style={{ minHeight: '88vh' }}>
        
        {/* Subtle botanical background watermark */}
        <div className="absolute inset-0 pointer-events-none opacity-5">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border-[60px] border-cefi-green"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center" style={{ minHeight: '88vh' }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 items-center w-full">
            
            {/* Left Column: Typography & CTAs */}
            <div className="space-y-7 z-10 py-16 lg:py-0">
              
              {/* Badge */}
              <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full border border-cefi-gold/40 bg-white/60 text-cefi-earth text-xs font-bold tracking-widest uppercase backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5 text-cefi-gold" />
                <span>Pure Ceylon Single-Origin Excellence</span>
              </div>

              {/* Heading */}
              <h1 className="font-serif font-extrabold text-5xl sm:text-6xl lg:text-7xl text-cefi-earth leading-[1.05] tracking-tight">
                Rooted in Ceylon,<br />
                <span className="text-cefi-green italic font-semibold">Grown for the</span><br />
                <span className="text-cefi-green italic font-semibold">World.</span>
              </h1>

              {/* Gold accent underline */}
              <div className="flex items-center space-x-2">
                <div className="w-12 h-0.5 bg-cefi-gold rounded-full"></div>
                <div className="w-4 h-0.5 bg-cefi-gold/50 rounded-full"></div>
              </div>

              {/* Description */}
              <p className="text-base text-cefi-earth/75 max-w-md font-sans leading-relaxed">
                Premium Sri Lankan tea, authentic True Cinnamon, rare spices, sun-dried tropical fruits, and organic agricultural produce processed and exported under world-class quality standards.
              </p>

              {/* CTA */}
              <div className="pt-2">
                <Link
                  to="/products"
                  className="inline-flex items-center space-x-3 px-9 py-4 bg-cefi-earth hover:bg-cefi-green text-white rounded-full font-serif font-semibold text-base shadow-xl hover:shadow-2xl transition-all duration-300 group"
                >
                  <span>Shop now</span>
                  <div className="w-8 h-8 rounded-full bg-white/20 group-hover:bg-white flex items-center justify-center transition-colors">
                    <ArrowRight className="w-4 h-4 group-hover:text-cefi-green transition-colors" />
                  </div>
                </Link>
              </div>

              {/* Trust Stats with icons */}
              <div className="pt-6 grid grid-cols-3 gap-6 border-t border-cefi-earth/10 max-w-md">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-cefi-green/10 flex items-center justify-center shrink-0">
                    <Award className="w-4 h-4 text-cefi-green" />
                  </div>
                  <div>
                    <span className="block font-serif font-bold text-xl text-cefi-earth">100%</span>
                    <span className="text-[11px] text-gray-500 font-medium leading-tight">Pure Ceylon Origin</span>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-cefi-green/10 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4 text-cefi-green" />
                  </div>
                  <div>
                    <span className="block font-serif font-bold text-xl text-cefi-earth">40+</span>
                    <span className="text-[11px] text-gray-500 font-medium leading-tight">Global Markets</span>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-cefi-green/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-cefi-green" />
                  </div>
                  <div>
                    <span className="block font-serif font-bold text-xl text-cefi-earth">300+</span>
                    <span className="text-[11px] text-gray-500 font-medium leading-tight">Farmer Outgrowers</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Large Hero Image with Floating Elements */}
            <div className="relative flex items-center justify-center" style={{ minHeight: '88vh' }}>

              {/* Floating ingredient: top-center (cinnamon/spices) */}
              <img
                src="/images/cat-spices.png"
                alt=""
                className="absolute top-8 left-1/2 -translate-x-1/2 w-20 h-20 object-contain drop-shadow-lg rotate-12 opacity-90 animate-bounce"
                style={{ animationDuration: '4s', animationDelay: '0s' }}
                aria-hidden="true"
              />

              {/* Floating ingredient: top-right (herbs/flowers) */}
              <img
                src="/images/cat-herbal-flowers.png"
                alt=""
                className="absolute top-12 right-0 w-28 h-28 object-contain drop-shadow-lg -rotate-6 opacity-90"
                style={{ animation: 'float 5s ease-in-out infinite', animationDelay: '1s' }}
                aria-hidden="true"
              />

              {/* Floating ingredient: bottom-right (ginger/turmeric) */}
              <img
                src="/images/cat-herbal.png"
                alt=""
                className="absolute bottom-16 right-2 w-24 h-24 object-contain drop-shadow-lg rotate-6 opacity-90"
                style={{ animation: 'float 6s ease-in-out infinite', animationDelay: '2s' }}
                aria-hidden="true"
              />

              {/* Floating ingredient: bottom-left (fruits) */}
              <img
                src="/images/cat-fruits.png"
                alt=""
                className="absolute bottom-12 left-0 w-20 h-20 object-contain drop-shadow-lg -rotate-12 opacity-90"
                style={{ animation: 'float 5.5s ease-in-out infinite', animationDelay: '0.5s' }}
                aria-hidden="true"
              />

              {/* Main Hero Image — large and centered */}
              <div className="relative z-10 w-full flex items-center justify-center px-4">
                <img
                  src="/images/hero-image.png"
                  alt="Ceylon Spices & Natural Products"
                  className="w-full object-contain drop-shadow-2xl transition-transform duration-700 hover:scale-[1.03]"
                  style={{ maxWidth: '680px', maxHeight: '75vh' }}
                />
              </div>

            </div>
          </div>
        </div>

        {/* Float keyframe via inline style tag */}
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(var(--rot, 0deg)); }
            50% { transform: translateY(-14px) rotate(var(--rot, 0deg)); }
          }
        `}</style>

      </section>


      {/* 2.5 Features / Trust Badges */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-30">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-4 divide-y md:divide-y-0 md:divide-x divide-gray-200">
          
          <div className="group flex items-center space-x-4 px-4 w-full md:w-1/4 pt-4 md:pt-0 first:pt-0 cursor-default">
            <div className="w-14 h-14 shrink-0 overflow-hidden rounded-full bg-gray-100 flex items-center justify-center transition-colors duration-300 group-hover:bg-cefi-green">
              <img src="/icon-truck.png" alt="Delivery Icon" className="w-8 h-8 object-contain transition-all duration-300 group-hover:brightness-0 group-hover:invert" />
            </div>
            <div>
              <h4 className="font-sans font-bold text-cefi-earth text-[13px] md:text-sm transition-colors group-hover:text-cefi-green">Worldwide Delivery</h4>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">Fresh products delivered across the globe.</p>
            </div>
          </div>

          <div className="group flex items-center space-x-4 px-4 w-full md:w-1/4 pt-4 md:pt-0 cursor-default">
            <div className="w-14 h-14 shrink-0 overflow-hidden rounded-full bg-gray-100 flex items-center justify-center transition-colors duration-300 group-hover:bg-cefi-green">
              <img src="/icon-award.png" alt="Award Icon" className="w-8 h-8 object-contain transition-all duration-300 group-hover:brightness-0 group-hover:invert" />
            </div>
            <div>
              <h4 className="font-sans font-bold text-cefi-earth text-[13px] md:text-sm transition-colors group-hover:text-cefi-green">Premium Quality</h4>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">Every product is quality-checked and sealed for freshness.</p>
            </div>
          </div>

          <div className="group flex items-center space-x-4 px-4 w-full md:w-1/4 pt-4 md:pt-0 cursor-default">
            <div className="w-14 h-14 shrink-0 overflow-hidden rounded-full bg-gray-100 flex items-center justify-center transition-colors duration-300 group-hover:bg-cefi-green">
              <img src="/icon-card.png" alt="Secure Checkout Icon" className="w-8 h-8 object-contain transition-all duration-300 group-hover:brightness-0 group-hover:invert" />
            </div>
            <div>
              <h4 className="font-sans font-bold text-cefi-earth text-[13px] md:text-sm transition-colors group-hover:text-cefi-green">Secure Checkout</h4>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">Trusted, secure and hassle-free payments.</p>
            </div>
          </div>

          <div className="group flex items-center space-x-4 px-4 w-full md:w-1/4 pt-4 md:pt-0 cursor-default">
            <div className="w-14 h-14 shrink-0 overflow-hidden rounded-full bg-gray-100 flex items-center justify-center transition-colors duration-300 group-hover:bg-cefi-green">
              <img src="/icon-headset.png" alt="Support Icon" className="w-8 h-8 object-contain transition-all duration-300 group-hover:brightness-0 group-hover:invert" />
            </div>
            <div>
              <h4 className="font-sans font-bold text-cefi-earth text-[13px] md:text-sm transition-colors group-hover:text-cefi-green">Real Support</h4>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">Friendly, human help available at all times.</p>
            </div>
          </div>

        </div>
      </section>

      {/* 3. "Explore our Collection" — Category Cards Row */}
      <Reveal as="section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-2 mb-10">
          <h2 className="font-serif font-bold text-3xl sm:text-4xl text-cefi-earth">
            Explore our Collection
          </h2>
          <p className="text-sm text-gray-500 font-sans">
            Premium quality in every category
          </p>
        </div>

        {/* Category Carousel Control Wrapper */}
        <div className="relative">
          {/* Navigation Arrows */}
          <button
            onClick={prevCategory}
            aria-label="Previous Category"
            className="absolute -left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-cefi-earth hover:bg-cefi-green text-white rounded-full flex items-center justify-center shadow-lg transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={nextCategory}
            aria-label="Next Category"
            className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-cefi-earth hover:bg-cefi-green text-white rounded-full flex items-center justify-center shadow-lg transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Grid of Categories */}
          <div className="overflow-hidden px-2">
            <div
              key={categoryScrollIndex}
              className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 ${
                carouselDirection === 'right' ? 'animate-enter-from-right' : 'animate-enter-from-left'
              }`}
            >
              {[0, 1, 2, 3].map((offset) => {
                if (categories.length === 0) return null;
                const cat = categories[(categoryScrollIndex + offset) % categories.length];
                // Use offset in key to prevent React from unmounting/remounting same items in different positions
                return <CategoryCard key={`${cat.id || cat.slug}-${offset}`} category={cat} />;
              })}
            </div>
          </div>
        </div>
      </Reveal>

      {/* Featured Products Showcase */}
      <Reveal as="section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-8 pb-4 border-b border-gray-200">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-cefi-gold">Handpicked Harvests</span>
            <h2 className="font-serif font-bold text-3xl text-cefi-earth mt-1">Featured Ceylon Products</h2>
          </div>
          <Link to="/products" className="mt-4 md:mt-0 text-sm font-semibold text-cefi-green hover:text-cefi-gold transition-colors flex items-center space-x-1">
            <span>View All Products</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.slice(0, 4).map((product, i) => (
            <Reveal key={product.id} delay={i * 90}>
              <ProductCard product={product} onOpenQuoteModal={onOpenQuoteModal} />
            </Reveal>
          ))}
        </div>
      </Reveal>

      {/* 4. "Our Story" Section */}
      <section className="bg-cefi-cream py-16 border-y border-cefi-cream-dark/60">
        <Reveal as="div" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            {/* Split Layout: Image Side */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white aspect-[4/3]">
              <img
                src="/images/our-story.jpg"
                alt="Ceylon Tea and Spice Plantations"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-cefi-green/80 via-transparent to-transparent flex items-end p-8">
                <div className="text-white space-y-1">
                  <span className="text-xs uppercase tracking-widest text-cefi-gold font-bold">Ceylon Heritage</span>
                  <p className="font-serif text-lg italic">"Nurtured by Ceylon's sunshine, mountain soil, and pristine rainwater."</p>
                </div>
              </div>
            </div>

            {/* Text Side */}
            <div className="space-y-6">
              <span className="text-sm font-serif font-bold text-cefi-gold italic">~ Our Story ~</span>
              
              <h2 className="font-serif font-bold text-3xl sm:text-4xl text-cefi-earth leading-tight">
                Sri Lanka's Trusted Name in Premium Natural Products
              </h2>

              <p className="text-sm text-cefi-earth/80 leading-relaxed font-sans">
                Ceylon Eco Fresh Infinity (Pvt) Ltd. (CEFI) is a specialized Sri Lankan enterprise dedicated to manufacturing, processing, and distributing high-grade Ceylon Tea, True Cinnamon, unadulterated Spices, Coconut derivatives, and Dehydrated Fruits.
              </p>

              <p className="text-sm text-cefi-earth/80 leading-relaxed font-sans">
                By maintaining direct partnerships with accredited outgrower farming communities across Sri Lanka's central highlands and southern spice belts, we ensure 100% traceability, ethical farmgate returns, and superior product integrity for international buyers and local retail customers alike.
              </p>

              {/* Feature Pills */}
              <div className="flex flex-wrap gap-3 pt-2">
                <span className="px-4 py-2 bg-white border border-cefi-green/20 rounded-full text-xs font-bold text-cefi-green shadow-xs">
                  ✓ Export-Ready Quality
                </span>
                <span className="px-4 py-2 bg-white border border-cefi-green/20 rounded-full text-xs font-bold text-cefi-green shadow-xs">
                  ✓ Wholesale & Retail Supply
                </span>
                <span className="px-4 py-2 bg-white border border-cefi-green/20 rounded-full text-xs font-bold text-cefi-green shadow-xs">
                  ✓ Sustainable Sourcing
                </span>
              </div>

              <div className="pt-4">
                <Link
                  to="/about"
                  className="inline-flex items-center space-x-2 px-7 py-3 bg-cefi-green hover:bg-cefi-green-dark text-white rounded-full font-serif font-semibold text-sm shadow-md transition-all"
                >
                  <span>Learn More About CEFI</span>
                  <ArrowRight className="w-4 h-4 text-cefi-gold" />
                </Link>
              </div>
            </div>

          </div>
        </Reveal>
      </section>

      {/* 5. Why Choose CEFI Section */}
      <Reveal as="section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-cefi-gold">The CEFI Advantage</span>
          <h2 className="font-serif font-bold text-3xl text-cefi-earth mt-1">Why Choose CEFI?</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

          <Reveal delay={0} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-soft text-center space-y-3">
            <div className="w-14 h-14 bg-cefi-green/10 text-cefi-green rounded-2xl flex items-center justify-center mx-auto">
              <Award className="w-7 h-7" />
            </div>
            <h3 className="font-serif font-bold text-lg text-cefi-earth">Premium Sri Lankan Origin</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Authentic Single-Origin Ceylon tea and True Cinnamon grown in Sri Lanka's unique soil microclimates.
            </p>
          </Reveal>

          <Reveal delay={90} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-soft text-center space-y-3">
            <div className="w-14 h-14 bg-cefi-green/10 text-cefi-green rounded-2xl flex items-center justify-center mx-auto">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="font-serif font-bold text-lg text-cefi-earth">Strict Quality Control</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              HACCP & ISO 22000 compliant processing facilities ensuring zero contamination and maximum freshness.
            </p>
          </Reveal>

          <Reveal delay={180} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-soft text-center space-y-3">
            <div className="w-14 h-14 bg-cefi-green/10 text-cefi-green rounded-2xl flex items-center justify-center mx-auto">
              <Truck className="w-7 h-7" />
            </div>
            <h3 className="font-serif font-bold text-lg text-cefi-earth">Reliable Supply Chain</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Guaranteed year-round inventory dispatch for retail distributors and bulk export buyers worldwide.
            </p>
          </Reveal>

          <Reveal delay={270} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-soft text-center space-y-3">
            <div className="w-14 h-14 bg-cefi-green/10 text-cefi-green rounded-2xl flex items-center justify-center mx-auto">
              <RefreshCw className="w-7 h-7" />
            </div>
            <h3 className="font-serif font-bold text-lg text-cefi-earth">Export-Ready Solutions</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Custom OEM private labeling, bulk vacuum packaging, and complete customs export documentation.
            </p>
          </Reveal>

        </div>
      </Reveal>

      {/* 6. Newsletter / "Join the List" Band (Matching Reference Image 3) */}
      <Reveal as="section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-cefi-earth rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-2xl border border-cefi-gold/20">

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">

            {/* Left Image (Matching rounded product bowl dish layout from reference) */}
            <div className="lg:col-span-4 flex justify-center">
              <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full p-2 bg-white/10 backdrop-blur-md border-2 border-cefi-gold/40 shadow-xl overflow-hidden animate-float">
                <img
                  src="https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80"
                  alt="Join CEFI Inner Circle"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
            </div>

            {/* Right Text & Email Form */}
            <div className="lg:col-span-8 space-y-4 text-center lg:text-left">
              <h2 className="font-serif font-bold text-3xl sm:text-4xl text-white">
                Join the list
              </h2>
              <p className="text-sm text-emerald-100/80 max-w-lg font-sans">
                Be the first to hear about new seasonal harvest arrivals, export market offers, and limited artisan tea batches.
              </p>

              {newsletterSubscribed ? (
                <div className="inline-flex items-center space-x-2 bg-emerald-900/80 text-cefi-gold px-6 py-3 rounded-full text-sm font-semibold border border-cefi-gold/40">
                  <CheckCircle2 className="w-5 h-5 text-cefi-gold" />
                  <span>You are subscribed to CEFI export & harvest updates!</span>
                </div>
              ) : (
                <form onSubmit={handleNewsletter} className="pt-2 flex flex-col sm:flex-row items-center gap-3 max-w-md mx-auto lg:mx-0">
                  <input
                    type="email"
                    required
                    placeholder="Enter your email address"
                    value={newsletterEmail}
                    onChange={e => setNewsletterEmail(e.target.value)}
                    className="w-full px-5 py-3.5 rounded-full bg-white/10 border border-white/20 text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-cefi-gold"
                  />
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-8 py-3.5 bg-cefi-green hover:bg-cefi-green-light text-white rounded-full font-serif font-bold text-sm shadow-md transition-all shrink-0"
                  >
                    Subscribe
                  </button>
                </form>
              )}
            </div>

          </div>

        </div>
      </Reveal>

    </div>
  );
}
