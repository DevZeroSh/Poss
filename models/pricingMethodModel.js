const mongoose = require("mongoose");

const pricingMethodSchema = new mongoose.Schema({
  selectedCategory: {
    type: mongoose.Schema.ObjectId,
    ref: "Category",
    unique: true, // Add unique constraint
    required: true,
  },

  percentageIncrease: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
});

module.exports = pricingMethodSchema;
