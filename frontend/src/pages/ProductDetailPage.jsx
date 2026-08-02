import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { RefreshCw, Plus, Minus, ShoppingBag, Zap, ChevronRight, Leaf, Shield, Truck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import ProductCard from '../components/ProductCard';

export default function ProductDetailPage({ onOpenQuoteModal }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [selectedImage, setSelectedImage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedType, setSelectedType] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [loading, setLoading] = useState(true);
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    setLoading(true);
    setAddedToCart(false);
    fetch(`/api/products/${slug}`)
      .then(res => res.json())
      .then(data => {
        setProduct(data);
        if (data.images && data.images.length > 0) setSelectedImage(data.images[0]);
        if (data.variants) {
          if (data.variants.type?.length > 0) setSelectedType(data.variants.type[0]);
          if (data.variants.size?.length > 0) setSelectedSize(data.variants.size[0]);
        }
        fetch(`/api/products?category=${data.category_slug}`)
          .then(r => r.json())
          .then(rel => setRelatedProducts(rel.filter(p => p.id !== data.id)))
          .catch(() => {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  const handleAddToCart = () => {
    addToCart({ ...product, selectedType, selectedSize }, quantity);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const parseDescription = (text) => {
    if (!text) return [];
    const lines = text.split('\n');
    const blocks = [];
    let currentBlock = null;

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Section headers end with ':'
      if (trimmed.endsWith(':')) {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = { type: 'section', header: trimmed, items: [] };
      } else if (trimmed.includes(':') && (trimmed.toLowerCase().startsWith('ingredients:') || trimmed.toLowerCase().startsWith('storage instructions:') || trimmed.toLowerCase().startsWith('available '))) {
        const colonIndex = trimmed.indexOf(':');
        const header = trimmed.substring(0, colonIndex + 1);
        const content = trimmed.substring(colonIndex + 1).trim();
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = { type: 'section', header: header, items: content ? [content] : [] };
      } else if (currentBlock) {
        currentBlock.items.push(trimmed);
      } else {
        blocks.push({ type: 'text', content: trimmed });
      }
    });

    if (currentBlock) blocks.push(currentBlock);
    return blocks;
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-cefi-green/20 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-cefi-green border-t-transparent rounded-full animate-spin absolute inset-0"></div>
        </div>
        <p className="text-sm text-gray-500 font-medium tracking-wide">Loading product details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
          <Leaf className="w-8 h-8 text-gray-400" />
        </div>
        <h2 className="font-serif font-bold text-2xl text-cefi-earth">Product Not Found</h2>
        <p className="text-sm text-gray-500">The product you're looking for doesn't exist or may have been moved.</p>
        <Link to="/products" className="inline-flex items-center gap-2 px-8 py-3 bg-cefi-green text-white text-sm font-semibold rounded-full hover:bg-cefi-green-dark transition-colors">
          Back to Products
        </Link>
      </div>
    );
  }

  const descriptionBlocks = parseDescription(product.full_description || product.short_description);

  return (
    <div className="bg-[#F5F3EE] min-h-screen">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
        <nav className="flex items-center space-x-1.5 text-xs text-gray-400">
          <Link to="/" className="hover:text-cefi-green transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <Link to="/products" className="hover:text-cefi-green transition-colors">Products</Link>
          <ChevronRight className="w-3 h-3" />
          <Link to={`/products/${product.category_slug}`} className="hover:text-cefi-green capitalize transition-colors">
            {product.category_name || product.category_slug}
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-cefi-earth font-medium truncate max-w-[200px]">{product.name}</span>
        </nav>
      </div>

      {/* Main Product Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">

          {/* ── LEFT: Image Gallery ── */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="bg-white rounded-2xl overflow-hidden aspect-square flex items-center justify-center p-6 shadow-sm border border-gray-100">
              <img
                key={selectedImage}
                src={selectedImage || product.images?.[0]}
                alt={product.name}
                className="max-w-full max-h-full object-contain transition-opacity duration-300"
              />
            </div>

            {/* Thumbnails */}
            {product.images?.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(img)}
                    className={`w-20 h-20 rounded-xl flex-shrink-0 overflow-hidden border-2 transition-all duration-200 bg-white p-1.5 ${
                      selectedImage === img
                        ? 'border-cefi-green shadow-md'
                        : 'border-transparent opacity-60 hover:opacity-100 hover:border-gray-200'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-contain rounded-lg" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT: Product Details ── */}
          <div className="space-y-6">
            {/* Category + Name + Price */}
            <div className="space-y-3">
              <span className="inline-block text-[10px] font-bold tracking-[0.2em] uppercase text-cefi-green bg-cefi-green/10 px-3 py-1 rounded-full">
                CEFI {product.category_name || product.category_slug}
              </span>
              <h1 className="font-serif text-3xl sm:text-4xl text-cefi-earth leading-snug">
                {product.name}
              </h1>
              {product.is_wholesale_only && (
                <p className="text-sm text-amber-600 font-medium mt-2">
                  Wholesale Item - Inquire for details
                </p>
              )}
            </div>

            <div className="h-px bg-gray-200"></div>

            {/* Variants */}
            <div className="space-y-5">
              {/* Type Selector */}
              {product.variants?.type && (
                <div className="space-y-2.5">
                  <label className="text-sm font-semibold text-cefi-earth block">
                    Type: <span className="font-normal text-gray-500">{selectedType}</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.type.map((type) => (
                      <button
                        key={type}
                        onClick={() => setSelectedType(type)}
                        className={`px-5 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
                          selectedType === type
                            ? 'bg-cefi-green text-white border-cefi-green shadow-sm'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-cefi-green hover:text-cefi-green'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Size Selector */}
              {product.variants?.size && (
                <div className="space-y-2.5">
                  <label className="text-sm font-semibold text-cefi-earth block">
                    Size: <span className="font-normal text-gray-500">{selectedSize}</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.size.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 ${
                          selectedSize === size
                            ? 'bg-cefi-green text-white border-cefi-green shadow-sm'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-cefi-green hover:text-cefi-green'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quantity + Buttons */}
            <div className="space-y-3 pt-1">
              {/* Quantity */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-cefi-earth">Qty:</span>
                <div className="inline-flex items-center bg-white border border-gray-200 rounded-full shadow-sm overflow-hidden">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-cefi-green hover:bg-gray-50 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-10 text-center text-sm font-bold text-cefi-earth">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-cefi-green hover:bg-gray-50 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Add to Cart */}
              <button
                onClick={handleAddToCart}
                className={`w-full py-3.5 rounded-xl text-sm font-semibold border-2 transition-all duration-300 flex items-center justify-center gap-2 ${
                  addedToCart
                    ? 'bg-cefi-green border-cefi-green text-white'
                    : 'bg-white border-cefi-green text-cefi-green hover:bg-cefi-green hover:text-white'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                {addedToCart ? 'Added to Cart ✓' : 'Add to Cart'}
              </button>

              {/* Buy it Now */}
              <button
                onClick={() => {
                  addToCart({ ...product, selectedType, selectedSize }, quantity);
                  navigate('/checkout');
                }}
                className="w-full py-3.5 rounded-xl text-sm font-semibold bg-cefi-green hover:bg-cefi-green-dark text-white transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                <Zap className="w-4 h-4" />
                Buy it now
              </button>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              {[
                { icon: Leaf, label: 'Natural & Pure' },
                { icon: Shield, label: 'Quality Assured' },
                { icon: Truck, label: 'Fast Shipping' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1.5 bg-white rounded-xl py-3 px-2 border border-gray-100 text-center">
                  <Icon className="w-5 h-5 text-cefi-green" />
                  <span className="text-[10px] font-semibold text-gray-500 leading-tight">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Description Section ── */}
        <div className="mt-14 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50">
            <h2 className="font-serif font-bold text-2xl text-cefi-earth">{product.name}</h2>
            <p className="text-sm text-gray-500 mt-1">Product Details & Usage Guide</p>
          </div>

          <div className="px-8 py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-8">
              {descriptionBlocks.map((block, idx) => {
                if (block.type === 'text') {
                  return (
                    <p key={idx} className="text-sm text-gray-600 leading-relaxed col-span-full">
                      {block.content}
                    </p>
                  );
                }

                // Sections with bullet items
                const isList = block.items.length > 1;
                return (
                  <div key={idx} className={`space-y-2 ${block.items.length > 4 ? '' : ''}`}>
                    <h3 className="text-sm font-bold text-cefi-earth uppercase tracking-wide flex items-center gap-2">
                      <span className="w-1 h-4 bg-cefi-green rounded-full inline-block"></span>
                      {block.header.replace(':', '')}
                    </h3>
                    {isList ? (
                      <ul className="space-y-1.5">
                        {block.items.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cefi-green/60 shrink-0"></span>
                            <span className="leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-600 leading-relaxed pl-3">{block.items[0]}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Related Products ── */}
        {relatedProducts.length > 0 && (
          <div className="mt-14 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-2xl text-cefi-earth">You Might Also Like</h3>
              <Link to={`/products/${product.category_slug}`} className="text-sm text-cefi-green hover:underline font-medium flex items-center gap-1">
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {relatedProducts.slice(0, 4).map(rel => (
                <ProductCard key={rel.id} product={rel} onOpenQuoteModal={onOpenQuoteModal} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
