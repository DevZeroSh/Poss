const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
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
    cartItems: [
      {
        product: {
          type: mongoose.Schema.ObjectId,
          ref: "Product",
        },
        buyingPrice: Number,
        quantity: Number,
        taxPrice: Number,
        taxRate: Number,
        taxs: String,
        price: Number,
        name: String,
        qr: String,
        exchangeRate: Number,
        stockId: String,
        stockName: String,
        _id: false,
      },
    ],

    returnCartItem: [
      {
        product: {
          type: mongoose.Schema.ObjectId,
          ref: "Product",
        },
        buyingPrice: Number,
        quantity: Number,
        taxPrice: Number,
        taxRate: Number,
        taxs: String,
        price: Number,
        name: String,
        qr: String,
        exchangeRate: Number,
        _id: false,
      },
    ],
    totalPriceExchangeRate: {
      type: Number,
      default: 0,
    },
    totalOrderPrice: Number,
    totalPriceAfterDiscount: Number,
    currencyCode: String,
    currencyId: String,
    quantity: Number,
    counter: {
      type: String,
      default: 0,
      unique: true,
    },
    customarId: String,
    customarName: String,
    customarEmail: String,
    customarPhone: String,
    customaraddres: String,
    date: String,
    description: String,
    type: {
      type: String,
      enum: ["normal", "bills", "openBalance", "ecommerce"],
      default: "normal",
    },
    fish: [String],
    paid: {
      type: String,
      default: "unpaid",
      enum: ["paid", "unpaid"],
    },
    shippingPrice: { type: String, default: "" },
    totalRemainderMainCurrency: { type: Number, default: 0 },
    totalRemainder: { type: Number, default: 0 },
    payments: [
      {
        payment: Number,
        paymentMainCurrency: Number,
        financialFunds: String,
        financialFundsCurrencyCode: String,
        date: String,
        _id: false,
      },
    ],
    openingBalanceId: String,
    reportsBalanceId: String,
  },

  { timestamps: true }
);

module.exports = orderSchema;
