# 🌴 CEFI — Ceylon Eco Fresh Infinity

> **Rooted in Ceylon, Grown for the World.**

Ceylon Eco Fresh Infinity (Pvt) Ltd. (CEFI) is a premium Sri Lankan agro-export company. This repository contains the full-stack e-commerce web application for CEFI — enabling wholesale/retail product browsing, quote requests, and export dispatch management.

---

## 🚀 Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 | UI Framework |
| Vite | Build Tool & Dev Server |
| React Router DOM v6 | Client-side Routing |
| Tailwind CSS | Styling |
| Lucide React | Icons |
| EmailJS | Contact / Quote Email |
| Supabase JS | Auth & Database Client |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express | REST API Server |
| Supabase | PostgreSQL Database & Auth |
| Vercel | Deployment |

---

## 📁 Project Structure

```
CEFI Ecommerce/
├── frontend/                  # React + Vite frontend
│   ├── public/                # Static assets (logo, favicon, icons)
│   ├── src/
│   │   ├── components/        # Reusable UI components (Header, Footer, Cart, etc.)
│   │   ├── pages/             # Page components (Home, Products, Blog, etc.)
│   │   ├── context/           # React Context (Auth, Cart)
│   │   └── utils/             # Supabase client & helpers
│   └── index.html
│
├── backend/                   # Node.js Express backend
│   ├── server.js              # Main API server
│   ├── supabaseClient.js      # Supabase connection
│   ├── schema.sql             # Database schema
│   └── uploads/               # Product image uploads
│
├── vercel.json                # Vercel deployment config
└── README.md
```

---

## ⚙️ Getting Started

### Prerequisites
- Node.js v18+
- npm
- Supabase account

### 1. Clone the repository
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
Frontend runs on: `http://localhost:3001`

### 3. Setup Backend
```bash
cd backend
npm install
```

Create a `.env` file in `/backend` based on `.env.example`:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
PORT=5000
```

Then start the server:
```bash
node server.js
```

---

## 🌿 Features

- 🛍️ Product catalog with categories (Tea, Spices, Herbs, Coconut, Fruits)
- 🔍 Product search and filtering
- 🛒 Shopping cart with drawer UI
- 📋 Request a Quote modal
- 👤 User authentication (Google, Facebook, Email)
- 📦 Order management
- 📝 Blog / News section
- 📬 Contact form with EmailJS
- 🔐 Admin dashboard
- 📱 Fully responsive design

---

## 🌐 Deployment

The app is deployed on **Vercel**.

```bash
# Build frontend for production
cd frontend
npm run build
```

---

## 📄 License

© 2026 Ceylon Eco Fresh Infinity (Pvt) Ltd. All rights reserved.
