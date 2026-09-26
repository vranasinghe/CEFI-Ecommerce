import React, { createContext, useContext, useState, useEffect } from 'react';
import { trackAddToCart } from '../utils/analytics';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('cefi_cart');
      const parsed = saved ? JSON.parse(saved) : [];
      // Backfill lineId for a basket saved by an older build, before each
      // line carried its own type/size identity.
      return parsed.map(item => ({
        ...item,
        lineId: item.lineId || `${item.id}::${item.type || ''}::${item.size || ''}`,
      }));
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

  // This storefront quotes by quantity, type and size — not a fixed listed
  // price — so the buyer's variant pick from the product page is part of a
  // cart line's identity: "Cinnamon / 250g" and "Cinnamon / 1kg" are two
  // separate lines, each with its own quantity, not one merged line.
  // lineId is stored on the item itself so components can key/select/remove
  // a line without knowing how that identity is built.
  const makeLineId = (id, type, size) => `${id}::${type || ''}::${size || ''}`;

  const addToCart = (product, quantity = 1) => {
    const lineId = makeLineId(product.id, product.selectedType, product.selectedSize);
    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => item.lineId === lineId);
      if (existingIndex > -1) {
        const updated = [...prevCart];
        updated[existingIndex].quantity += quantity;
        return updated;
      }
      return [...prevCart, {
        lineId,
        id: product.id,
        name: product.name,
        slug: product.slug,
        category_slug: product.category_slug,
        price: product.price,
        image: product.images && product.images.length > 0 ? product.images[0] : '',
        quantity,
        type: product.selectedType || '',
        size: product.selectedSize || '',
        is_wholesale_only: product.is_wholesale_only || false
      }];
    });

    trackAddToCart(product, quantity);
    setIsCartOpen(true);
  };

  const removeFromCart = (lineId) => {
    setCart(prevCart => prevCart.filter(item => item.lineId !== lineId));
  };

  const updateQuantity = (lineId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(lineId);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.lineId === lineId ? { ...item, quantity } : item
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
