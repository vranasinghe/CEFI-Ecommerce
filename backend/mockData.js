// Mock data store for CEFI E-Commerce
// Serves as fallback when Supabase parameters are not provided or during offline testing

const categories = [
  {
    id: "cat-1",
    name: "Herbal",
    slug: "herbal",
    description: "Traditional Sri Lankan ayurvedic herbs, wellness infusions, and immunity boosters harvested from organic estates.",
    image_url: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80",
    itemCount: 8
  },
  {
    id: "cat-2",
    name: "Tea",
    slug: "tea",
    description: "Pure Ceylon Black, Green, and Artisan Single-Origin Teas handpicked from Sri Lanka's high country slopes.",
    image_url: "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=800&q=80",
    itemCount: 12
  },
  {
    id: "cat-3",
    name: "Spices",
    slug: "spices",
    description: "World-renowned Ceylon Cinnamon, Black Pepper, Green Cardamom, Cloves, and Nutmeg packed with authentic aroma.",
    image_url: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80",
    itemCount: 10
  },
  {
    id: "cat-4",
    name: "Fruits",
    slug: "fruits",
    description: "Naturally dried and sun-ripened Ceylon tropical fruits including Mango, Pineapple, Papaya, and Jackfruit.",
    image_url: "https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?auto=format&fit=crop&w=800&q=80",
    itemCount: 7
  },
  {
    id: "cat-5",
    name: "Vegetables",
    slug: "vegetables",
    description: "Dehydrated and fresh farm-grown Sri Lankan vegetables processed under strict export-grade quality standards.",
    image_url: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80",
    itemCount: 6
  }
];

