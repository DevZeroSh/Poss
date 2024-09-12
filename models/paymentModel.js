const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
  {
    supplierName: {
      type: String,
    },
    supplierId: {
      type: String,
    },
    customerName: {
      type: String,
    },
    customerId: {
      type: String,
    },
    purchaseId: {
      type: String,
    },
    total: {
      type: Number,
      require: true,
    },
    totalMainCurrency: {
      type: Number,
      default: 0,
    },
    exchangeRate: {
      type: Number,
      default: 1,
    },
    currencyCode: String,
    data: String,
    invoiceNumber: String,
    counter: {
      type: String,
      default: 0,
      unique: true,
    },
    ordersPayid: [{ type: String, order: String, _id: false }],
    date: String,
    description: String,
  },
  { timestamps: true }
);

module.exports = PaymentSchema;
