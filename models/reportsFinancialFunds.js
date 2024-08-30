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
    totalPriceAfterDiscount: { type: Number, default: 0 },
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
    payment: {
      type: mongoose.Schema.ObjectId,
      ref: "Payment",
    },
    invoice: {
      type: mongoose.Schema.ObjectId,
      ref: "PurchaseInvoices",
    },
    type: {
      type: String,
      enum: [
        "expense",
        "sales",
        "purchase",
        "transfer-form",
        "transfer_to",
        "Opening Balance",
        "refund-sales",
        "refund-purchase",
        "payment-sup",
        "payment-cut",
        "cancel"
      ],
    },
    financialFundId: {
      type: mongoose.Schema.ObjectId,
      ref: "FinancialFunds",
    },
    financialFundRest: Number,
    exchangeRate: Number,
    runningBalance: Number,
  },
  { timestamps: true }
);

module.exports = reportsFinancialFundsSchema;
