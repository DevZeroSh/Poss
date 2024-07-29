const mongoose = require("mongoose");

const orderFishSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.ObjectId,
      ref: "Employee",
    },
    financialFunds: [
      {
        fundId: {
          type: mongoose.Schema.ObjectId,
          ref: "FinancialFunds",
        },
        allocatedAmount: {
          type: Number,
        },
        exchangeRate: Number,
        exchangeRateIcon: String,
      },
    ],
    onefinancialFunds: {
      type: mongoose.Schema.ObjectId,
      ref: "FinancialFunds",
    },

    exchangeRate: Number,
    fundExchangeRate: Number,

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
        taxs: Number,
        price: Number,
        name: String,
        qr: String,
        exchangeRate: Number,
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
        taxs: Number,
        price: Number,
        name: String,
        qr: String,
        exchangeRate: Number,
      },
    ],
    priceExchangeRate: {
      type: Number,
      default: 0,
    },
    totalOrderPrice: Number,
    totalPriceAfterDiscount: Number,
    currencyCode: String,
    financialFundsRef: {
      type: mongoose.Schema.ObjectId,
      ref: "FinancialFunds",
    },
    paymentMethodType: String,
    quantity: Number,
    paidAt: String,
    coupon: String,
    couponCount: String,
    couponType: String,
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
  },

  { timestamps: true }
);



module.exports = orderFishSchema;
