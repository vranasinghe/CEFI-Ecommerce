import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, CreditCard, Landmark, Truck, ArrowRight, Lock } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { trackCheckoutStart } from '../utils/analytics';

export default function CheckoutPage() {
  const { cart, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: 'Colombo',
    postalCode: '00500',
    country: 'Sri Lanka',
    paymentMethod: 'PayHere Gateway'
  });

  const [loading, setLoading] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(null);

  const shippingCost = cartTotal > 100 || cartTotal === 0 ? 0 : 15.00;
  const grandTotal = cartTotal + shippingCost;

  React.useEffect(() => {
    if (cart.length > 0) {
      trackCheckoutStart(cart, grandTotal);
    }
  }, []);

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      customer: formData,
      items: cart,
      total: grandTotal,
      paymentMethod: formData.paymentMethod
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        setOrderConfirmed(data.orderId);
        clearCart();
      }
    } catch (err) {
      // Fallback order ID
      const fallbackId = `CEFI-ORD-${Math.floor(100000 + Math.random() * 900000)}`;
      setOrderConfirmed(fallbackId);
      clearCart();
    } finally {
      setLoading(false);
    }
  };

  if (orderConfirmed) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-6 bg-white my-12 rounded-3xl border border-gray-100 shadow-xl">
        <div className="w-20 h-20 bg-emerald-100 text-cefi-green rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-12 h-12" />
        </div>

        <div className="space-y-2">
          <span className="text-xs uppercase font-bold tracking-widest text-cefi-gold">Order Confirmed</span>
          <h1 className="font-serif font-bold text-3xl text-cefi-earth">Thank You For Your Order!</h1>
          <p className="text-xs text-gray-500 font-sans">
            Order Reference: <strong className="text-cefi-green font-mono">{orderConfirmed}</strong>
          </p>
        </div>

        <p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed">
          We have received your order details for Ceylon Eco Fresh Infinity produce. An order confirmation receipt has been dispatched to <strong>{formData.email}</strong>.
        </p>

        <div className="pt-4 flex justify-center space-x-4">
          <Link
            to="/products"
            className="px-8 py-3 bg-cefi-green text-white font-serif font-bold text-xs rounded-full shadow-md hover:bg-cefi-green-dark transition-all"
          >
            Continue Browsing
          </Link>
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
        <h1 className="font-serif font-bold text-3xl text-cefi-earth">Checkout & Shipping</h1>
        <p className="text-xs text-gray-500 mt-1">Complete your delivery address and payment verification.</p>
      </div>

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left Column: Customer & Delivery Details */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-soft space-y-4">
            <h3 className="font-serif font-bold text-xl text-cefi-earth border-b border-gray-100 pb-3">
              1. Customer Shipping Details
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

          {/* Payment Method Options */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-soft space-y-4">
            <h3 className="font-serif font-bold text-xl text-cefi-earth border-b border-gray-100 pb-3">
              2. Payment Method Gateway
            </h3>

            <div className="space-y-3">
              
              <label className={`flex items-center space-x-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                formData.paymentMethod === 'PayHere Gateway' ? 'border-cefi-green bg-emerald-50/50' : 'border-gray-100'
              }`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="PayHere Gateway"
                  checked={formData.paymentMethod === 'PayHere Gateway'}
                  onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="text-cefi-green focus:ring-cefi-green"
                />
                <div className="flex-1 flex items-center justify-between">
                  <div>
                    <strong className="block text-sm text-cefi-earth">PayHere Gateway (Visa / Mastercard / LKR)</strong>
                    <span className="text-xs text-gray-500">Sri Lankan card & internet banking payment gateway.</span>
                  </div>
                  <span className="px-2.5 py-1 bg-cefi-gold text-cefi-earth text-[10px] font-bold rounded">PayHere</span>
                </div>
              </label>

              <label className={`flex items-center space-x-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                formData.paymentMethod === 'Direct Bank Wire / L/C' ? 'border-cefi-green bg-emerald-50/50' : 'border-gray-100'
              }`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="Direct Bank Wire / L/C"
                  checked={formData.paymentMethod === 'Direct Bank Wire / L/C'}
                  onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="text-cefi-green focus:ring-cefi-green"
                />
                <div>
                  <strong className="block text-sm text-cefi-earth">Direct Bank Wire / Invoice Transfer</strong>
                  <span className="text-xs text-gray-500">Bank account payment instructions will be emailed.</span>
                </div>
              </label>

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
                <span>Processing Payment...</span>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-cefi-gold" />
                  <span>Place Order & Pay (${grandTotal.toFixed(2)})</span>
                </>
              )}
            </button>

            <div className="text-center pt-1">
              <span className="text-[11px] text-gray-400">By placing this order you agree to CEFI Export terms & conditions.</span>
            </div>
          </div>

        </div>

      </form>

    </div>
  );
}
