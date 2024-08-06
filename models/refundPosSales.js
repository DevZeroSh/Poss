const mongoose = require("mongoose");

const refundPosSalesSchema = new mongoose.Schema(
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
    fish: [String],
    cartItems: [
      {
        product: {
          type: mongoose.Schema.ObjectId,
          ref: "Product",
        },

        quantity: Number,
        taxPrice: Number,
        taxRate: Number,
        taxs: Number,
        price: Number,
        name: String,
        qr: String,
      },
    ],
    priceExchangeRate: {
      type: Number,
      default: 0,
    },
    invoicePrice: {
      type: Number,
      default: 0,
    },
    // paymentMethodType: { type: String, default: "Nakit" },
    totalOrderPrice: Number,
    totalPriceAfterDiscount: Number,
    currencyCode: String,

    paymentMethodType: String,
    quantity: Number,
    paidAt: String,
    coupon: String,
    couponCount: String,
    couponType: String,
    counter: {
      type: String,
      unique: true,
    },
    customarName: String,
    customerId: String,
    customarEmail: String,
    customarPhone: String,
    customaraddres: String,
    type: {
      type: String,
      default: "pos refund",
    },
  },

  { timestamps: true }
);

module.exports = refundPosSalesSchema;
