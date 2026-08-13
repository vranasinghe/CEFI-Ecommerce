import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, Mail, Send, Truck, ArrowRight, ExternalLink } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import LoginPromptModal from '../components/LoginPromptModal';
import { trackCheckoutStart } from '../utils/analytics';

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
  const [confirmedOrderDetails, setConfirmedOrderDetails] = useState(null);

  const shippingCost = cartTotal > 100 || cartTotal === 0 ? 0 : 15.00;
  const grandTotal = cartTotal + shippingCost;

  // Pre-fill form with user data once auth is ready
  React.useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || user.name || '',
        email: prev.email || user.email || '',
      }));
    }
  }, [user]);

  React.useEffect(() => {
    if (cart.length > 0) {
      trackCheckoutStart(cart, grandTotal);
    }
  }, []);

  const generateMailtoLink = (orderId, customerData, cartItems, totalAmount) => {
    const subject = encodeURIComponent(`New Order Request [${orderId}] - ${customerData.name}`);
    
    const itemsListText = cartItems
      .map(item => `• ${item.name} | Qty: ${item.quantity} | Price: $${(item.price * item.quantity).toFixed(2)}`)
      .join('\n');

    const bodyText = encodeURIComponent(
`DEAR CEFI EXPORT TEAM,

I WOULD LIKE TO PLACE THE FOLLOWING ORDER:

--------------------------------------------------
ORDER REFERENCE: ${orderId}
DATE: ${new Date().toLocaleString()}
--------------------------------------------------

CUSTOMER CONTACT & DELIVERY DETAILS:
• Full Name: ${customerData.name}
• Email: ${customerData.email}
• Phone: ${customerData.phone}
• Delivery Address: ${customerData.address}, ${customerData.city}, ${customerData.postalCode || ''}, ${customerData.country}

ORDERED PRODUCTS:
${itemsListText}

--------------------------------------------------
TOTAL ORDER DUE: $${totalAmount.toFixed(2)}
PAYMENT & DISPATCH: Direct Email Order / Proforma Invoice
--------------------------------------------------

Please confirm receipt and contact me with proforma invoice and shipment dispatch timeline.

Thank you,
${customerData.name}
`
    );

    return `mailto:${COMPANY_ORDER_EMAIL}?subject=${subject}&body=${bodyText}`;
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setLoading(true);

    const orderId = `CEFI-ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    const orderItemsSnapshot = [...cart];
    const orderTotalSnapshot = grandTotal;

    const payload = {
      orderId,
      customer: formData,
      items: orderItemsSnapshot,
      total: orderTotalSnapshot,
      paymentMethod: formData.paymentMethod,
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

      setOrderConfirmed(finalOrderId);
      setConfirmedOrderDetails({
        orderId: finalOrderId,
        customer: formData,
        items: orderItemsSnapshot,
        total: orderTotalSnapshot,
        mailtoUrl: generateMailtoLink(finalOrderId, formData, orderItemsSnapshot, orderTotalSnapshot)
      });

      // Automatically trigger email client
      const mailtoUrl = generateMailtoLink(finalOrderId, formData, orderItemsSnapshot, orderTotalSnapshot);
      window.open(mailtoUrl, '_blank');

      clearCart();
    } catch (err) {
      // Fallback
      setOrderConfirmed(orderId);
      setConfirmedOrderDetails({
        orderId,
        customer: formData,
        items: orderItemsSnapshot,
        total: orderTotalSnapshot,
        mailtoUrl: generateMailtoLink(orderId, formData, orderItemsSnapshot, orderTotalSnapshot)
      });

      const mailtoUrl = generateMailtoLink(orderId, formData, orderItemsSnapshot, orderTotalSnapshot);
      window.open(mailtoUrl, '_blank');

      clearCart();
    } finally {
      setLoading(false);
    }
  };

  if (orderConfirmed && confirmedOrderDetails) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8 sm:p-10 space-y-6 text-center">
          <div className="w-20 h-20 bg-emerald-100 text-cefi-green rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <div className="space-y-2">
            <span className="text-xs uppercase font-bold tracking-widest text-cefi-gold">Order Sent to CEFI</span>
            <h1 className="font-serif font-bold text-3xl text-cefi-earth">Order Request Dispatched!</h1>
            <p className="text-xs text-gray-500 font-sans">
              Order Reference: <strong className="text-cefi-green font-mono text-sm">{orderConfirmed}</strong>
            </p>
          </div>

          {/* Email Recipient Notice Card */}
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-5 text-left text-xs space-y-2 text-cefi-earth">
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-cefi-green" />
              <span className="font-bold">Sent to Official CEFI Export Desk:</span>
              <strong className="text-cefi-green font-mono">{COMPANY_ORDER_EMAIL}</strong>
            </div>
            <p className="text-gray-600 leading-relaxed">
              Your order details for <strong>{confirmedOrderDetails.items?.length || 0} product(s)</strong> totaling <strong>${confirmedOrderDetails.total?.toFixed(2)}</strong> have been recorded and sent to our Ceylon export processing team.
            </p>
          </div>

          {/* Product list summary */}
          <div className="bg-cefi-cream/40 rounded-2xl p-5 text-left space-y-2">
            <span className="text-[10px] font-bold uppercase text-cefi-gold tracking-wider block">
              Ordered Products Summary
            </span>
            <div className="divide-y divide-gray-100 text-xs">
              {confirmedOrderDetails.items?.map((item, idx) => (
                <div key={idx} className="py-2 flex justify-between items-center">
                  <span className="font-medium text-cefi-earth">• {item.name} × {item.quantity}</span>
                  <span className="font-bold text-cefi-green">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-gray-200 flex justify-between text-sm font-bold">
              <span>Total Amount:</span>
              <span className="text-cefi-green font-serif text-base">${confirmedOrderDetails.total?.toFixed(2)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={confirmedOrderDetails.mailtoUrl}
              className="w-full sm:w-auto px-6 py-3.5 bg-cefi-green hover:bg-cefi-green-dark text-white font-serif font-bold text-xs rounded-full shadow-md transition-all flex items-center justify-center space-x-2"
            >
              <Send className="w-4 h-4 text-cefi-gold" />
              <span>Open Email to {COMPANY_ORDER_EMAIL}</span>
            </a>

            <Link
              to="/products"
              className="w-full sm:w-auto px-6 py-3.5 border border-gray-200 hover:bg-gray-50 text-cefi-earth font-semibold text-xs rounded-full transition-all"
            >
              Continue Browsing Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Auth Gate: show spinner while auth resolves, modal if still a guest ───
  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-cefi-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <LoginPromptModal
          isOpen={true}
          onClose={() => navigate('/cart')}
          redirectTo="/checkout"
        />
        <div className="opacity-0 pointer-events-none">
          <h2 className="font-serif font-bold text-xl">Loading...</h2>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="font-serif font-bold text-xl">Your Basket is Empty</h2>
        <Link to="/products" className="text-xs text-cefi-green underline">Return to Shop</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      
      <div className="border-b border-gray-200 pb-4">
        <h1 className="font-serif font-bold text-3xl text-cefi-earth">Checkout & Order Placement</h1>
        <p className="text-xs text-gray-500 mt-1">
          Complete your contact & shipping details. Your order request will be sent directly to <strong>{COMPANY_ORDER_EMAIL}</strong> for processing.
        </p>
      </div>

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left Column: Customer & Delivery Details */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-soft space-y-4">
            <h3 className="font-serif font-bold text-xl text-cefi-earth border-b border-gray-100 pb-3">
              Customer Shipping Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Jane Smith"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-cefi-green"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="jane@example.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-cefi-green"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  placeholder="+94 77 123 4567"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-cefi-green"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Country *</label>
                <input
                  type="text"
                  required
                  value={formData.country}
                  onChange={e => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-cefi-green"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Street Address *</label>
              <input
                type="text"
                required
                placeholder="House / Apartment number and street name"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-cefi-green"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1">City *</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-cefi-green"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Postal Code</label>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={e => setFormData({ ...formData, postalCode: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-cefi-green"
                />
              </div>
            </div>

          </div>

          {/* Email Order Info Banner */}
          <div className="bg-emerald-50/70 p-6 rounded-3xl border border-emerald-100 flex items-start space-x-4">
            <div className="w-10 h-10 bg-cefi-green text-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <Mail className="w-5 h-5 text-cefi-gold" />
            </div>
            <div className="space-y-1 text-xs text-cefi-earth">
              <strong className="block text-sm font-serif font-bold text-cefi-green">
                Direct Email to {COMPANY_ORDER_EMAIL}
              </strong>
              <p className="text-gray-600 leading-relaxed">
                When you click <strong>Send Email to Place Order</strong>, your full product list, quantities, and delivery address are automatically dispatched to <strong>{COMPANY_ORDER_EMAIL}</strong> for export processing.
              </p>
            </div>
          </div>

        </div>

        {/* Right Column: Order Summary Review */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-soft space-y-4">
            <h3 className="font-serif font-bold text-xl text-cefi-earth border-b border-gray-100 pb-3">
              Order Review ({cart.length} items)
            </h3>

            <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto space-y-3 pr-1">
              {cart.map(item => (
                <div key={item.id} className="pt-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img src={item.image} alt="" className="w-12 h-12 object-cover rounded-lg" />
                    <div>
                      <h5 className="text-xs font-semibold text-cefi-earth line-clamp-1">{item.name}</h5>
                      <span className="text-[11px] text-gray-400 font-medium">Qty: {item.quantity}</span>
                    </div>
                  </div>
                  <span className="font-serif font-bold text-sm text-cefi-green">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-gray-100 space-y-2 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="font-bold text-cefi-earth">${cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Express Dispatch</span>
                <span className="font-bold text-cefi-earth">
                  {shippingCost === 0 ? 'FREE' : `$${shippingCost.toFixed(2)}`}
                </span>
              </div>
              <div className="pt-3 border-t border-gray-100 flex justify-between text-base">
                <span className="font-bold text-cefi-earth">Total Due</span>
                <span className="font-serif font-bold text-2xl text-cefi-green">${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-cefi-green hover:bg-cefi-green-dark text-white rounded-full font-serif font-bold text-sm shadow-md flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <span>Sending Email Order...</span>
              ) : (
                <>
                  <Send className="w-4 h-4 text-cefi-gold" />
                  <span>Send Email to Place Order</span>
                </>
              )}
            </button>

            <div className="text-center pt-1">
              <span className="text-[11px] text-gray-400">
                Order details will be sent directly to <strong>{COMPANY_ORDER_EMAIL}</strong>.
              </span>
            </div>
          </div>

        </div>

      </form>

    </div>
  );
}
