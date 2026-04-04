const express = require("express");
const router = express.Router();
const Category = require("../models/Category");
const multer = require("multer");
const { categoryStorage } = require("../config/cloudinary");

// Multi-part form setup with Cloudinary
const upload = multer({ storage: categoryStorage });

// @route   POST api/categories
// @desc    Create a new category
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { name, isEnabled } = req.body;
    if (!req.file) {
      return res.status(400).json({ message: "Category image is required" });
    }

    const newCategory = new Category({
      name,
      image: req.file.path, // Cloudinary secure_url
      isEnabled: isEnabled === "true", // FormData sends strings
    });

    await newCategory.save();
    res.status(201).json(newCategory);
  } catch (err) {
    console.error("Create category error:", err.message);
    if (err.code === 11000) {
      return res.status(400).json({ message: "Category name already exists" });
    }
    res.status(500).send("Server Error");
  }
});

// @route   GET api/categories
// @desc    Get all categories
router.get("/", async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.json(categories);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   PUT api/categories/:id
// @desc    Update a category
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const { name, isEnabled } = req.body;
    let category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    if (name) category.name = name;
    if (isEnabled !== undefined) category.isEnabled = isEnabled === "true";
    
    if (req.file) {
      // Potentially Delete old image here if needed (via cloudinary.uploader.destroy)
      category.image = req.file.path; // Cloudinary secure_url
    }

    await category.save();
    res.json(category);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   DELETE api/categories/:id
// @desc    Delete a category
router.delete("/:id", async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Category not found" });

    // Optional: Delete physical file from filesystem
    if (fs.existsSync(category.image)) {
        fs.unlinkSync(category.image);
    }

    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: "Category deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
