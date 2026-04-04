const mongoose = require("mongoose");
const { USER_ROLES, DEFAULT_ROLE } = require("../utils/constants");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    telephone1: {
      type: String,
      required: true,
    },
    telephone2: {
      type: String,
    },
    address: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    registeredDate: {
      type: Date,
      default: Date.now,
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: DEFAULT_ROLE,
    },
    profilePicture: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", userSchema);

module.exports = User;
