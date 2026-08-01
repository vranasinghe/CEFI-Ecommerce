import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, ShieldCheck } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();

  const shippingCost = cartTotal > 100 || cartTotal === 0 ? 0 : 15.00;
  const grandTotal = cartTotal + shippingCost;

  if (cart.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-20 h-20 bg-cefi-cream text-cefi-green rounded-full flex items-center justify-center mx-auto shadow-sm">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h1 className="font-serif font-bold text-3xl text-cefi-earth">Your Shopping Basket is Empty</h1>
        <p className="text-xs text-gray-500 max-w-sm mx-auto">
          Explore Ceylon Eco Fresh Infinity's collection of pure Ceylon teas, authentic cinnamon quills, and organic superfoods.
        </p>
        <Link
          to="/products"
          className="inline-block px-8 py-3 bg-cefi-green text-white font-serif font-bold text-sm rounded-full shadow-md hover:bg-cefi-green-dark transition-all"
        >
          Explore Ceylon Collections
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <h1 className="font-serif font-bold text-3xl text-cefi-earth">Shopping Basket</h1>
        <button
          onClick={clearCart}
          className="text-xs text-gray-400 hover:text-red-600 transition-colors"
        >
          Clear Basket
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        
        {/* Cart Item List */}
        <div className="lg:col-span-8 space-y-4">
          {cart.map((item) => (
            <div key={item.id} className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              
              <div className="flex items-center space-x-4">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-20 h-20 object-cover rounded-xl shrink-0"
                />
                <div>
                  <Link to={`/products/${item.category_slug}/${item.slug}`} className="font-serif font-bold text-base text-cefi-earth hover:text-cefi-green">
                    {item.name}
                  </Link>
                  <p className="text-xs text-cefi-gold font-bold mt-1">
                    {item.is_wholesale_only ? 'Wholesale Quote Item' : `$${item.price.toFixed(2)}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between w-full sm:w-auto space-x-6 pt-2 sm:pt-0 border-t sm:border-0 border-gray-100">
                {/* Quantity */}
                <div className="flex items-center space-x-2 bg-cefi-cream px-3 py-1.5 rounded-full">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="p-1 hover:bg-gray-200 rounded-full"
                  >
                    <Minus className="w-3 h-3 text-gray-600" />
                  </button>
                  <span className="font-bold text-xs w-6 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="p-1 hover:bg-gray-200 rounded-full"
                  >
                    <Plus className="w-3 h-3 text-gray-600" />
                  </button>
                </div>

                {/* Subtotal */}
                <div className="text-right">
                  <span className="font-serif font-bold text-base text-cefi-green">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>

                {/* Delete */}
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

            </div>
          ))}

          <div className="pt-4 flex justify-between items-center">
            <Link to="/products" className="text-xs font-semibold text-cefi-green hover:underline">
              ← Continue Shopping
            </Link>
          </div>
        </div>

        {/* Order Summary Box */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-soft space-y-6">
          <h3 className="font-serif font-bold text-xl text-cefi-earth border-b border-gray-100 pb-3">
            Order Summary
          </h3>

          <div className="space-y-3 text-xs text-gray-600">
            <div className="flex items-center justify-between">
              <span>Basket Subtotal</span>
              <span className="font-bold text-cefi-earth">${cartTotal.toFixed(2)}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span>Estimated Express Shipping</span>
              <span className="font-bold text-cefi-earth">
                {shippingCost === 0 ? <strong className="text-cefi-green font-bold">FREE</strong> : `$${shippingCost.toFixed(2)}`}
              </span>
            </div>

            {shippingCost > 0 && (
              <p className="text-[11px] text-cefi-gold">Add ${(100 - cartTotal).toFixed(2)} more for Free Shipping!</p>
            )}

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-sm">
              <span className="font-bold text-cefi-earth">Estimated Total</span>
              <span className="font-serif font-bold text-2xl text-cefi-green">${grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/checkout')}
            className="w-full py-4 bg-cefi-green hover:bg-cefi-green-dark text-white rounded-full font-serif font-bold text-sm shadow-md flex items-center justify-center space-x-2 transition-all"
          >
            <span>Proceed to Checkout</span>
            <ArrowRight className="w-4 h-4 text-cefi-gold" />
          </button>

          <div className="pt-2 flex items-center justify-center space-x-2 text-[11px] text-gray-400">
            <ShieldCheck className="w-4 h-4 text-cefi-green" />
            <span>Secure 256-Bit SSL Checkout Encryption</span>
          </div>
        </div>

      </div>

    </div>
  );
}
