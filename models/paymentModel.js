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
    financialFundsCurrencyCode: String,
    data: String,
    invoiceNumber: String,
    counter: {
      type: String,
      default: 0,
      unique: true,
    },
    financialFundsName: String,
    financialFundsId: String,
    payid: [
      {
        id: String,
        status: String,
        paymentInFundCurrency: Number,
        paymentMainCurrency: Number,
        paymentInvoiceCurrency: Number,
        invoiceTotal: String,
        invoiceName: String,
        _id: false,
      },
    ],
    type: String,
    date: String,
    description: String,
  },
  { timestamps: true }
);

module.exports = PaymentSchema;
