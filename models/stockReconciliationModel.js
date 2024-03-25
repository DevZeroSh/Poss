const mongoose = require("mongoose");

const stockReconcilSchema = new mongoose.Schema(
  {
    title: String,
    reconcilingDate: Date,
    items: [
      {
        productId: {
          type: mongoose.Schema.ObjectId,
          ref: "Product",
        },
        productBarcode: String,
        productName: String,
        recordCount: Number,
        realCount: Number,
        difference: Number,
        reconcilingReason: String,
        reconciled: Boolean,
        buyingPrice: Number,
        exchangeRate: Number,
      },
    ],
    employee: String,
  },
  { timestamps: true }
);

module.exports = stockReconcilSchema;
