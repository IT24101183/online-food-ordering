const express = require("express");
const router = express.Router();
const Promotion = require("../models/Promotion");
const multer = require("multer");
const { promotionStorage } = require("../config/cloudinary");

// Configure Storage for Promotion Images with Cloudinary
const upload = multer({ storage: promotionStorage });

// @route   POST api/promotions
// @desc    Add a new promotion
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { name, startDate, endDate, discountValue, items, categories } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: "Promotion image is required." });
    }

    const newPromotion = new Promotion({
      name,
      startDate,
      endDate,
      discountValue: discountValue ? Number(discountValue) : 0,
      image: req.file.path, // Cloudinary secure_url
      items: items ? JSON.parse(items) : [],
      categories: categories ? JSON.parse(categories) : [],
    });

    await newPromotion.save();
    res.status(201).json(newPromotion);
  } catch (err) {
    console.error("Create Promotion Error:", err);
    res.status(500).json({ message: "Server error while adding promotion." });
  }
});

// @route   GET api/promotions
// @desc    Get all promotions
router.get("/", async (req, res) => {
  try {
    const promotions = await Promotion.find()
      .populate("items", "name")
      .populate("categories", "name")
      .sort({ createdAt: -1 });
    res.json(promotions);
  } catch (err) {
    res.status(500).json({ message: "Server error fetching promotions." });
  }
});

// @route   PATCH api/promotions/:id
// @desc    Update a promotion
router.patch("/:id", upload.single("image"), async (req, res) => {
  try {
    const { name, startDate, endDate, discountValue, items, categories } = req.body;
    let updateData = {
      name,
      startDate,
      endDate,
      discountValue: discountValue !== undefined ? Number(discountValue) : undefined,
      items: items ? JSON.parse(items) : undefined,
      categories: categories ? JSON.parse(categories) : undefined,
    };

    if (req.file) {
      updateData.image = req.file.path; // Cloudinary secure_url
    }

    const updatedPromotion = await Promotion.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );
    res.json(updatedPromotion);
  } catch (err) {
    console.error("Update Promotion Error:", err);
    res.status(500).json({ message: "Server error updating promotion." });
  }
});

// @route   DELETE api/promotions/:id
// @desc    Delete a promotion
router.delete("/:id", async (req, res) => {
  try {
    await Promotion.findByIdAndDelete(req.params.id);
    res.json({ message: "Promotion deleted successfully." });
  } catch (err) {
    res.status(500).json({ message: "Server error deleting promotion." });
  }
});

module.exports = router;
