const mongoose = require("mongoose");

const ProductMovementSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      default: 0,
    },
    newQuantity: {
      type: Number,
      default: 0,
    },
    oldPrice: {
      type: Number,
      default: 0,
    },
    newPrice: {
      type: Number,
      default: 0,
    },
    movementType: {
      type: String,
      enum: ["in", "out", "edit"],
    },
    type: String,
    source: {
      type: String,
      default: "",
      required: true,
    },
  },
  { timestamps: true }
);
module.exports = ProductMovementSchema;
