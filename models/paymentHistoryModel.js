const mongoose = require("mongoose");

const PaymentHistorySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["paid", "invoice"],
    },
    not: {
      type: String,
    },
    date: {
      type: String,
    },
    rest: {
      type: Number,
    },
    amount: {
      type: Number,
    },
    customerId: {
      type: String,
    },
    supplierId: {
      type: String,
    },
    invoiceNumber: Number,
  },
  { timestamps: true }
);
module.exports = PaymentHistorySchema;
