import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import QuoteModal from './components/QuoteModal';

// Context Providers
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { trackPageView } from './utils/analytics';

// Pages
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import BlogPage from './pages/BlogPage';
import BlogPostPage from './pages/BlogPostPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import AccountPage from './pages/AccountPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminProductForm from './pages/AdminProductForm';

// Scroll To Top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    trackPageView(pathname);
  }, [pathname]);
  return null;
}

export default function App() {
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [selectedQuoteProduct, setSelectedQuoteProduct] = useState('');

  const handleOpenQuoteModal = (productName = '') => {
    setSelectedQuoteProduct(productName || 'Ceylon Spices & Tea Portfolio');
    setQuoteModalOpen(true);
  };

  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <ScrollToTop />
          <div className="min-h-screen flex flex-col justify-between bg-cefi-cream text-cefi-earth">
            
            {/* Header / Navigation Bar */}
            <Header onOpenQuoteModal={handleOpenQuoteModal} />

            {/* Main Page Routes */}
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage onOpenQuoteModal={handleOpenQuoteModal} />} />
                <Route path="/products" element={<ProductsPage onOpenQuoteModal={handleOpenQuoteModal} />} />
                <Route path="/products/:category" element={<ProductsPage onOpenQuoteModal={handleOpenQuoteModal} />} />
                <Route path="/products/:category/:slug" element={<ProductDetailPage onOpenQuoteModal={handleOpenQuoteModal} />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/blog/:slug" element={<BlogPostPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/account" element={<AccountPage />} />
                
                {/* Admin Routes - full screen, no header/footer */}
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/products/new" element={<AdminProductForm mode="add" />} />
                <Route path="/admin/products/edit/:id" element={<AdminProductForm mode="edit" />} />
              </Routes>
            </main>

            {/* Footer */}
            <Footer />

            {/* Slide-over Cart Drawer */}
            <CartDrawer />

            {/* Wholesale / Export Quote Modal */}
            <QuoteModal
              isOpen={quoteModalOpen}
              onClose={() => setQuoteModalOpen(false)}
              initialProduct={selectedQuoteProduct}
            />

          </div>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