const products = [
  // TEA
  {
    id: "prod-1",
    category_id: "cat-2",
    category_slug: "tea",
    category_name: "Tea",
    name: "Premium Ceylon Single Origin Black Tea",
    slug: "premium-ceylon-single-origin-black-tea",
    short_description: "Rich, golden liquor with subtle floral notes handpicked from Nuwara Eliya highland gardens.",
    full_description: "Grown at over 6,000 feet above sea level in the crisp mountain air of Nuwara Eliya, our Single Origin Ceylon Black Tea represents the pinnacle of Sri Lankan tea heritage. Hand-harvested two leaves and a bud produce a vibrant amber cup with smooth astringency and bright aroma. Perfect for morning rituals and afternoon tea service.",
    price: 14.50,
    is_wholesale_only: false,
    weight_g: 250,
    origin: "Nuwara Eliya, Sri Lanka",
    stock_quantity: 450,
    is_featured: true,
    images: [
      "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    id: "prod-2",
    category_id: "cat-2",
    category_slug: "tea",
    category_name: "Tea",
    name: "Ceylon Artisan Silver Needle White Tea",
    slug: "ceylon-artisan-silver-needle-white-tea",
    short_description: "Ultra-rare, hand-rolled silvery buds yielding a delicate sweet melon nectar profile.",
    full_description: "Produced in limited quantities each harvest, Ceylon Silver Needle consists solely of unopened terminal leaf buds hand-selected before sunrise. Naturally withered and dried without oxidation, this delicate brew yields a silky, sweet brew brimming with antioxidants.",
    price: 32.00,
    is_wholesale_only: false,
    weight_g: 100,
    origin: "Uva Highlands, Sri Lanka",
    stock_quantity: 80,
    is_featured: true,
    images: [
      "https://images.unsplash.com/photo-1563822249510-04678c78fa85?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    id: "prod-3",
    category_id: "cat-2",
    category_slug: "tea",
    category_name: "Tea",
    name: "Organic Ceylon Green Tea Leaf (BOP)",
    slug: "organic-ceylon-green-tea-leaf",
    short_description: "Clean, toasted-nut finish packed with natural polyphenols.",
    full_description: "Sourced from certified organic estates in Dimbula, this loose-leaf green tea is steamed and rolled gently to preserve its leafy freshness, chlorophyll content, and sweet nutty aroma.",
    price: 12.00,
    is_wholesale_only: false,
    weight_g: 200,
    origin: "Dimbula, Sri Lanka",
    stock_quantity: 320,
    is_featured: false,
    images: [
      "https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?auto=format&fit=crop&w=800&q=80"
    ]
  },

  // SPICES
  {
    id: "prod-4",
    category_id: "cat-3",
    category_slug: "spices",
    category_name: "Spices",
    name: "Organic Ceylon Cinnamon Quills (Alba Grade)",
    slug: "organic-ceylon-cinnamon-quills-alba-grade",
    short_description: "True Ceylon Cinnamon (Cinnamomum verum) with sweet woody perfume and ultra-low coumarin.",
    full_description: "True Ceylon Cinnamon is world-renowned as 'Sweet Cinnamon' due to its delicate layered quills, fragrant aroma, and negligible coumarin levels compared to Cassia. Our Alba grade quills represent the finest pencil-thin cuts carefully hand-peeled by master craftsmen in Matara.",
    price: 18.90,
    is_wholesale_only: false,
    weight_g: 150,
    origin: "Matara, Sri Lanka",
    stock_quantity: 600,
    is_featured: true,
    images: [
      "https://images.unsplash.com/photo-1509358211525-24298075b281?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    id: "prod-5",
    category_id: "cat-3",
    category_slug: "spices",
    category_name: "Spices",
    name: "Whole Black Pepper (Tellicherry Extra Bold)",
    slug: "whole-black-pepper-tellicherry-extra-bold",
    short_description: "Pungent, high-piperine sun-dried black peppercorns from Kandy rainforest soils.",
    full_description: "Handpicked at peak maturity, CEFI Black Pepper delivers intense heat, complex citrus-woody aroma, and high essential oil density. Sun-dried naturally without chemicals.",
    price: 9.50,
    is_wholesale_only: false,
    weight_g: 250,
    origin: "Kandy, Sri Lanka",
    stock_quantity: 500,
    is_featured: false,
    images: [
      "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    id: "prod-6",
    category_id: "cat-3",
    category_slug: "spices",
    category_name: "Spices",
    name: "Ceylon Green Cardamom Pods (LGB Grade)",
    slug: "ceylon-green-cardamom-pods-lgb",
    short_description: "Aromatic green cardamom pods packed with rich menthol-sweet seeds.",
    full_description: "Harvested in the central hills, our Large Green Bold (LGB) Cardamom pods are cured slowly to retain their intense emerald color and sweet camphor essence.",
    price: 24.00,
    is_wholesale_only: false,
    weight_g: 100,
    origin: "Central Province, Sri Lanka",
    stock_quantity: 200,
    is_featured: true,
    images: [
      "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    id: "prod-7",
    category_id: "cat-3",
    category_slug: "spices",
    category_name: "Spices",
    name: "Bulk Ceylon Spices Export Container (Custom OEM Packaging)",
    slug: "bulk-ceylon-spices-export-container",
    short_description: "Wholesale & export bulk supply of Cinnamon, Pepper, Clove, and Cardamom for international distributors.",
    full_description: "Available in 25kg multi-wall paper bags, food-grade jute sacks, or custom private label pouches. Meets ISO 22000, HACCP, and USDA Organic certification standard for global export shipment.",
    price: 0.00,
    is_wholesale_only: true,
    weight_g: 25000,
    origin: "Colombo Port Dispatch, Sri Lanka",
    stock_quantity: 1000,
    is_featured: true,
    images: [
      "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80"
    ]
  },

  // HERBAL
  {
    id: "prod-8",
    category_id: "cat-1",
    category_slug: "herbal",
    category_name: "Herbal",
    name: "Gotu Kola (Centella Asiatica) Herbal Tea Elixir",
    slug: "gotu-kola-herbal-tea-elixir",
    short_description: "Traditional Sri Lankan memory and vitality herb formulated into a refreshing tisane.",
    full_description: "Gotu Kola has been revered for millennia in Sri Lankan Ayurvedic medicine to promote mental clarity, circulation, and skin radiance. Hand-dried leaves infused with lemongrass.",
    price: 11.50,
    is_wholesale_only: false,
    weight_g: 120,
    origin: "Kurunegala, Sri Lanka",
    stock_quantity: 350,
    is_featured: true,
    images: [
      "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    id: "prod-9",
    category_id: "cat-1",
    category_slug: "herbal",
    category_name: "Herbal",
    name: "Organic Moringa Leaf Powder (Superfood Grade)",
    slug: "organic-moringa-leaf-powder",
    short_description: "Nutrient-dense 'Miracle Tree' leaf powder packed with vitamins, iron, and amino acids.",
    full_description: "Gently shade-dried to conserve vitamins A, C, and E, our Sri Lankan Moringa Powder blends seamlessly into smoothies, juices, and morning wellness elixirs.",
    price: 13.90,
    is_wholesale_only: false,
    weight_g: 200,
    origin: "Hambantota, Sri Lanka",
    stock_quantity: 400,
    is_featured: false,
    images: [
      "https://images.unsplash.com/photo-1514733670139-4d87a1941d55?auto=format&fit=crop&w=800&q=80"
    ]
  },

  // FRUITS
  {
    id: "prod-10",
    category_id: "cat-4",
    category_slug: "fruits",
    category_name: "Fruits",
    name: "Sun-Dried Ceylon Mango Slices (No Added Sugar)",
    slug: "sun-dried-ceylon-mango-slices",
    short_description: "Naturally sweet Karutha Colomban mangoes gently dehydrated without sulfites.",
    full_description: "Enjoy the vibrant taste of tropical Sri Lanka. Made from 100% tree-ripened Ceylon mangoes sliced and dehydrated under strict temperature controls.",
    price: 8.75,
    is_wholesale_only: false,
    weight_g: 150,
    origin: "Jaffna & Anuradhapura, Sri Lanka",
    stock_quantity: 280,
    is_featured: true,
    images: [
      "https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    id: "prod-11",
    category_id: "cat-4",
    category_slug: "fruits",
    category_name: "Fruits",
    name: "Organic Dehydrated Pineapple Rings",
    slug: "organic-dehydrated-pineapple-rings",
    short_description: "Chewy, tangy Mauritius variety pineapple slices packed with natural digestive enzymes.",
    full_description: "Sourced from organic smallholder farms in Gampaha, these dehydrated pineapple rings contain zero artificial additives or added sugars.",
    price: 9.20,
    is_wholesale_only: false,
    weight_g: 150,
    origin: "Gampaha, Sri Lanka",
    stock_quantity: 310,
    is_featured: false,
    images: [
      "https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&w=800&q=80"
    ]
  },

  // VEGETABLES
  {
    id: "prod-12",
    category_id: "cat-5",
    category_slug: "vegetables",
    category_name: "Vegetables",
    name: "Dehydrated Sri Lankan Jackfruit (Young Polos & Mature Kos)",
    slug: "dehydrated-sri-lankan-jackfruit",
    short_description: "Plant-based meat alternative & dietary staple harvested fresh from Ceylon agro-forests.",
    full_description: "Our tender young dehydrated jackfruit (Polos) offers a meaty texture perfect for vegan curries, tacos, and savory stews. Shelf-stable for export convenience.",
    price: 10.50,
    is_wholesale_only: false,
    weight_g: 200,
    origin: "Ratnapura, Sri Lanka",
    stock_quantity: 220,
    is_featured: true,
    images: [
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80"
    ]
  },
  {
    id: "prod-13",
    category_id: "cat-5",
    category_slug: "vegetables",
    category_name: "Vegetables",
    name: "Export-Grade Dehydrated Red Onion Flakes",
    slug: "export-grade-dehydrated-red-onion-flakes",
    short_description: "Convenient, highly aromatic dehydrated onions ready for industrial culinary processing.",
    full_description: "Dehydrated under vacuum to seal in natural pungency, essential oils, and flavor profiles. Popular for food service and wholesale spice blending.",
    price: 0.00,
    is_wholesale_only: true,
    weight_g: 5000,
    origin: "Anuradhapura, Sri Lanka",
    stock_quantity: 800,
    is_featured: false,
    images: [
      "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=800&q=80"
    ]
  }
];

const blogPosts = [
  {
    id: "blog-1",
    title: "Why True Ceylon Cinnamon Outshines Cassia on the Global Market",
    slug: "true-ceylon-cinnamon-vs-cassia",
    cover_image: "https://images.unsplash.com/photo-1509358211525-24298075b281?auto=format&fit=crop&w=800&q=80",
    excerpt: "Discover the remarkable health benefits, ultra-low coumarin content, and artisan hand-rolling heritage behind Sri Lanka's 'Cinnamomum verum'.",
    author: "Dr. K. Jayawardena",
    read_time_min: 5,
    published_at: "2026-07-15T09:00:00Z",
    content: `
### The Golden Spice of Ceylon

For centuries, traders sailed thousands of nautical miles across the Indian Ocean in search of one priceless botanical: **True Ceylon Cinnamon** (*Cinnamomum verum*).

Unlike common **Cassia cinnamon** (*Cinnamomum cassia*) originating from China and Indonesia, authentic Ceylon Cinnamon is distinguished by its soft, papery layers, golden-brown tint, and delicate sweet perfume.

#### Ultra-Low Coumarin Content

The pivotal difference between Ceylon Cinnamon and Cassia lies in a compound called **coumarin**, which can be toxic to the liver in large doses.

- **Cassia Cinnamon:** Contains high concentrations of coumarin (up to 1% or 5,000 mg/kg).
- **Ceylon Cinnamon:** Contains negligible traces (less than 0.004% or 40 mg/kg).

This makes Ceylon Cinnamon the undisputed choice for health-conscious consumers, pharmaceutical formulations, and gourmet bakeries worldwide.

#### Handcrafted Heritage in Matara

Every quill exported by CEFI is stripped, peeled, and hand-rolled by master craftsmen whose skills have been passed down through generations in southern Sri Lanka. When you sample CEFI Cinnamon, you taste centuries of sustainable agro-forestry heritage.
    `
  },
  {
    id: "blog-2",
    title: "High Altitude vs Low Elevation Ceylon Teas: Understanding the Flavor Spectrum",
    slug: "high-altitude-vs-low-elevation-ceylon-teas",
    cover_image: "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=800&q=80",
    excerpt: "From the delicate mist-covered slopes of Nuwara Eliya to the bold, malty teas of Ruhuna, explore the microclimates of Ceylon tea.",
    author: "CEFI Tea Master",
    read_time_min: 6,
    published_at: "2026-07-02T14:30:00Z",
    content: `
### Ceylon Tea: A Microclimate Marvel

Sri Lanka is uniquely endowed with diverse topography, monsoonal wind patterns, and rich volcanic soil. This allows our island nation to produce distinct tea profiles within short geographical distances.

#### High Grown (Elevation: Above 4,000 ft)
Regions like **Nuwara Eliya**, **Dimbula**, and **Uva** produce teas characterized by bright clarity, exquisite bouquet, and pale golden liquor. The cool mountain breezes slow leaf growth, concentrating complex floral notes.

#### Medium Grown (Elevation: 2,000 - 4,000 ft)
Teas from **Kandy** offer citrus undertones, medium body, and reliable strength, making them popular for custom breakfast blends.

#### Low Grown (Elevation: Sea Level - 2,000 ft)
Teas from **Ruhuna** and **Sabaragamuwa** mature rapidly in warm coastal sunlight, developing deep dark leaf colors, intense maltiness, and rich strength prized across Middle Eastern and European markets.
    `
  },
  {
    id: "blog-3",
    title: "Sustainable Export Sourcing: How CEFI Empowers Sri Lankan Smallholder Farmers",
    slug: "sustainable-export-sourcing-cefi-smallholders",
    cover_image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80",
    excerpt: "Learn about CEFI's direct-farm partnership model, eco-friendly solar drying techniques, and commitment to zero-waste agricultural trade.",
    author: "Sustainability Team",
    read_time_min: 4,
    published_at: "2026-06-18T11:15:00Z",
    content: `
### Rooted in Ceylon, Growing Together

At Ceylon Eco Fresh Infinity (CEFI), sustainability is not just a slogan—it is our core operating principle.

Through our outgrower network across Matara, Kandy, and Kurunegala, we partner directly with over 300 family-owned smallholder farms.

#### Our Sustainable Commitments:
1. **Fair Farmgate Pricing:** Eliminating speculative middlemen to ensure farmers receive 25–40% higher returns.
2. **Solar Dehydration:** Utilizing eco-friendly parabolic solar dryers to process fruits and herbs with zero carbon emissions.
3. **Biodiversity Preservation:** Encouraging inter-cropping of spices alongside tea and coconut trees to safeguard natural soil biology.
    `
  }
];

module.exports = {
  categories,
  products,
  blogPosts
};
