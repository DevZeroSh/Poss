const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
  {
    supplierName: {
      type: String,
    },
    supplerId: {
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
    exchangeRate:{
      type: Number,
      default: 1,
    },
    currencyCode:String,
  },
  { timestamps: true }
);

module.exports = PaymentSchema;
