import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, Mail, Send, Loader2, Lock, AlertTriangle } from 'lucide-react';
import emailjs from '@emailjs/browser';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import LoginPromptModal from '../components/LoginPromptModal';
import supabase from '../utils/supabase';

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
    // Always the signed-in account's registered email — the input is read-only.
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
  // Actual recipients confirmed by the backend, so the success panel reports
  // what was really delivered rather than assuming.
  const [emailRecipients, setEmailRecipients] = useState({ customer: null, admin: null });
  const [adminNotified, setAdminNotified] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const shippingCost = cartTotal > 100 || cartTotal === 0 ? 0 : 15.00;
  const grandTotal = cartTotal + shippingCost;

  React.useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || user.name || user.user_metadata?.full_name || '',
        email: user.email || '',
      }));
    }
  }, [user]);

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSubmitError(null);

    // The backend identifies the buyer from this verified session, not from
    // the form — so an order can only ever confirm to the account's own email.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setSubmitError('Your session has expired. Please sign in again to place your order.');
      setLoading(false);
      return;
    }

    const orderId = `CEFI-ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    // Two independent outcomes: the admin alert and the customer confirmation.
    // The Web3Forms / FormSubmit fallbacks below can only reach the admin, so
    // collapsing these into one flag is what previously showed a green
    // "emails sent" panel while the customer received nothing.
    let adminNotified = false;
    let customerNotified = false;
    // True only if the API could not be reached at all. A reachable API that
    // rejects the order (bad session, unconfirmed email) must NOT fall through
    // to the admin-only email fallbacks and pretend the order went through.
    let backendUnreachable = false;

    const itemsSummary = cart.map(item => `• ${item.name} (Qty: ${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}`).join('\n');
    const itemsLine = cart.map(item => `${item.name} x${item.quantity}`).join(', ');

    // ══ 1. BACKEND API DISPATCH (Generates the Gorgeous Green & Gold HTML Template) ══
    try {
      const apiRes = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          orderId, 
          customer: { ...formData, email: user.email }, 
          items: cart,
          paymentMethod: formData.paymentMethod || 'Direct Email Order', 
          targetEmail: COMPANY_ORDER_EMAIL
        })
      });
      
      if (apiRes.status === 401 || apiRes.status === 403) {
        const errData = await apiRes.json().catch(() => ({}));
        setSubmitError(
          errData.code === 'EMAIL_UNCONFIRMED'
            ? 'Please confirm your email address (check your inbox for the verification link), then place your order.'
            : 'Please sign in again with your registered account to place your order.'
        );
        setLoading(false);
        return; // order not placed — cart is kept
      }

      if (apiRes.status >= 500) backendUnreachable = true;

      if (apiRes.ok) {
        const apiData = await apiRes.json();
        if (apiData.success) {
          // The order is saved. Email delivery is reported separately — a saved
          // order with a failed email must not show a green success panel.
          const notifications = apiData.notifications || {};
          adminNotified = Boolean(notifications.adminEmail);
          customerNotified = Boolean(notifications.customerEmail);
          setEmailRecipients({
            customer: notifications.customerEmail || null,
            admin: notifications.adminEmail || null
          });
          if (!customerNotified) {
            console.warn('Order saved but the customer confirmation failed:', notifications.detail);
          }
        }
      }
    } catch (error) {
      backendUnreachable = true;
      console.warn('Backend API order endpoint not reachable, trying Web3Forms fallback...', error);
    }

    // ══ 2. WEB3FORMS FALLBACK (admin notification only, API outage only) ══
    if (!adminNotified && backendUnreachable) {
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
          adminNotified = true; // reaches the company inbox, not the customer
        }
      } catch (w3Err) {
        console.warn('Web3Forms dispatch failed, attempting FormSubmit fallback...', w3Err);
      }
    }

    // ══ 3. FORMSUBMIT FALLBACK (admin notification only, API outage only) ══
    if (!adminNotified && backendUnreachable) {
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
        adminNotified = true; // reaches the company inbox, not the customer
      } catch (fsErr) {
        console.error('All order email delivery options failed:', fsErr);
      }
    }

    setOrderConfirmed(orderId);
    // Green panel only when the customer genuinely received their confirmation.
    setEmailSent(customerNotified);
    setAdminNotified(adminNotified);
    setOrderDetails({ orderId, items: cart, total: grandTotal, customer: { ...formData, email: user.email } });
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
                    ✓ Order notification sent to <strong>{emailRecipients.admin || COMPANY_ORDER_EMAIL}</strong><br/>
                    ✓ Confirmation sent to <strong>{emailRecipients.customer || orderDetails.customer.email}</strong><br/>
                    <span className="text-gray-500 text-[11px]">Our export team will contact you within 24 hours to confirm dispatch.</span>
                  </span>
                </>
              ) : (
                <>
                  <strong className="block text-amber-700 font-semibold mb-1">
                    {adminNotified
                      ? 'Order received — confirmation email could not be delivered'
                      : 'Order recorded — email not sent'}
                  </strong>
                  <span className="text-gray-600">
                    {adminNotified
                      ? <>Our team has your order and will be in touch, but we could not email your copy to <strong>{orderDetails.customer.email}</strong>. Please save your reference: <strong>{orderConfirmed}</strong>.</>
                      : <>Please contact <strong>{COMPANY_ORDER_EMAIL}</strong> quoting order <strong>{orderConfirmed}</strong> if you don't hear back within 24 hours.</>}
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
                {/* Locked to the signed-in account. The backend also ignores any
                    email in the request and uses the verified session's address. */}
                <div className="relative">
                  <input
                    type="email"
                    required
                    readOnly
                    aria-readonly="true"
                    tabIndex={-1}
                    value={formData.email}
                    title="Order confirmations are sent to your registered account email"
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-600 cursor-not-allowed select-all focus:outline-none"
                  />
                  <Lock className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p className="mt-1 text-[11px] text-gray-500">Confirmation is sent to your registered account email.</p>
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
            {submitError && (
              <div role="alert" className="flex items-start space-x-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                <span>{submitError}</span>
              </div>
            )}
            <p className="text-center text-[11px] text-gray-400">
              Your order is emailed automatically to <strong>{COMPANY_ORDER_EMAIL}</strong>
            </p>
          </div>
        </div>

      </form>
    </div>
  );
}
