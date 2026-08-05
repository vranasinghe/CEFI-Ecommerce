import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Search, ShoppingBag, User, ChevronDown, Menu, X, Globe, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function Header({ onOpenQuoteModal }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { cartCount, setIsCartOpen } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const categories = [
    { name: 'Herbal & Wellness', slug: 'herbal', desc: 'Ayurvedic leaves & infusions' },
    { name: 'Pure Ceylon Tea', slug: 'tea', desc: 'Highland black, green & silver needle' },
    { name: 'Ceylon Spices', slug: 'spices', desc: 'True Cinnamon, cardamom & pepper' },
    { name: 'Tropical Dried Fruits', slug: 'fruits', desc: 'Solar dried mango & pineapple' },
    { name: 'Agro Vegetables', slug: 'vegetables', desc: 'Dehydrated jackfruit & farm produce' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <>
      {/* Top Banner (Export & Quality notice) */}
      <div className="bg-cefi-green-dark text-emerald-100 text-xs py-1 px-4 text-center border-b border-emerald-900 flex items-center justify-center space-x-2">
        <Sparkles className="w-3 h-3 text-cefi-gold animate-pulse" />
        <span>Rooted in Ceylon, Grown for the World — Premium Wholesale & Retail Export Dispatch</span>
        <button 
          onClick={onOpenQuoteModal} 
          className="underline font-semibold hover:text-cefi-gold ml-2 transition-colors cursor-pointer"
        >
          Request Export Quote →
        </button>
      </div>

      {/* Main Sticky Header */}
      <header className={`sticky top-0 z-40 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-md shadow-md py-1 border-b border-gray-100' 
          : 'bg-cefi-cream/90 backdrop-blur-sm py-2 border-b border-cefi-cream-dark'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          
          {/* Brand Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            {/* Logo Mark */}
            <div className="relative w-16 h-16 transform group-hover:scale-110 transition-transform duration-300 drop-shadow-xl">
              <img src="/logo.png" alt="CEFI Logo" className="w-full h-full object-contain" style={{ filter: 'drop-shadow(0 2px 8px rgba(31,83,46,0.35))' }} />
            </div>
            
            {/* Wordmark Image */}
            <div className="relative h-12 w-56 sm:w-64 transform group-hover:scale-[1.03] transition-transform duration-300">
              <img src="/logo-text.png" alt="CEFI Wordmark" className="w-full h-full object-contain object-left" style={{ filter: 'drop-shadow(0 1px 4px rgba(31,83,46,0.2))' }} />
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-cefi-earth">
            <NavLink 
              to="/" 
              className={({ isActive }) => isActive ? 'text-cefi-green font-bold' : 'hover:text-cefi-green transition-colors'}
            >
              Home
            </NavLink>

            {/* Products Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setCategoryDropdownOpen(true)}
              onMouseLeave={() => setCategoryDropdownOpen(false)}
            >
              <NavLink 
                to="/products"
                className={({ isActive }) => `flex items-center space-x-1 py-1 ${
                  isActive ? 'text-cefi-green font-bold' : 'hover:text-cefi-green transition-colors'
                }`}
              >
                <span>Products</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${categoryDropdownOpen ? 'rotate-180 text-cefi-gold' : ''}`} />
              </NavLink>

              {/* Dropdown Menu */}
              {categoryDropdownOpen && (
                <div className="absolute top-full left-0 w-72 bg-white rounded-xl shadow-xl border border-gray-100 py-3 px-2 z-50 animate-fade-in">
                  <div className="px-3 py-1.5 border-b border-gray-100 mb-1 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-cefi-gold">Categories</span>
                    <Link to="/products" className="text-xs text-cefi-green hover:underline">All Products →</Link>
                  </div>
                  {categories.map((cat) => (
                    <Link
                      key={cat.slug}
                      to={`/products/${cat.slug}`}
                      className="block px-3 py-2 rounded-lg hover:bg-cefi-cream transition-colors group"
                      onClick={() => setCategoryDropdownOpen(false)}
                    >
                      <div className="font-serif font-semibold text-cefi-green group-hover:text-cefi-gold transition-colors">
                        {cat.name}
                      </div>
                      <div className="text-xs text-gray-500 font-normal">
                        {cat.desc}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <NavLink 
              to="/about" 
              className={({ isActive }) => isActive ? 'text-cefi-green font-bold border-b-2 border-cefi-gold pb-0.5' : 'hover:text-cefi-green transition-colors'}
            >
              About Us
            </NavLink>

            <NavLink 
              to="/contact" 
              className={({ isActive }) => isActive ? 'text-cefi-green font-bold border-b-2 border-cefi-gold pb-0.5' : 'hover:text-cefi-green transition-colors'}
            >
              Contact Us
            </NavLink>

            <NavLink 
              to="/blog" 
              className={({ isActive }) => isActive ? 'text-cefi-green font-bold border-b-2 border-cefi-gold pb-0.5' : 'hover:text-cefi-green transition-colors'}
            >
              Blog
            </NavLink>
          </nav>

          {/* Right Icons */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* Search Trigger */}
            <button 
              onClick={() => setSearchOpen(!searchOpen)}
              aria-label="Search Products"
              className="hidden md:block p-2 text-cefi-earth hover:text-cefi-green hover:bg-cefi-cream rounded-md border border-gray-200 transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* User Account */}
            <Link 
              to="/account" 
              aria-label="User Account"
              className="hidden md:flex p-2 text-cefi-earth hover:text-cefi-green hover:bg-cefi-cream rounded-md border border-gray-200 transition-colors relative items-center justify-center"
            >
              <User className="w-5 h-5" />
              {user && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full"></span>
              )}
            </Link>

            {/* Shopping Cart Drawer Trigger */}
            <button 
              onClick={() => setIsCartOpen(true)}
              aria-label="Shopping Cart"
              className="p-2 text-cefi-earth hover:text-cefi-green hover:bg-cefi-cream rounded-md border border-gray-200 transition-colors relative"
            >
              <ShoppingBag className="w-5 h-5 text-cefi-green" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-cefi-gold text-cefi-earth font-bold text-[11px] w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Wholesale Quote Pill CTA Button */}
            <button
              onClick={onOpenQuoteModal}
              className="hidden lg:flex items-center space-x-1.5 bg-cefi-green hover:bg-cefi-green-dark text-white px-4 py-2 rounded-full text-xs font-semibold shadow-sm transition-all hover:shadow-md"
            >
              <Globe className="w-3.5 h-3.5 text-cefi-gold" />
              <span>Request Quote</span>
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-cefi-earth hover:text-cefi-green hover:bg-cefi-cream rounded-md border border-gray-200 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>

        {/* Search Bar Overlay */}
        {searchOpen && (
          <div className="max-w-7xl mx-auto px-4 py-3 border-t border-gray-100 bg-white animate-fade-in">
            <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2">
              <Search className="w-5 h-5 text-cefi-gold" />
              <input
                type="text"
                autoFocus
                placeholder="Search Ceylon Tea, Cinnamon, Spices, Herbal Elixirs, Dried Mango..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-sm border-none focus:outline-none focus:ring-0 text-cefi-earth placeholder-gray-400 py-1"
              />
              <button 
                type="submit"
                className="px-4 py-1.5 bg-cefi-green text-white text-xs font-semibold rounded-full hover:bg-cefi-green-dark"
              >
                Search
              </button>
            </form>
          </div>
        )}

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-gray-200 px-4 pt-3 pb-6 space-y-3 animate-fade-in">
            {/* Mobile Search Bar */}
            <div className="py-2 mb-2">
              <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full text-sm bg-transparent border-none focus:outline-none focus:ring-0 text-cefi-earth placeholder-gray-400 py-1"
                />
              </form>
            </div>

            <NavLink to="/" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-base font-semibold border-b border-gray-100">
              Home
            </NavLink>
            
            <div className="py-2 border-b border-gray-100">
              <span className="block text-xs font-bold uppercase text-cefi-gold mb-2">Categories</span>
              <div className="grid grid-cols-2 gap-2 pl-2">
                {categories.map(cat => (
                  <Link
                    key={cat.slug}
                    to={`/products/${cat.slug}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm py-1 text-cefi-earth hover:text-cefi-green"
                  >
                    • {cat.name}
                  </Link>
                ))}
              </div>
            </div>

            <NavLink to="/products" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-base font-semibold border-b border-gray-100">
              All Products
            </NavLink>
            <NavLink to="/about" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-base font-semibold border-b border-gray-100">
              About Us
            </NavLink>
            <NavLink to="/contact" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-base font-semibold border-b border-gray-100">
              Contact Us
            </NavLink>
            <NavLink to="/blog" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-base font-semibold border-b border-gray-100">
              Blog
            </NavLink>
            <NavLink to="/account" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-base font-semibold">
              My Account
            </NavLink>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenQuoteModal();
              }}
              className="w-full mt-2 bg-cefi-green text-white py-2.5 rounded-full font-semibold text-sm flex items-center justify-center space-x-2"
            >
              <Globe className="w-4 h-4 text-cefi-gold" />
              <span>Wholesale & Export Inquiry</span>
            </button>
          </div>
        )}
      </header>
    </>
  );
}
