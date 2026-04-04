const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Review = require("../models/Review");
const User = require("../models/User"); // Required for populate
const Item = require("../models/Item"); // Required for populate
const Order = require("../models/Order"); // Required for populate
const { reviewStorage } = require("../config/cloudinary");

// Multer Setup with Cloudinary
const upload = multer({ storage: reviewStorage });

// @route   GET api/reviews
// @desc    Get all reviews (Admin only)
router.get("/", async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("userId", "name email")
      .populate("itemId", "name image")
      .populate("orderId", "_id total")
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error fetching all reviews" });
  }
});

// @route   POST api/reviews
// @desc    Submit a review for an item in an order
router.post("/", upload.array("images", 5), async (req, res) => {
  try {
    const { userId, orderId, itemId, rating } = req.body;
    
    // Check if review already exists for this item in this order
    let existingReview = await Review.findOne({ orderId, itemId, userId });
    if (existingReview) {
      return res.status(400).json({ message: "Review already exists for this item in this order." });
    }

    const imagePaths = req.files ? req.files.map(file => file.path) : [];

    const newReview = new Review({
      userId,
      orderId,
      itemId,
      rating: parseInt(rating),
      images: imagePaths,
    });

    await newReview.save();
    res.status(201).json(newReview);
  } catch (err) {
    console.error("Review creation error:", err.message);
    res.status(500).json({ message: "Server Error submitting review" });
  }
});

// @route   GET api/reviews/user/:userId
// @desc    Get all reviews by a user
router.get("/user/:userId", async (req, res) => {
  try {
    const reviews = await Review.find({ userId: req.params.userId })
      .populate("itemId", "name image")
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error fetching user reviews" });
  }
});

// @route   GET api/reviews/item/:itemId
// @desc    Get all reviews for an item
router.get("/item/:itemId", async (req, res) => {
  try {
    const reviews = await Review.find({ itemId: req.params.itemId })
      .populate("userId", "name")
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error fetching item reviews" });
  }
});

// @route   PUT api/reviews/:id
// @desc    Update a review
router.put("/:id", upload.array("images", 5), async (req, res) => {
  try {
    const { rating } = req.body;
    let review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });

    if (rating) review.rating = parseInt(rating);
    
    if (req.files && req.files.length > 0) {
      // Delete old images
      review.images.forEach(img => {
        if (fs.existsSync(img)) fs.unlinkSync(img);
      });
      review.images = req.files.map(file => `uploads/reviews/${file.filename}`);
    }

    await review.save();
    res.json(review);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error" });
  }
});

// @route   DELETE api/reviews/:id
// @desc    Delete a review
router.delete("/:id", async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });

    // Delete images
    review.images.forEach(img => {
      if (fs.existsSync(img)) fs.unlinkSync(img);
    });

    await Review.findByIdAndDelete(req.params.id);
    res.json({ message: "Review deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
