const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: String,
    discountPercentage: {
      type: Number,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: { type: Boolean, default: false },
    applicableProducts: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    ],
    winProduct: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    soldCountToWin: Number,
    type: {
      type: String,
      enum: ["poss", "ecommerce", "oneProduct"],
      default: "poss",
    },
    imageTr: String,
    imageAr: String,
  },
  { timestamps: true }
);

module.exports = offerSchema;
