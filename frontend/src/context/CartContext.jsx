import React, { createContext, useContext, useState, useEffect } from 'react';
import { trackAddToCart } from '../utils/analytics';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('cefi_cart');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('cefi_cart', JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to persist cart:', e);
    }
  }, [cart]);

  const addToCart = (product, quantity = 1) => {
    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => item.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prevCart];
        updated[existingIndex].quantity += quantity;
        return updated;
      }
      return [...prevCart, {
        id: product.id,
        name: product.name,
        slug: product.slug,
        category_slug: product.category_slug,
        price: product.price,
        image: product.images && product.images.length > 0 ? product.images[0] : '',
        quantity,
        is_wholesale_only: product.is_wholesale_only || false
      }];
    });

    trackAddToCart(product, quantity);
    setIsCartOpen(true);
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      cartCount,
      cartTotal,
      isCartOpen,
      setIsCartOpen
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
