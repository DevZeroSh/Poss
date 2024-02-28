const mongoose = require("mongoose");

const returnPurchaseInvicesSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.ObjectId,
      ref: "Employee",
    },
    onefinancialFunds: {
      type: mongoose.Schema.ObjectId,
      ref: "FinancialFunds",
    },

    exchangeRate: Number,

    invoices: [
      {
        product: String,
        qr: String,
        name: String,
        buyingprice: Number,
        taxRate: Number,
        quantity: Number,
        exchangeRate: Number,
      },
    ],
    priceExchangeRate: {
      type: Number,
      default: 0,
    },
    totalPurchasePrice: Number,
    invoiceCurrency: String,
    isPadid: {
      type: Boolean,
      default: false,
    },
    paymentMethodType: String,
    quantity: Number,
    paidAt: String,
    counter: {
      type: String,
      unique: true,
    },

    type: {
      type: String,
      default: "return Purchase",
    },
  },

  { timestamps: true }
);

module.exports = returnPurchaseInvicesSchema;
