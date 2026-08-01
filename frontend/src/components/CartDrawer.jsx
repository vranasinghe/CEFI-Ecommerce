import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Trash2, Plus, Minus, ArrowRight, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function CartDrawer() {
  const { isCartOpen, setIsCartOpen, cart, updateQuantity, removeFromCart, cartTotal } = useCart();
  const navigate = useNavigate();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-cefi-earth/50 backdrop-blur-xs transition-opacity"
        onClick={() => setIsCartOpen(false)}
      ></div>

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          
          {/* Header */}
          <div className="p-5 bg-cefi-green text-white flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-5 h-5 text-cefi-gold" />
              <h3 className="font-serif font-bold text-lg">Your Shopping Basket</h3>
            </div>
            <button 
              onClick={() => setIsCartOpen(false)}
              className="p-1 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <div className="w-16 h-16 bg-cefi-cream text-cefi-green rounded-full flex items-center justify-center mx-auto">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h4 className="font-serif text-xl font-bold text-cefi-earth">Your basket is empty</h4>
                <p className="text-xs text-gray-500 max-w-xs mx-auto">
                  Discover Sri Lanka's finest tea, spices, and organic products.
                </p>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    navigate('/products');
                  }}
                  className="px-6 py-2.5 bg-cefi-green text-white text-xs font-semibold rounded-full hover:bg-cefi-green-dark transition-all"
                >
                  Explore Products
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex items-center space-x-4 p-3 bg-cefi-cream/50 rounded-xl border border-gray-100">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded-lg shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-semibold text-cefi-earth truncate">{item.name}</h5>
                    <p className="text-xs text-cefi-gold font-bold mt-0.5">
                      {item.is_wholesale_only ? 'Wholesale / Quote' : `$${item.price.toFixed(2)}`}
                    </p>
                    <div className="flex items-center space-x-2 mt-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-1 hover:bg-gray-200 rounded border border-gray-200"
                      >
                        <Minus className="w-3 h-3 text-gray-600" />
                      </button>
                      <span className="text-xs font-bold w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-1 hover:bg-gray-200 rounded border border-gray-200"
                      >
                        <Plus className="w-3 h-3 text-gray-600" />
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer Subtotal */}
          {cart.length > 0 && (
            <div className="p-5 bg-cefi-cream border-t border-gray-200 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-serif font-bold text-lg text-cefi-green">${cartTotal.toFixed(2)}</span>
              </div>
              <p className="text-[11px] text-gray-500">Shipping and taxes calculated at checkout.</p>
              
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    navigate('/cart');
                  }}
                  className="py-2.5 border border-cefi-green text-cefi-green hover:bg-cefi-green hover:text-white rounded-full text-xs font-semibold transition-colors text-center"
                >
                  View Basket
                </button>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    navigate('/checkout');
                  }}
                  className="py-2.5 bg-cefi-green hover:bg-cefi-green-dark text-white rounded-full text-xs font-semibold shadow-md flex items-center justify-center space-x-1 transition-all"
                >
                  <span>Checkout</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
