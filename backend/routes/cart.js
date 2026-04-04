const express = require("express");
const router = express.Router();
const Cart = require("../models/Cart");

// @route   GET /api/cart/:userId
// @desc    Get user's cart items
router.get("/:userId", async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.params.userId }).populate("items.itemId");
    if (!cart) {
      return res.status(200).json({ userId: req.params.userId, items: [] });
    }
    res.json(cart);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   POST /api/cart/add
// @desc    Add item to cart or increment quantity
router.post("/add", async (req, res) => {
  const { userId, itemId, quantity = 1 } = req.body;
  
  try {
    let cart = await Cart.findOne({ userId });
    
    if (cart) {
      // Check if item already exists in cart
      const itemIndex = cart.items.findIndex((item) => item.itemId.toString() === itemId);
      
      if (itemIndex > -1) {
        // Item exists, increment quantity
        cart.items[itemIndex].quantity += quantity;
      } else {
        // New item for this cart
        cart.items.push({ itemId, quantity });
      }
      cart = await cart.save();
      return res.status(200).json(cart);
    } else {
      // Create new cart for user
      const newCart = new Cart({
        userId,
        items: [{ itemId, quantity }],
      });
      const savedCart = await newCart.save();
      return res.status(201).json(savedCart);
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   POST /api/cart/update
// @desc    Update quantity of an item specifically
router.post("/update", async (req, res) => {
  const { userId, itemId, quantity } = req.body;
  
  try {
    let cart = await Cart.findOne({ userId });
    
    if (!cart) {
      return res.status(404).json({ msg: "Cart not found" });
    }
    
    const itemIndex = cart.items.findIndex((p) => p.itemId.toString() === itemId);
    
    if (itemIndex > -1) {
      if (quantity <= 0) {
        // Remove item if quantity is 0 or less
        cart.items.splice(itemIndex, 1);
      } else {
        cart.items[itemIndex].quantity = quantity;
      }
      cart = await cart.save();
      return res.status(200).json(cart);
    } else {
      return res.status(404).json({ msg: "Item not found in cart" });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   DELETE /api/cart/:userId
// @desc    Clear user's cart
router.delete("/:userId", async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.params.userId });
    if (cart) {
      cart.items = [];
      await cart.save();
      return res.status(200).json({ msg: "Cart cleared" });
    }
    res.status(404).json({ msg: "Cart not found" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
