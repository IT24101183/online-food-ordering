const express = require("express");
const router = express.Router();
const Item = require("../models/Item");
const multer = require("multer");
const { itemStorage } = require("../config/cloudinary");

// Configure Storage for Item Images with Cloudinary
const upload = multer({ storage: itemStorage });

// @route   POST api/items
// @desc    Add a new item
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { name, description, price, categories, stock, isEnabled } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: "Item image is required." });
    }

    const newItem = new Item({
      name,
      description,
      price,
      image: req.file.path, // Cloudinary secure_url
      categories: JSON.parse(categories), // Expecting array of Category IDs
      stock: parseInt(stock) || 0,
      isEnabled: isEnabled === "true",
    });

    await newItem.save();
    res.status(201).json(newItem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while adding item." });
  }
});

// @route   GET api/items
// @desc    Get all items with category population
router.get("/", async (req, res) => {
  try {
    const items = await Item.find().populate("categories");
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: "Server error fetching items." });
  }
});

// @route   PUT api/items/:id
// @desc    Update an item
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const { name, description, price, categories, stock, isEnabled } = req.body;
    let updateData = {
      name,
      description,
      price,
      categories: JSON.parse(categories),
      stock: parseInt(stock),
      isEnabled: isEnabled === "true",
    };

    if (req.file) {
      updateData.image = req.file.path; // Cloudinary secure_url
    }

    const updatedItem = await Item.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(updatedItem);
  } catch (err) {
    res.status(500).json({ message: "Server error updating item." });
  }
});

// @route   DELETE api/items/:id
// @desc    Delete an item
router.delete("/:id", async (req, res) => {
  try {
    await Item.findByIdAndDelete(req.params.id);
    res.json({ message: "Item deleted successfully." });
  } catch (err) {
    res.status(500).json({ message: "Server error deleting item." });
  }
});

// @route   PATCH api/items/:id/stock
// @desc    Update item stock (+/-)
router.patch("/:id/stock", async (req, res) => {
  try {
    const { type } = req.body; // 'inc' or 'dec'
    const adjustment = type === 'inc' ? 1 : -1;
    
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    
    if (type === 'dec' && item.stock <= 0) {
        return res.status(400).json({ message: "Stock cannot be negative" });
    }

    item.stock += adjustment;
    await item.save();
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: "Server error updating stock." });
  }
});

module.exports = router;
