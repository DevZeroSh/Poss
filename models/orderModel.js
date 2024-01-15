const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
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
          required: true,
        },
        allocatedAmount: {
          type: Number,
        },
        exchangeRate: Number,
      },
    ],
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
    // paymentMethodType: { type: String, default: "Nakit" },
    totalOrderPrice: Number,

    currencyCode: String,
    isPadid: {
      type: Boolean,
      default: false,
    },
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
      type: Number,
      default: 0,
      unique: true,
    },
    customarName: String,
    customarEmail: String,
    customarPhone: String,
    customaraddres: String,
    fundsCount: { type: Number },
  },
  { timestamps: true }
);

orderSchema.pre(/^find/, function (next) {
  this.populate({
    path: "employee",
    select: "name profileImg email phone",
  })
    .populate({
      path: "financialFunds.fundId",
      select: "fundName",
    })
    .populate({
      path: "onefinancialFunds",
      select: "fundName",
    });

  next();
});

module.exports = orderSchema;
