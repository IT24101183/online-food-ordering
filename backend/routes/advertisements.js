const express = require("express");
const router = express.Router();
const Advertisement = require("../models/Advertisement");
const multer = require("multer");
const { advertisementStorage } = require("../config/cloudinary");

const upload = multer({ storage: advertisementStorage });

// @route   GET api/advertisements
// @desc    Get all posters
router.get("/", async (req, res) => {
  try {
    const posters = await Advertisement.find().sort({ createdAt: -1 });
    res.json(posters);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   POST api/advertisements
// @desc    Upload a new poster
router.post("/", upload.single("image"), async (req, res) => {
  try {
    // Check current count
    const count = await Advertisement.countDocuments();
    if (count >= 5) {
      // If we already have 5, we shouldn't allow another upload until one is removed
      // But we will allow the dynamic replacement if it was an edit. 
      // This endpoint is only for clean ADD.
      if (req.file) {
        fs.unlinkSync(req.file.path); // Delete the uploaded file if we are over limit
      }
      return res.status(400).json({ message: "Maximum limit of 5 posters reached. Please delete an existing poster first." });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Image is required" });
    }

    const newPoster = new Advertisement({
      imageUrl: req.file.path, // Cloudinary secure_url
    });

    await newPoster.save();
    res.status(201).json(newPoster);
  } catch (err) {
    console.error("Create poster error:", err.message);
    res.status(500).send("Server Error");
  }
});

// @route   PUT api/advertisements/:id
// @desc    Update/Replace a poster
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    let poster = await Advertisement.findById(req.params.id);
    if (!poster) return res.status(404).json({ message: "Poster not found" });

    if (req.file) {
        // Cloudinary handles new uploads, we can skip local unlink
        poster.imageUrl = req.file.path; // Cloudinary secure_url
    }

    await poster.save();
    res.json(poster);
  } catch (err) {
    console.error("Update poster error:", err.message);
    res.status(500).send("Server Error");
  }
});

// @route   DELETE api/advertisements/:id
// @desc    Delete a poster
router.delete("/:id", async (req, res) => {
  try {
    const poster = await Advertisement.findById(req.params.id);
    if (!poster) return res.status(404).json({ message: "Poster not found" });

    // Delete physical file
    const filePath = path.join(__dirname, '..', poster.imageUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await Advertisement.findByIdAndDelete(req.params.id);
    res.json({ message: "Poster deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
