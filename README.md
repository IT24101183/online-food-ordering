# EatUP  Online Food Ordering System

![EatUP Banner](https://res.cloudinary.com/dbbihgoyy/image/upload/v1776286204/Screenshot_2026-04-16_021937_jshwju.png) 




> A full-stack mobile food ordering application built with React Native, Node.js, Express.js, and MongoDB Atlas.

---

##  Live Demo

| Service | URL |
|---------|-----|
| 🌐 Backend API | [https://online-food-ordering-83zf.onrender.com](https://online-food-ordering-83zf.onrender.com) |
| 📱 Frontend | React Native (Expo Go) |
| 🗄️ Database | MongoDB Atlas (AWS) |

---

## 📱 About The App

**EatUP** is a full stack mobile application that allows customers to browse food items, add them to cart, place orders, and pay online  all from a single mobile app.

### ✨ Key Features

- 🔐 **User Authentication** — Register, Login with JWT & bcrypt
- 🍽️ **Food Browsing** — Browse items by category with images
- 🛒 **Shopping Cart** — Add, update, and remove items
- 📦 **Order Management** — Place orders and track status
- 💳 **Online Payment** — Secure bank card payment recording
- ⭐ **Reviews & Ratings** — Rate food items with photo uploads
- 🎁 **Promotions** — Discount promotions on categories and items
- 👤 **Admin Panel** — Manage products, orders, users, promotions

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|-----------|
| 📱 Frontend | React Native + Expo Go |
| ⚙️ Backend | Node.js + Express.js |
| 🗄️ Database | MongoDB Atlas (AWS Free Tier) |
| 🔐 Auth | JWT + bcrypt |
| 🖼️ Images | Cloudinary |
| ☁️ Hosting | Render.com |
| 📂 Version Control | GitHub |

---

## 📁 Project Structure

```
online-food-ordering/
│
├── 📂 backend/
│   ├── 📂 routes/
│   │   ├── users.js          # Auth & user management
│   │   ├── categories.js     # Food categories
│   │   ├── items.js          # Food items / products
│   │   ├── cart.js           # Shopping cart
│   │   ├── orders.js         # Order management
│   │   ├── payments.js       # Payment processing
│   │   ├── promotions.js     # Promotions & discounts
│   │   ├── reviews.js        # Reviews & ratings
│   │   └── advertisements.js # Advertisements
│   ├── 📂 models/            # MongoDB schemas
│   ├── 📂 middleware/        # JWT auth middleware
│   ├── 📂 uploads/           # File upload handling (Multer)
│   ├── server.js             # Entry point
│   └── package.json
│
└── 📂 frontend/
    ├── 📂 screens/           # React Native screens
    ├── 📂 components/        # Reusable components
    ├── 📂 navigation/        # App navigation
    ├── 📂 services/          # API service calls
    ├── App.js                # Entry point
    └── package.json
```

---

## 📡 API Endpoints

### Auth & Users
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/users/register` | Register new user | Public |
| POST | `/api/users/login` | Login & get JWT | Public |
| GET | `/api/users/all` | Get all users | Admin |
| PUT | `/api/users/profile/:id` | Update profile | JWT |
| DELETE | `/api/users/:id` | Delete user | Admin |

### Food Items
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/items` | Get all food items | Public |
| POST | `/api/items` | Add new item | Admin |
| PUT | `/api/items/:id` | Update item | Admin |
| PATCH | `/api/items/:id/stock` | Update stock | Admin |
| DELETE | `/api/items/:id` | Delete item | Admin |

### Orders
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/orders` | Place new order | JWT |
| GET | `/api/orders/user/:userId` | Get user orders | JWT |
| GET | `/api/orders/admin` | Get all orders | Admin |
| PATCH | `/api/orders/:id/status` | Update status | Admin |

### Payments
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/payments/confirm` | Confirm payment | JWT |
| GET | `/api/payments` | Get all payments | Admin |

> 📄 For full API documentation see `API_Endpoint_Table.pdf` in the submission folder.

---

## ⚙️ Setup & Installation

### Backend

```bash
# Clone the repository
git clone https://github.com/IT24101183/online-food-ordering.git

# Navigate to backend
cd online-food-ordering/backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Add your: MONGO_URI, JWT_SECRET, CLOUDINARY credentials

# Run the server
npm start
```

### Frontend

```bash
# Navigate to frontend
cd online-food-ordering/frontend

# Install dependencies
npm install

# Install Expo CLI
npm install -g expo-cli

# Start with Expo
npx expo start
```

---

## 🔧 Environment Variables

Create a `.env` file in the `/backend` folder:

```env
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
PORT=5000
```

