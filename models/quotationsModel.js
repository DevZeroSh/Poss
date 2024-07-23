const mongoose = require("mongoose");

const quotationSchema = new mongoose.Schema(
  {
    cartItems: [
      {
        product: { type: String, ref: "Product" },
        quantity: { type: Number },
        price: { type: Number },
        name: { type: String },
        qr: { type: String },
        taxRate: { type: Number },
        taxPrice: { type: Number },
        taxs: { type: Number },
        totalTax: { type: Number },
        type: { type: String },
        buyingPrice: { type: Number },
        exchangeRate: { type: Number },
      },
    ],
    customarId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
    },
    customarName: { type: String },
    exchangeRate: { type: Number },
    priceExchangeRate: { type: Number },
    totalQuotationPrice: { type: Number },
    currency: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    description: { type: String, default: "" },
    counter: { type: String, default: 0 },
  },
  { timestamps: true }
);

module.exports = quotationSchema;
