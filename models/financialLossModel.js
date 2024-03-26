const mongoose = require("mongoose");

const FinancialLossSchema = new mongoose.Schema(
  {
    title: String,
    items: [
      {
        productBarcode: {
          type: String,
          trim: true,
          required: [true, "productBarcode is required"],
        },
        productName: {
          type: String,
          trim: true,
          required: [true, "productName is required"],
        },
        difference: {
          type: Number,
          trim: true,
          required: [true, "difference is required"],
        },
        productTotalValue: Number,
      },
    ],
    reportTotalValue: Number,
    reportRef: {
      type: mongoose.Schema.ObjectId,
      ref: "Reconciliation",
    },
  },
  { timestamps: true }
);
module.exports = FinancialLossSchema;
