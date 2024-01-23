const mongoose = require("mongoose");

const reportsFinancialFundsSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    exchangeAmount: {
      type: Number,
    },
    expense: {
      type: mongoose.Schema.ObjectId,
      ref: "Expenses",
    },
    order: {
      type: mongoose.Schema.ObjectId,
      ref: "Orders",
    },
    invoice: {
      type: mongoose.Schema.ObjectId,
      ref: "PurchaseInvoices",
    },
    type: {
      type: String,
      enum: ["expense", "order", "purchase", "transfer", "transfer_to"],
    },
    financialFundId: {
      type: mongoose.Schema.ObjectId,
      ref: "FinancialFunds",
    },
    finalPriceMainCurrency:Number,
    financialFundRest: Number,
    exchangeRate: Number,
  },
  { timestamps: true }
);

module.exports = reportsFinancialFundsSchema;
