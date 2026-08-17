<div align="center">

# 🌴 CEFI — Ceylon Eco Fresh Infinity

### *Rooted in Ceylon, Grown for the World.*

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat&logo=supabase)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-000000?style=flat&logo=vercel)](https://vercel.com/)

</div>

---

## 📖 About

**Ceylon Eco Fresh Infinity (Pvt) Ltd. (CEFI)** is a premium Sri Lankan agro-export company specializing in:

- 🍃 **Pure Ceylon Tea** — Single-origin, world-class quality
- 🌿 **True Ceylon Cinnamon** — Authentic & organic
- 🌶️ **Rare Spices** — Pepper, Cardamom, Cloves & more
- 🥥 **Coconut Products** — Oil, Flour, Desiccated & beyond
- 🌺 **Herbs & Botanicals** — Gotu Kola, Moringa & exotic herbs
- 🍍 **Dehydrated Tropical Fruits** — Sun-dried, export-grade produce

This repository contains the **full-stack e-commerce web application** for CEFI, enabling wholesale & retail product browsing, quote requests, order management, and global export dispatch.

---

## 🚀 Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18.3 | UI Framework |
| Vite | 5.4 | Build Tool & Dev Server |
| React Router DOM | v6 | Client-side Routing |
| Tailwind CSS | 3.4 | Utility-first Styling |
| Lucide React | 0.428 | Icon Library |
| EmailJS | 4.4 | Contact & Quote Emails |
| Supabase JS | 2.45 | Auth & Database Client |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express | REST API Server |
| Supabase (PostgreSQL) | Database, Auth & Storage |
| Vercel | Serverless Deployment |

---

## 📁 Project Structure

```
CEFI-Ecommerce/
├── frontend/                        # React + Vite frontend
│   ├── public/                      # Static assets
│   │   ├── logo.png                 # CEFI palm tree logo
│   │   ├── favicon.svg              # Browser tab icon
│   │   ├── logo-text.png            # CEFI wordmark
│   │   └── images/                  # Product & hero images
│   ├── src/
│   │   ├── components/              # Reusable UI components
│   │   │   ├── Header.jsx           # Navigation & logo
│   │   │   ├── Footer.jsx           # Footer with links
│   │   │   ├── CartDrawer.jsx       # Slide-in cart panel
│   │   │   └── QuoteModal.jsx       # Request a quote popup
│   │   ├── pages/                   # Route-level page components
│   │   │   ├── HomePage.jsx         # Landing page & hero
│   │   │   ├── ProductsPage.jsx     # Product catalog & filters
│   │   │   ├── ProductDetailPage.jsx# Single product view
│   │   │   ├── CartPage.jsx         # Cart summary
│   │   │   ├── CheckoutPage.jsx     # Checkout flow
│   │   │   ├── AboutPage.jsx        # Company story
│   │   │   ├── ContactPage.jsx      # Contact form
│   │   │   ├── BlogPage.jsx         # Blog listing
│   │   │   ├── BlogPostPage.jsx     # Single blog post
│   │   │   ├── AccountPage.jsx      # User profile & orders
│   │   │   ├── AdminDashboard.jsx   # Admin panel
│   │   │   └── AdminProductForm.jsx # Add/Edit products
│   │   ├── context/
│   │   │   ├── AuthContext.jsx      # Auth state (Google, FB, Email)
│   │   │   └── CartContext.jsx      # Cart state management
│   │   ├── utils/
│   │   │   └── supabase.js          # Supabase client config
│   │   ├── App.jsx                  # Root component & routes
│   │   └── main.jsx                 # Entry point
│   └── index.html                   # HTML shell with SEO meta tags
│
├── backend/                         # Node.js Express API
│   ├── server.js                    # Main API server
│   ├── supabaseClient.js            # Supabase admin connection
│   ├── schema.sql                   # Full database schema
│   └── uploads/                     # Product image storage
│
├── vercel.json                      # Vercel deployment config
├── .gitignore
└── README.md
```

---

## ⚙️ Getting Started

### Prerequisites
- Node.js **v18+**
- npm **v9+**
- [Supabase](https://supabase.com/) account & project

### 1. Clone the Repository
```bash
git clone git@github.com:vranasinghe/CEFI-Ecommerce.git
cd CEFI-Ecommerce
```

### 2. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```
> Frontend runs on: **http://localhost:3001**

### 3. Setup Backend
```bash
cd backend
npm install
```

Create a `.env` file in `/backend` (copy from `.env.example`):
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
> Backend runs on: **http://localhost:5000**

---

## 🌿 Features

| Feature | Description |
|---|---|
| 🛍️ Product Catalog | Browse products by category — Tea, Spices, Herbs, Coconut, Fruits |
| 🔍 Search & Filter | Real-time product search and category filtering |
| 🛒 Shopping Cart | Slide-in cart drawer with quantity management |
| 📋 Request a Quote | Export quote request modal with EmailJS delivery |
| 👤 Authentication | Google OAuth, Facebook OAuth & Email/Password login |
| 📦 Order Management | View and track orders from user account |
| 📝 Blog & News | Company news, product stories & agro insights |
| 📬 Contact Form | Direct contact form with EmailJS integration |
| 🔐 Admin Dashboard | Manage products, orders and users |
| 📱 Responsive Design | Fully optimized for mobile, tablet and desktop |
| 🔒 Row-Level Security | Supabase RLS for data protection |

---

## 🌐 Deployment

The application is deployed on **Vercel**.

```bash
# Build the frontend for production
cd frontend
npm run build
```

The `vercel.json` at root handles both frontend routing and backend API proxying.

---

## 🗄️ Database

Powered by **Supabase (PostgreSQL)**. Schema available at:
- [`backend/schema.sql`](./backend/schema.sql) — Full table definitions
- [`database.sql`](./database.sql) — Additional migrations

---

## 📬 Contact

**Ceylon Eco Fresh Infinity (Pvt) Ltd.**
Sri Lanka | Global Export

- 🌐 Website: [cefi.vercel.app](https://cefi.vercel.app)
- 📧 Email: info@cefi.lk
- 🐙 GitHub: [vranasinghe/CEFI-Ecommerce](https://github.com/vranasinghe/CEFI-Ecommerce)

---

## 📄 License

© 2026 **Ceylon Eco Fresh Infinity (Pvt) Ltd.** All rights reserved.

> *Premium Sri Lankan tea, authentic True Cinnamon, rare spices, sun-dried tropical fruits, and organic agricultural produce — processed and exported under world-class quality standards.*
