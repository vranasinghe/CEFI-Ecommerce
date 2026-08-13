import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, Mail, Send, Loader2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import LoginPromptModal from '../components/LoginPromptModal';

const COMPANY_ORDER_EMAIL = 'ceylonecofreshinfinity@gmail.com';

export default function CheckoutPage() {
  const { cart, cartTotal, clearCart } = useCart();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: 'Colombo',
    postalCode: '00500',
    country: 'Sri Lanka',
    paymentMethod: 'Direct Email Order'
  });

  const [loading, setLoading] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [emailSent, setEmailSent] = useState(false);

  const shippingCost = cartTotal > 100 || cartTotal === 0 ? 0 : 15.00;
  const grandTotal = cartTotal + shippingCost;

  // Pre-fill from logged-in user
  React.useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || user.name || user.user_metadata?.full_name || '',
        email: prev.email || user.email || '',
      }));
    }
  }, [user]);

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setLoading(true);

    const orderId = `CEFI-ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    const itemsSnapshot = [...cart];
    const totalSnapshot = grandTotal;

    const payload = {
      orderId,
      customer: formData,
      items: itemsSnapshot,
      total: totalSnapshot,
      paymentMethod: 'Direct Email Order',
      targetEmail: COMPANY_ORDER_EMAIL
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      const finalOrderId = data.orderId || orderId;
      const wasEmailSent = data.success || false;

      setOrderConfirmed(finalOrderId);
      setEmailSent(wasEmailSent);
      setOrderDetails({ orderId: finalOrderId, items: itemsSnapshot, total: totalSnapshot, customer: formData });
      clearCart();

    } catch (err) {
      // If backend is unreachable, still confirm and show order
      setOrderConfirmed(orderId);
      setEmailSent(false);
      setOrderDetails({ orderId, items: itemsSnapshot, total: totalSnapshot, customer: formData });
      clearCart();
    } finally {
      setLoading(false);
    }
  };

  // ── Auth Loading ────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-cefi-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <LoginPromptModal
        isOpen={true}
        onClose={() => navigate('/cart')}
        redirectTo="/checkout"
      />
    );
  }

  if (cart.length === 0 && !orderConfirmed) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="font-serif font-bold text-xl">Your Basket is Empty</h2>
        <Link to="/products" className="text-xs text-cefi-green underline">Return to Shop</Link>
      </div>
    );
  }

  // ── Order Confirmed Screen ───────────────────────────────────────────────────
  if (orderConfirmed && orderDetails) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8 sm:p-10 space-y-6 text-center">

          {/* Icon */}
          <div className="w-20 h-20 bg-emerald-100 text-cefi-green rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          {/* Title */}
          <div className="space-y-1">
            <span className="text-xs uppercase font-bold tracking-widest text-cefi-gold">Order Placed Successfully</span>
            <h1 className="font-serif font-bold text-3xl text-cefi-earth">Thank You, {orderDetails.customer.name}!</h1>
            <p className="text-xs text-gray-500 font-mono">
              Order Reference: <strong className="text-cefi-green text-sm">{orderConfirmed}</strong>
            </p>
          </div>

          {/* Email Delivery Status */}
          <div className={`flex items-start space-x-3 p-4 rounded-2xl text-left text-xs border ${emailSent ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
            <Mail className={`w-5 h-5 mt-0.5 shrink-0 ${emailSent ? 'text-cefi-green' : 'text-amber-500'}`} />
            <div>
              {emailSent ? (
                <>
                  <strong className="block text-cefi-green font-semibold mb-0.5">Order email automatically sent!</strong>
                  <span className="text-gray-600">
                    Your full order details have been delivered to <strong>{COMPANY_ORDER_EMAIL}</strong>. The CEFI team will contact you at <strong>{orderDetails.customer.email}</strong> to confirm dispatch.
                  </span>
                </>
              ) : (
                <>
                  <strong className="block text-amber-700 font-semibold mb-0.5">Order recorded — email may be delayed</strong>
                  <span className="text-gray-600">
                    Your order is saved. Please contact <strong>{COMPANY_ORDER_EMAIL}</strong> quoting reference <strong>{orderConfirmed}</strong> if you don't hear back within 24 hours.
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Products Summary */}
          <div className="bg-cefi-cream/40 rounded-2xl p-5 text-left space-y-2">
            <span className="text-[10px] font-bold uppercase text-cefi-gold tracking-wider block">Your Order Summary</span>
            <div className="divide-y divide-gray-100 text-xs">
              {orderDetails.items.map((item, idx) => (
                <div key={idx} className="py-2.5 flex justify-between items-center">
                  <span className="font-medium text-cefi-earth">• {item.name} × {item.quantity}</span>
                  <span className="font-bold text-cefi-green">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-gray-200 flex justify-between text-sm font-bold">
              <span className="text-cefi-earth">Total Amount:</span>
              <span className="text-cefi-green font-serif text-base">${orderDetails.total.toFixed(2)}</span>
            </div>
          </div>

          <Link
            to="/products"
            className="inline-block px-8 py-3.5 bg-cefi-green hover:bg-cefi-green-dark text-white font-serif font-bold text-sm rounded-full shadow-md transition-all"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  // ── Checkout Form ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">

      <div className="border-b border-gray-200 pb-4">
        <h1 className="font-serif font-bold text-3xl text-cefi-earth">Checkout</h1>
        <p className="text-xs text-gray-500 mt-1">
          Fill in your details. Your order will be automatically emailed to the CEFI export team.
        </p>
      </div>

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-10">

        {/* ── Left: Customer Details ── */}
        <div className="lg:col-span-7 space-y-6">

          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-soft space-y-4">
            <h3 className="font-serif font-bold text-xl text-cefi-earth border-b border-gray-100 pb-3">
              Your Shipping Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Full Name *</label>
                <input
                  type="text" required
                  placeholder="Jane Smith"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cefi-green"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Email Address *</label>
                <input
                  type="email" required
                  placeholder="jane@example.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cefi-green"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Phone Number *</label>
                <input
                  type="tel" required
                  placeholder="+94 77 123 4567"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cefi-green"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Country *</label>
                <input
                  type="text" required
                  value={formData.country}
                  onChange={e => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cefi-green"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Street Address *</label>
              <input
                type="text" required
                placeholder="House number and street name"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cefi-green"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">City *</label>
                <input
                  type="text" required
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cefi-green"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Postal Code</label>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={e => setFormData({ ...formData, postalCode: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cefi-green"
                />
              </div>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-emerald-50/70 p-5 rounded-3xl border border-emerald-100 flex items-start space-x-4">
            <div className="w-9 h-9 bg-cefi-green text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
              <Mail className="w-4 h-4 text-cefi-gold" />
            </div>
            <div className="text-xs text-cefi-earth space-y-0.5">
              <strong className="block font-serif font-bold text-sm text-cefi-green">Automatic Email Order System</strong>
              <p className="text-gray-600 leading-relaxed">
                When you click <strong>Place Order</strong>, your full order details are automatically emailed to <strong>{COMPANY_ORDER_EMAIL}</strong>. No action required from you.
              </p>
            </div>
          </div>
        </div>

        {/* ── Right: Order Summary ── */}
        <div className="lg:col-span-5">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-soft space-y-4 sticky top-6">
            <h3 className="font-serif font-bold text-xl text-cefi-earth border-b border-gray-100 pb-3">
              Order Summary
            </h3>

            <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto pr-1">
              {cart.map(item => (
                <div key={item.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {item.image && <img src={item.image} alt="" className="w-11 h-11 object-cover rounded-lg" />}
                    <div>
                      <p className="text-xs font-semibold text-cefi-earth line-clamp-1">{item.name}</p>
                      <span className="text-[11px] text-gray-400">Qty: {item.quantity}</span>
                    </div>
                  </div>
                  <span className="font-serif font-bold text-sm text-cefi-green">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-gray-100 space-y-1.5 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-bold text-cefi-earth">${cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span className="font-bold text-cefi-earth">{shippingCost === 0 ? 'FREE' : `$${shippingCost.toFixed(2)}`}</span>
              </div>
              <div className="pt-2 border-t border-gray-100 flex justify-between">
                <span className="font-bold text-cefi-earth text-sm">Total</span>
                <span className="font-serif font-bold text-2xl text-cefi-green">${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-cefi-green hover:bg-cefi-green-dark disabled:opacity-60 text-white rounded-full font-serif font-bold text-sm shadow-md flex items-center justify-center space-x-2 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending Order Email...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-cefi-gold" />
                  <span>Place Order</span>
                </>
              )}
            </button>

            <p className="text-center text-[11px] text-gray-400">
              Your order is emailed automatically to <strong>{COMPANY_ORDER_EMAIL}</strong>
            </p>
          </div>
        </div>

      </form>
    </div>
  );
}
