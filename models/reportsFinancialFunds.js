const mongoose = require("mongoose");

const reportsFinancialFundsSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    fundNameform: String,

    fundNameto: String,

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
      enum: [
        "expense",
        "order",
        "purchase",
        "transfer-form",
        "transfer_to",
        "Opening Balance",
        "return",
      ],
    },
    financialFundId: {
      type: mongoose.Schema.ObjectId,
      ref: "FinancialFunds",
    },
    financialFundRest: Number,
    exchangeRate: Number,
  },
  { timestamps: true }
);

module.exports = reportsFinancialFundsSchema;
