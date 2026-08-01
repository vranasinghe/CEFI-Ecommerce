import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Facebook, Instagram, Linkedin, Send, ShieldCheck, Award, Truck } from 'lucide-react';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (email) {
      try {
        await fetch('/api/newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
      } catch (e) {
        // ignore
      }
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <footer className="bg-cefi-green-dark text-emerald-100 pt-16 pb-8 border-t border-emerald-900">
      
      {/* Top Value Proposition Badges */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 mb-12 border-b border-emerald-800/60">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-cefi-gold/20 rounded-2xl shrink-0">
              <Award className="w-6 h-6 text-cefi-gold" />
            </div>
            <div>
              <h4 className="font-serif font-bold text-white text-base">Export-Ready Quality</h4>
              <p className="text-xs text-emerald-200/80">Certified ISO 22000 & HACCP processing standards</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="p-3 bg-cefi-gold/20 rounded-2xl shrink-0">
              <Truck className="w-6 h-6 text-cefi-gold" />
            </div>
            <div>
              <h4 className="font-serif font-bold text-white text-base">Global Port Logistics</h4>
              <p className="text-xs text-emerald-200/80">FOB & CIF shipping from Colombo Port to 40+ countries</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="p-3 bg-cefi-gold/20 rounded-2xl shrink-0">
              <ShieldCheck className="w-6 h-6 text-cefi-gold" />
            </div>
            <div>
              <h4 className="font-serif font-bold text-white text-base">100% Pure Ceylon Origin</h4>
              <p className="text-xs text-emerald-200/80">Ethically sourced from accredited smallholder farms</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main 4-Column Footer Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        
        {/* Column 1: Brand & Tagline */}
        <div className="space-y-4">
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-cefi-green p-1.5 border-2 border-cefi-gold flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full text-cefi-gold fill-current">
                <path d="M 50,10 A 40,40 0 1,0 90,50 A 30,30 0 1,1 50,10 Z" fill="#C9971C" />
                <path d="M48 78 L52 78 L51 45 L49 45 Z" fill="#FFFFFF" />
                <path d="M50 45 C40 35 25 35 20 40 C30 45 42 45 50 47 C58 45 70 45 80 40 C75 35 60 35 50 45 Z" fill="#FFFFFF" />
              </svg>
            </div>
            <div>
              <span className="font-serif text-2xl font-bold text-white tracking-tight">Cefi</span>
              <span className="block text-[9px] uppercase tracking-widest text-cefi-gold font-semibold">Ceylon Eco Fresh</span>
            </div>
          </Link>

          <p className="text-xs text-emerald-200/80 leading-relaxed font-sans">
            Ceylon Eco Fresh Infinity (Pvt) Ltd. (CEFI) is a premier Sri Lankan producer, processor, and exporter of pure Ceylon tea, spices, herbs, dried fruits, and agricultural produce.
          </p>

          <div className="pt-2">
            <p className="text-xs font-serif italic text-cefi-gold">"Rooted in Ceylon, Grown for the World."</p>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <a href="#" className="p-2 bg-emerald-900/60 hover:bg-cefi-gold hover:text-cefi-earth rounded-full transition-colors text-white">
              <Facebook className="w-4 h-4" />
            </a>
            <a href="#" className="p-2 bg-emerald-900/60 hover:bg-cefi-gold hover:text-cefi-earth rounded-full transition-colors text-white">
              <Instagram className="w-4 h-4" />
            </a>
            <a href="#" className="p-2 bg-emerald-900/60 hover:bg-cefi-gold hover:text-cefi-earth rounded-full transition-colors text-white">
              <Linkedin className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Column 2: Shop Categories */}
        <div>
          <h4 className="font-serif text-base font-bold text-white mb-4 border-b border-cefi-gold/40 pb-2 inline-block">
            Shop Collections
          </h4>
          <ul className="space-y-2.5 text-xs text-emerald-200/80">
            <li>
              <Link to="/products/herbal" className="hover:text-cefi-gold transition-colors flex items-center">
                <span className="mr-1 text-cefi-gold">›</span> Herbal & Wellness Infusions
              </Link>
            </li>
            <li>
              <Link to="/products/tea" className="hover:text-cefi-gold transition-colors flex items-center">
                <span className="mr-1 text-cefi-gold">›</span> Pure Ceylon Artisan Tea
              </Link>
            </li>
            <li>
              <Link to="/products/spices" className="hover:text-cefi-gold transition-colors flex items-center">
                <span className="mr-1 text-cefi-gold">›</span> True Ceylon Spices & Cinnamon
              </Link>
            </li>
            <li>
              <Link to="/products/fruits" className="hover:text-cefi-gold transition-colors flex items-center">
                <span className="mr-1 text-cefi-gold">›</span> Solar Dried Tropical Fruits
              </Link>
            </li>
            <li>
              <Link to="/products/vegetables" className="hover:text-cefi-gold transition-colors flex items-center">
                <span className="mr-1 text-cefi-gold">›</span> Agricultural Produce & Jackfruit
              </Link>
            </li>
            <li>
              <Link to="/products?wholesale=true" className="text-cefi-gold hover:underline font-semibold flex items-center pt-1">
                <span className="mr-1">★</span> Wholesale & Export Bulk Portfolio
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 3: Company */}
        <div>
          <h4 className="font-serif text-base font-bold text-white mb-4 border-b border-cefi-gold/40 pb-2 inline-block">
            Company & Policies
          </h4>
          <ul className="space-y-2.5 text-xs text-emerald-200/80">
            <li>
              <Link to="/about" className="hover:text-cefi-gold transition-colors">About CEFI Profile</Link>
            </li>
            <li>
              <Link to="/about#sustainability" className="hover:text-cefi-gold transition-colors">Sustainability & Outgrowers</Link>
            </li>
            <li>
              <Link to="/blog" className="hover:text-cefi-gold transition-colors">CEFI Trade & Quality Blog</Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-cefi-gold transition-colors">Export Quote Inquiry</Link>
            </li>
            <li>
              <a href="#" className="hover:text-cefi-gold transition-colors">Shipping & Export Policy</a>
            </li>
            <li>
              <a href="#" className="hover:text-cefi-gold transition-colors">Terms & International Conditions</a>
            </li>
          </ul>
        </div>

        {/* Column 4: Stay Connected & Newsletter */}
        <div className="space-y-4">
          <h4 className="font-serif text-base font-bold text-white mb-4 border-b border-cefi-gold/40 pb-2 inline-block">
            Stay Connected
          </h4>

          <div className="space-y-2.5 text-xs text-emerald-200/80">
            <div className="flex items-start space-x-2.5">
              <MapPin className="w-4 h-4 text-cefi-gold shrink-0 mt-0.5" />
              <span>No. 147, Havelock Rd, Colombo 05, Sri Lanka</span>
            </div>
            <div className="flex items-center space-x-2.5">
              <Phone className="w-4 h-4 text-cefi-gold shrink-0" />
              <span>+94 11 727 1692 / +94 77 727 1692</span>
            </div>
            <div className="flex items-center space-x-2.5">
              <Mail className="w-4 h-4 text-cefi-gold shrink-0" />
              <span>info@cefi.lk / export@cefi.lk</span>
            </div>
          </div>

          {/* Small newsletter form */}
          <div className="pt-2">
            <p className="text-xs text-emerald-200/90 mb-2 font-medium">Subscribe for Export Catalog Updates:</p>
            {subscribed ? (
              <p className="text-xs text-cefi-gold font-semibold bg-emerald-900/60 p-2 rounded-lg">
                ✓ Thank you for subscribing!
              </p>
            ) : (
              <form onSubmit={handleSubscribe} className="flex items-center space-x-1.5">
                <input
                  type="email"
                  required
                  placeholder="Enter email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-emerald-900/80 border border-emerald-700 text-xs text-white placeholder-emerald-400 focus:outline-none focus:border-cefi-gold"
                />
                <button
                  type="submit"
                  className="p-2 bg-cefi-gold hover:bg-cefi-gold-light text-cefi-earth rounded-lg transition-colors shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            )}
          </div>
        </div>

      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-6 border-t border-emerald-900 flex flex-col md:flex-row items-center justify-between text-xs text-emerald-300/60 space-y-4 md:space-y-0">
        <div>
          © {new Date().getFullYear()} Ceylon Eco Fresh Infinity (Pvt) Ltd. All rights reserved.
        </div>

        {/* Payment Badges */}
        <div className="flex items-center space-x-3 bg-emerald-900/40 px-4 py-1.5 rounded-full border border-emerald-800">
          <span className="text-[10px] uppercase font-bold text-cefi-gold">Accepted Payments:</span>
          <span className="font-semibold text-white">PayHere</span>
          <span>•</span>
          <span className="font-semibold text-white">Visa</span>
          <span>•</span>
          <span className="font-semibold text-white">Mastercard</span>
          <span>•</span>
          <span className="font-semibold text-white">L/C Wire Transfer</span>
        </div>
      </div>

    </footer>
  );
}
