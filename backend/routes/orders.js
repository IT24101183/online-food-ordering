const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Item = require("../models/Item");

// @route   POST api/orders
// @desc    Create a new order from cart and clear cart
router.post("/", async (req, res) => {
  try {
    const { userId, totalAmount, items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Cannot place an order with an empty cart." });
    }

    // Capture items with snapshots of current basic info
    const orderItems = items.map((item) => ({
      itemId: item.itemId._id,
      name: item.itemId.name,
      price: item.itemId.price,
      quantity: item.quantity,
    }));

    const orderNumber = "ORD-" + Date.now().toString().slice(-6);

    const newOrder = new Order({
      userId,
      orderNumber,
      items: orderItems,
      totalAmount,
      status: "pending",
      paymentStatus: "pending",
    });

    await newOrder.save();

    // Clear the cart after order creation
    await Cart.findOneAndUpdate({ userId }, { items: [] });

    res.status(201).json(newOrder);
  } catch (err) {
    console.error("Order Creation Error:", err);
    res.status(500).json({ message: "Server error while creating order." });
  }
});

// @route   GET api/orders/user/:userId
// @desc    Get order history for a specific user
router.get("/user/:userId", async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Server error fetching order history." });
  }
});

// @route   GET api/orders/admin
// @desc    Get all orders for the Admin (Incoming)
router.get("/admin", async (req, res) => {
  try {
    // Only fetch orders that are not settled if needed, but for now fetch all sorted by new
    const orders = await Order.find().populate("userId").sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Server error fetching admin orders." });
  }
});

// @route   PATCH api/orders/:id/status
// @desc    Update order status (By Admin)
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    
    // Find the order first to get its _id or orderNumber if needed
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found." });

    // Cascading Cancellation logic
    if (status === "cancelled") {
      const Payment = require("../models/Payment");
      await Payment.findOneAndUpdate(
        { orderId: order._id },
        { status: "refunded" }
      );
    }

    if (status === "ready") {
      order.readyAt = Date.now();
    }

    order.status = status;
    await order.save();
    
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: "Server error updating order status." });
  }
});

module.exports = router;
