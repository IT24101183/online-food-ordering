const mongoose = require("mongoose");

const PromotionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      required: true,
    },
    startDate: {
      type: String, // String format (e.g., DD/MM/YYYY) as per UI images
      required: true,
    },
    endDate: {
      type: String,
      required: true,
    },
    items: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Item",
      },
    ],
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    discountValue: {
        type: Number,
        default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Promotion = mongoose.model("Promotion", PromotionSchema);

module.exports = Promotion;
