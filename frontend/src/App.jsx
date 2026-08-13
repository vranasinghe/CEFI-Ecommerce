import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import QuoteModal from './components/QuoteModal';

// Context Providers
import { CartProvider } from './context/CartContext';
import { AuthProvider, useAuth } from './context/AuthContext';
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
import AuthCallbackPage from './pages/AuthCallbackPage';

// Scroll To Top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    trackPageView(pathname);
  }, [pathname]);
  return null;
}

function MainLayout({ onOpenQuoteModal, quoteModalOpen, setQuoteModalOpen, selectedQuoteProduct }) {
  const { pathname } = useLocation();
  const { user } = useAuth();

  // Hide customer Header/Footer on Admin routes
  const isAdminRoute = pathname.startsWith('/admin');

  return (
    <div className="min-h-screen flex flex-col justify-between bg-cefi-cream text-cefi-earth w-full overflow-x-hidden">
      {/* Show Customer Header only on non-admin routes */}
      {!isAdminRoute && <Header onOpenQuoteModal={onOpenQuoteModal} />}

      {/* Main Page Routes */}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage onOpenQuoteModal={onOpenQuoteModal} />} />
          <Route path="/products" element={<ProductsPage onOpenQuoteModal={onOpenQuoteModal} />} />
          <Route path="/products/:category" element={<ProductsPage onOpenQuoteModal={onOpenQuoteModal} />} />
          <Route path="/products/:category/:slug" element={<ProductDetailPage onOpenQuoteModal={onOpenQuoteModal} />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/account" element={<AccountPage />} />
          
          {/* OAuth Callback */}
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          {/* Admin Routes - full screen Admin Portal */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/products/new" element={<AdminProductForm mode="add" />} />
          <Route path="/admin/products/edit/:id" element={<AdminProductForm mode="edit" />} />
        </Routes>
      </main>

      {/* Show Customer Footer only on non-admin routes */}
      {!isAdminRoute && <Footer />}

      {/* Slide-over Cart Drawer & Quote Modal */}
      {!isAdminRoute && <CartDrawer />}

      <QuoteModal
        isOpen={quoteModalOpen}
        onClose={() => setQuoteModalOpen(false)}
        initialProduct={selectedQuoteProduct}
      />
    </div>
  );
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
          <MainLayout
            onOpenQuoteModal={handleOpenQuoteModal}
            quoteModalOpen={quoteModalOpen}
            setQuoteModalOpen={setQuoteModalOpen}
            selectedQuoteProduct={selectedQuoteProduct}
          />
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
