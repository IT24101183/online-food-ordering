const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Payment = require("../models/Payment");

// @route   GET api/payments
// @desc    Get filtered payment transactions and summary stats (Admin)
router.get("/", async (req, res) => {
  try {
    const { filter } = req.query;
    let dateFilter = {};
    const now = new Date();

    if (filter === "daily") {
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));
      dateFilter = { createdAt: { $gte: startOfDay } };
    } else if (filter === "last24h") {
      const last24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      dateFilter = { createdAt: { $gte: last24 } };
    } else if (filter === "week") {
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      startOfWeek.setHours(0, 0, 0, 0);
      dateFilter = { createdAt: { $gte: startOfWeek } };
    }

    // Fetch Transactions with Deep Population (Order -> User)
    const transactions = await Payment.find(dateFilter)
      .populate({
        path: "orderId",
        select: "orderNumber totalAmount items createdAt",
        populate: {
          path: "userId",
          select: "name email telephone1 profilePicture address role"
        }
      })
      .sort({ createdAt: -1 });

    // Calculate Summary Stats
    const stats = {
      total: transactions.length,
      success: transactions.filter(p => p.status === "success").length,
      fail: transactions.filter(p => p.status === "failed").length,
      refund: transactions.filter(p => p.status === "refunded").length,
    };

    res.json({ transactions, stats });
  } catch (err) {
    console.error("Fetch Payments Error:", err);
    res.status(500).json({ message: "Server error fetching financial data." });
  }
});

// @route   POST api/payments/confirm
// @desc    Custom Payment Confirmation (Bank Card Simulation)
router.post("/confirm", async (req, res) => {
  try {
    const { orderId, amount, method } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({ message: "Order ID and Amount are required." });
    }

    const order = await Order.findOne({ orderNumber: orderId });
    if (!order) return res.status(404).json({ message: "Order not found." });

    order.paymentStatus = "paid";
    order.status = "pending";
    await order.save();

    const newPayment = new Payment({
      orderId: order._id,
      method: method || "Bank Card",
      amount: parseFloat(amount),
      status: "success",
      transactionId: "TXN-" + Date.now().toString().slice(-8),
    });
    await newPayment.save();

    res.status(200).json({ message: "Payment Approved", paymentId: newPayment.transactionId });
  } catch (err) {
    console.error("Payment Confirmation Error:", err);
    res.status(500).json({ message: "Server error during payment confirmation." });
  }
});

module.exports = router;
