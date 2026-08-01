// Lightweight Analytics Event Tracker for CEFI

export const trackEvent = (eventName, eventParams = {}) => {
  console.log(`[Analytics Event] 📊 ${eventName}`, eventParams);
  
  if (window.gtag && typeof window.gtag === 'function') {
    window.gtag('event', eventName, eventParams);
  }
};

export const trackPageView = (path) => {
  trackEvent('page_view', {
    page_path: path,
    page_title: document.title
  });
};

export const trackProductView = (product) => {
  trackEvent('view_item', {
    currency: 'USD',
    value: product.price,
    items: [{
      item_id: product.id,
      item_name: product.name,
      item_category: product.category_name,
      price: product.price
    }]
  });
};

export const trackAddToCart = (product, quantity = 1) => {
  trackEvent('add_to_cart', {
    currency: 'USD',
    value: product.price * quantity,
    items: [{
      item_id: product.id,
      item_name: product.name,
      item_category: product.category_name,
      price: product.price,
      quantity
    }]
  });
};

export const trackCheckoutStart = (cartItems, total) => {
  trackEvent('begin_checkout', {
    currency: 'USD',
    value: total,
    items: cartItems.map(item => ({
      item_id: item.id,
      item_name: item.name,
      price: item.price,
      quantity: item.quantity
    }))
  });
};

export const trackQuoteRequest = (productName, companyName) => {
  trackEvent('generate_lead', {
    lead_type: 'Wholesale Quote Request',
    product: productName,
    company: companyName
  });
};
