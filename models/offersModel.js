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
      required: true,
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
    type: {
      type: String,
      enum: ["poss", "ecommerce"],
      default: "poss",
    },
    imageTr: String,
    imageAr: String,
  },
  { timestamps: true }
);

module.exports = offerSchema;
