const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

const mongoURI = process.env.MONGO_URI;

mongoose
  .connect(mongoURI)
  .then(async () => {
    console.log("✅ Connected to MongoDB successfully!");
    
    // Seed Protected Admin Account
    const User = require("./models/User");
    const bcrypt = require("bcryptjs");
    
    try {
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;
      
      if (!adminEmail || !adminPassword) {
        console.warn("⚠️  ADMIN_EMAIL or ADMIN_PASSWORD missing from .env. Skipping admin seeding.");
        return;
      }
      
      const adminExists = await User.findOne({ email: adminEmail });
      if (!adminExists) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);
        
        await User.create({
          name: "System Administrator",
          email: adminEmail,
          telephone1: "000",
          address: "Admin Dashboard",
          password: hashedPassword,
          role: "admin"
        });
        console.log("👑 Protected Admin account successfully created!");
      } else {
        console.log("🛡️ Protected Admin account already exists.");
      }
    } catch (err) {
      console.error("❌ Error creating Admin account:", err);
    }
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Required for PayHere Notify

// Routes Integration
const adminRoutes = require("./routes/users");
const categoryRoutes = require("./routes/categories");
const itemRoutes = require("./routes/items");
const advertisementRoutes = require("./routes/advertisements");
const cartRoutes = require("./routes/cart");
const orderRoutes = require("./routes/orders");
const paymentRoutes = require("./routes/payments");
const promotionRoutes = require("./routes/promotions");
const reviewRoutes = require("./routes/reviews");

app.use("/api/users", adminRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/advertisements", advertisementRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/reviews", reviewRoutes);

// Static file serving for images
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use("/uploads", express.static(uploadDir));

app.get("/", (req, res) => {
  res.json({ message: "Food Ordering API is running successfully!" });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
