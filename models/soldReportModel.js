const mongoose = require("mongoose");

const soldReportSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["weekly", "monthly"],
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        name: String,
        sold: Number,
      },
    ],
  },
  { timestamps: true }
);

module.exports = soldReportSchema;
