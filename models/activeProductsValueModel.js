const mongoose = require("mongoose");

const ActiveProductsValueModel = new mongoose.Schema(
  {
    activeProductsCount: {
      type: Number,
      default: 0,
      required: true,
    },
    activeProductsValue: {
      type: Number,
      default: 0,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = ActiveProductsValueModel;
