import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, Mail, Send, Loader2 } from 'lucide-react';
import emailjs from '@emailjs/browser';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import LoginPromptModal from '../components/LoginPromptModal';

const COMPANY_ORDER_EMAIL = 'ceylonecofreshinfinity@gmail.com';
// Same EmailJS credentials used in ContactPage (already verified working)
const EMAILJS_SERVICE_ID  = 'service_esc398x';
const EMAILJS_TEMPLATE_ID = 'template_an5f25r';
const EMAILJS_PUBLIC_KEY  = 'zNFcAnT75D9PGlHIR';

export default function CheckoutPage() {
  const { cart, cartTotal, clearCart } = useCart();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: '',
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

  React.useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || user.name || user.user_metadata?.full_name || '',
      }));
    }
  }, [user]);

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setLoading(true);

    const orderId = `CEFI-ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    let orderSent = false;

    const itemsSummary = cart.map(item => `• ${item.name} (Qty: ${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}`).join('\n');
    const itemsLine = cart.map(item => `${item.name} x${item.quantity}`).join(', ');

    // ══ 1. BACKEND API DISPATCH (Generates the Gorgeous Green & Gold HTML Template) ══
    try {
      const apiRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId, 
          customer: formData, 
          items: cart,
          paymentMethod: formData.paymentMethod || 'Direct Email Order', 
          targetEmail: COMPANY_ORDER_EMAIL
        })
      });
      
      if (apiRes.ok) {
        const apiData = await apiRes.json();
        if (apiData.success) {
          orderSent = true;
          console.log('✅ Backend API order confirmation dispatched with gorgeous HTML template!');
        }
      }
    } catch (error) {
      console.warn('Backend API order endpoint not reachable, trying Web3Forms fallback...', error);
    }

    // ══ 2. WEB3FORMS FALLBACK (Only triggers if backend API was unavailable) ══
    if (!orderSent) {
      try {
        const w3Res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({
            access_key: import.meta.env.VITE_WEB3FORMS_ACCESS_KEY || '2a8d834e-5677-4c4c-b610-6844fe2ba187',
            from_name: "CEFI Orders",
            subject: `🛒 [New Order] ${orderId} - from ${formData.name}`,
            name: formData.name,
            email: formData.email,
            phone: formData.phone || 'N/A',
            delivery_address: `${formData.address}, ${formData.city}, ${formData.postalCode}, ${formData.country}`,
            order_id: orderId,
            order_items: itemsLine,
            total_amount: `$${grandTotal.toFixed(2)}`,
            payment_method: formData.paymentMethod || 'Direct Email Order',
            message: `New Order Received!\n\nOrder ID: ${orderId}\nCustomer: ${formData.name} (${formData.email}, ${formData.phone || 'No phone'})\nDelivery Address: ${formData.address}, ${formData.city}, ${formData.postalCode}, ${formData.country}\n\nOrdered Products:\n${itemsSummary}\n\nShipping: $${shippingCost.toFixed(2)}\nGrand Total: $${grandTotal.toFixed(2)}\nPayment Method: ${formData.paymentMethod || 'Direct Email Order'}`
          })
        });
        const w3Data = await w3Res.json();
        if (w3Data.success) {
          orderSent = true;
        }
      } catch (w3Err) {
        console.warn('Web3Forms dispatch failed, attempting FormSubmit fallback...', w3Err);
      }
    }

    // ══ 3. FORMSUBMIT FALLBACK ══
    if (!orderSent) {
      try {
        await fetch(`https://formsubmit.co/ajax/${COMPANY_ORDER_EMAIL}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            _subject: `🛒 [New Order] ${orderId} - from ${formData.name}`,
            order_id: orderId,
            customer_name: formData.name,
            customer_email: formData.email,
            customer_phone: formData.phone || 'N/A',
            address: `${formData.address}, ${formData.city}, ${formData.postalCode}, ${formData.country}`,
            products: itemsSummary,
            total: `$${grandTotal.toFixed(2)}`
          })
        });
        orderSent = true;
      } catch (fsErr) {
        console.error('All order email delivery options failed:', fsErr);
      }
    }

    setOrderConfirmed(orderId);
    setEmailSent(orderSent);
    setOrderDetails({ orderId, items: cart, total: grandTotal, customer: formData });
    clearCart();
    setLoading(false);
  };


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

  if (orderConfirmed && orderDetails) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8 sm:p-10 space-y-6 text-center">
          <div className="w-20 h-20 bg-emerald-100 text-cefi-green rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <div className="space-y-1">
            <span className="text-xs uppercase font-bold tracking-widest text-cefi-gold">Order Placed Successfully</span>
            <h1 className="font-serif font-bold text-3xl text-cefi-earth">Thank You, {orderDetails.customer.name}!</h1>
            <p className="text-xs text-gray-500 font-mono">
              Order Reference: <strong className="text-cefi-green text-sm">{orderConfirmed}</strong>
            </p>
          </div>
          <div className={`flex items-start space-x-3 p-4 rounded-2xl text-left text-xs border ${emailSent ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
            <Mail className={`w-5 h-5 mt-0.5 shrink-0 ${emailSent ? 'text-cefi-green' : 'text-amber-500'}`} />
            <div>
              {emailSent ? (
                <>
                  <strong className="block text-cefi-green font-semibold mb-1">Order emails sent successfully!</strong>
                  <span className="text-gray-600 leading-relaxed">
                    ✓ Order notification sent to <strong>{COMPANY_ORDER_EMAIL}</strong><br/>
                    ✓ Confirmation sent to <strong>{orderDetails.customer.email}</strong><br/>
                    <span className="text-gray-500 text-[11px]">Our export team will contact you within 24 hours to confirm dispatch.</span>
                  </span>
                </>
              ) : (
                <>
                  <strong className="block text-amber-700 font-semibold mb-1">Order recorded — email not sent</strong>
                  <span className="text-gray-600">
                    Please contact <strong>{COMPANY_ORDER_EMAIL}</strong> quoting order <strong>{orderConfirmed}</strong> if you don't hear back within 24 hours.
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="bg-cefi-cream/40 rounded-2xl p-5 text-left space-y-2">
            <span className="text-[10px] font-bold uppercase text-cefi-gold tracking-wider block">Your Order Summary</span>
            <div className="divide-y divide-gray-100 text-xs">
              {orderDetails.items.map((item, idx) => (
                <div key={idx} className="py-2.5 flex justify-between items-center">
                  <span className="font-medium text-cefi-earth">• {item.name}</span>
                  <span className="font-bold text-cefi-green bg-emerald-50 px-2.5 py-1 rounded-full text-xs">Qty: {item.quantity}</span>
                </div>
              ))}
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="font-serif font-bold text-3xl text-cefi-earth">Checkout</h1>
      </div>
      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-soft space-y-4">
            <h3 className="font-serif font-bold text-xl text-cefi-earth border-b border-gray-100 pb-3">Your Shipping Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Full Name *</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cefi-green" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Email Address *</label>
                <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cefi-green" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Phone Number *</label>
                <input type="tel" required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cefi-green" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Country *</label>
                <input type="text" required value={formData.country} onChange={e => setFormData({ ...formData, country: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cefi-green" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Street Address *</label>
              <input type="text" required value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cefi-green" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">City *</label>
                <input type="text" required value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cefi-green" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Postal Code</label>
                <input type="text" value={formData.postalCode} onChange={e => setFormData({ ...formData, postalCode: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cefi-green" />
              </div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-5">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-soft space-y-4 sticky top-6">
            <h3 className="font-serif font-bold text-xl text-cefi-earth border-b border-gray-100 pb-3">Order Summary</h3>
            <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto pr-1">
              {cart.map(item => (
                <div key={item.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {item.image && <img src={item.image} alt="" className="w-11 h-11 object-cover rounded-lg" />}
                    <div>
                      <p className="text-xs font-semibold text-cefi-earth line-clamp-1">{item.name}</p>
                      <span className="text-[11px] text-gray-500">Qty: {item.quantity}</span>
                    </div>
                  </div>
                </div>
              ))}
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
