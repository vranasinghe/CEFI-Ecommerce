<div align="center">

# 🌴 CEFI — Ceylon Eco Fresh Infinity

### *Rooted in Ceylon, Grown for the World.*

**Sri Lanka's Trusted Name in Premium Natural Products**

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat&logo=supabase)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-000000?style=flat&logo=vercel)](https://vercel.com/)

</div>

---

## 📖 About

**Ceylon Eco Fresh Infinity (Pvt) Ltd. (CEFI)** is a specialized Sri Lankan enterprise dedicated to manufacturing, processing, and distributing high-grade agricultural produce and natural products:

- 🍃 **Pure Ceylon Tea** — Single-origin Black, Green, White & Herbal blended teas from Nuwara Eliya, Dimbula, and Uva highlands
- 🌿 **True Ceylon Cinnamon** — Authentic Alba-grade quills, cut cinnamon & pure organic powder
- 🌶️ **Unadulterated Spices** — Tellicherry Black Pepper, Emerald Cardamom, Cloves, Nutmeg & Mace
- 🌺 **Herbal & Botanical Products** — Gotu Kola, Moringa leaf powder & organic medicinal herbs
- 🍍 **Dehydrated Fruits & Produce** — Solar-dried mango, pineapple, young jackfruit & vegetables
- 🥥 **Coconut Products** — Extra virgin coconut oil, flour, desiccated coconut & value-added derivatives

### 🤝 Ethical Sourcing & Global Reach
- **Direct Outgrower Partnerships:** Direct connections with accredited farming communities across Sri Lanka's central highlands and southern spice belts ensure 100% traceability and ethical farmgate returns for over 300+ smallholder families.
- **Bulk, Private Label & OEM:** Partnered with trusted, certified manufacturing facilities across Sri Lanka to expand production capacity for bulk exports, private label packaging, and OEM solutions.
- **Quality & Certification:** Single-origin purity free from synthetic additives or artificial dyes, adhering to **ISO 22000 & HACCP** food safety standards.

---

## 🏛️ Legal & Compliance

**Ceylon Eco Fresh Infinity (Pvt) Ltd.** is a duly registered private limited company (**Reg. No. PV 00371966**) incorporated under Sri Lanka's **Companies Act No. 7 of 2007**, reflecting our commitment to full legal compliance, traceability, and transparency for our partners and buyers worldwide.

---

## 🚀 Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18.3 | Dynamic UI Component Framework |
| Vite | 5.4 | Next-gen Frontend Tooling & Dev Server |
| React Router DOM | v6 | Declarative Client-side Routing |
| Tailwind CSS | 3.4 | Custom Design System & Responsive Styling |
| Lucide React | 0.428 | Modern Vector Iconography |
| Supabase JS | 2.45 | Authentication, Database & Storage Client |

### Backend & Integrations
| Technology | Purpose |
|---|---|
| Node.js + Express | RESTful API & Business Logic Server |
| Supabase (PostgreSQL) | Relational Database with Row-Level Security (RLS) |
| Nodemailer + SMTP / Web3Forms | Transactional Order Confirmations & Quote Requests |
| Vercel | Production Serverless Deployment & Edge Routing |

---

## 📁 Project Structure

```
CEFI-Ecommerce/
├── frontend/                        # React + Vite frontend application
│   ├── public/                      # Static assets & media
│   │   ├── logo.png                 # CEFI emblem logo
│   │   ├── favicon.svg              # Browser tab favicon
│   │   ├── logo-text.png            # CEFI brand wordmark
│   │   └── images/                  # Product imagery & hero banners
│   ├── src/
│   │   ├── components/              # Modular UI components
│   │   │   ├── Header.jsx           # Sticky navigation & category dropdowns
│   │   │   ├── Footer.jsx           # Global footer with links & company info
│   │   │   ├── CartDrawer.jsx       # Interactive slide-over cart drawer
│   │   │   ├── QuoteModal.jsx       # Export wholesale quote request modal
│   │   │   └── LoginPromptModal.jsx # Auth prompt modal
│   │   ├── pages/                   # Application route pages
│   │   │   ├── HomePage.jsx         # Hero showcase, categories & highlights
│   │   │   ├── ProductsPage.jsx     # Catalog browsing, search & category filters
│   │   │   ├── ProductDetailPage.jsx# Product specs, pricing & cart actions
│   │   │   ├── CartPage.jsx         # Full cart review & item modifications
│   │   │   ├── CheckoutPage.jsx     # Multi-step checkout & payment flow
│   │   │   ├── AboutPage.jsx        # Company profile, vision, mission & values
│   │   │   ├── ContactPage.jsx      # Inquiries & location contact details
│   │   │   ├── BlogPage.jsx         # Agro-insights & articles
│   │   │   ├── BlogPostPage.jsx     # Single article view
│   │   │   ├── AccountPage.jsx      # Order history & profile management
│   │   │   ├── AdminDashboard.jsx   # Admin management panel
│   │   │   └── AdminProductForm.jsx # Product creation & editing
│   │   ├── context/
│   │   │   ├── AuthContext.jsx      # User authentication state (Google, Email)
│   │   │   └── CartContext.jsx      # Global cart state & local persistence
│   │   ├── utils/
│   │   │   └── supabase.js          # Supabase client initialization
│   │   ├── App.jsx                  # Route definitions & layout wrappers
│   │   └── main.jsx                 # Application entry point
│   └── index.html                   # HTML template with SEO metadata
│
├── backend/                         # Node.js Express API backend
│   ├── server.js                    # REST API routes & email dispatch
│   ├── supabaseClient.js            # Admin Supabase client instance
│   └── schema.sql                   # Database schemas & table definitions
│
├── vercel.json                      # Vercel deployment & rewrite configuration
├── .gitignore
└── README.md
```

---

## ⚙️ Getting Started

### Prerequisites
- Node.js **v18+**
- npm **v9+**
- [Supabase](https://supabase.com/) project credentials

### 1. Clone the Repository
```bash
git clone https://github.com/vranasinghe/CEFI-Ecommerce.git
cd CEFI-Ecommerce
```

### 2. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```
> Frontend runs locally at: **http://localhost:3000** (or Vite allocated port)

### 3. Setup Backend
```bash
cd ../backend
npm install
```

Create a `.env` file in the `/backend` directory:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
PORT=5000
```

Start the backend server:
```bash
node server.js
```
> Backend runs locally at: **http://localhost:5000**

---

## 🌿 Core Features

| Feature | Description |
|---|---|
| 🛍️ **Comprehensive Catalog** | Pure Ceylon Teas, Spices, Herbs, Dried Fruits & Coconut derivatives |
| 🔍 **Real-Time Filtering** | Instant search, category filters, and sorting controls |
| 🛒 **Cart & Checkout** | Persistent cart drawer, subtotal calculations, and streamlined checkout |
| 📋 **B2B / OEM Quotes** | Tailored wholesale quote request system with instant notification |
| 👤 **Authentication** | Secure Google OAuth & Email/Password authentication via Supabase |
| 📦 **Order Tracking** | Customer dashboard for viewing historical orders and dispatch status |
| 📝 **Agro Blog** | Educational articles on Ceylon cinnamon, single-origin teas, and spices |
| 📬 **Inquiry System** | Multi-channel email alerts (SMTP / Nodemailer & Web3Forms) |
| 🔐 **Admin Suite** | Product inventory management, order oversight, and analytics |
| 📱 **Responsive UI** | Mobile-first, responsive layouts designed with rich aesthetics |
| 🔒 **Enterprise Security** | PostgreSQL Row-Level Security (RLS) protecting customer data |

---

## 🌐 Deployment

The application is configured for continuous deployment on **Vercel**:

```bash
# Frontend build
cd frontend
npm run build
```

`vercel.json` coordinates client-side routing rewrites and serverless backend functions.

---

## 📬 Contact & Inquiries

**Ceylon Eco Fresh Infinity (Pvt) Ltd.**  
*Sri Lanka | Global Export Solutions*

- 🌐 **Website:** [cefi.vercel.app](https://cefi.vercel.app)
- 📧 **Inquiries:** info@cefi.lk
- 🐙 **Repository:** [vranasinghe/CEFI-Ecommerce](https://github.com/vranasinghe/CEFI-Ecommerce)

---

## 📄 License & Attribution

© 2026 **Ceylon Eco Fresh Infinity (Pvt) Ltd.** (Reg. PV 00371966). All rights reserved.

> *Authentic Ceylon Tea, True Cinnamon, unadulterated spices, and premium agricultural products — ethically harvested and delivered worldwide.*
