const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const User = require("../models/User");
const { USER_ROLES, DEFAULT_ROLE } = require("../utils/constants");

const { profileStorage } = require("../config/cloudinary");

// Multer storage for profile pictures with Cloudinary
const upload = multer({ storage: profileStorage });

// @route   PUT api/users/profile/:id
// @desc    Update user profile data and image
router.put("/profile/:id", upload.single("image"), async (req, res) => {
  try {
    const { name, telephone1 } = req.body;
    let user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name) user.name = name;
    if (telephone1) user.telephone1 = telephone1;
    
    if (req.file) {
      // Cloudinary handles new uploads
      user.profilePicture = req.file.path; // Cloudinary secure_url
    }

    await user.save();
    res.json({ 
      message: "Profile updated successfully", 
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        telephone1: user.telephone1,
        profilePicture: user.profilePicture,
        registeredDate: user.registeredDate
      } 
    });
  } catch (err) {
    console.error("Profile update error:", err.message);
    res.status(500).send("Server Error");
  }
});

// @route   POST api/users/register
// @desc    Register a user (Staff or Customer)
router.post("/register", async (req, res) => {
  try {
    const { name, email, telephone1, telephone2, address, password, role } = req.body;
    console.log("Registration attempt:", { email, roleRequested: role });

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Determine final role - ensure it's one of the allowed values
    let finalRole = DEFAULT_ROLE;
    if (role && Object.values(USER_ROLES).includes(role)) {
      finalRole = role;
    }

    user = new User({
      name,
      email,
      telephone1: telephone1 || "0000000000",
      telephone2,
      address: address || "Not Provided",
      password: hashedPassword,
      role: finalRole,
    });

    await user.save();
    console.log("User saved successfully with role:", user.role);
    res.status(201).json({ message: "User registered successfully!" });
  } catch (err) {
    console.error("Registration error:", err.message);
    res.status(500).send("Server Error");
  }
});

// @route   GET api/users/all
// @desc    Get all users (Staff & Customers)
router.get("/all", async (req, res) => {
  try {
    const users = await User.find().select("-password");
    const staff = users.filter(u => u.role === USER_ROLES.ADMIN || u.role === USER_ROLES.STAFF);
    const customers = users.filter(u => u.role === USER_ROLES.CUSTOMER);
    res.json({ staff, customers });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   PUT api/users/staff/:id
// @desc    Update staff member data
router.put("/staff/:id", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    let user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name) user.name = name;
    if (email) user.email = email;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();
    res.json({ message: "Staff member updated successfully", user });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   DELETE api/users/:id
// @desc    Delete a user (Staff or Customer)
router.delete("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   POST api/users/login
// @desc    Login user
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid Credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid Credentials" });
    }

    const payload = { userId: user.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({ 
      token, 
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        telephone1: user.telephone1,
        profilePicture: user.profilePicture,
        registeredDate: user.registeredDate
      },
      message: "Login successful!" 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error: " + err.message });
  }
});

module.exports = router;
