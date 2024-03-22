const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
  {
    supplerName: {
      type: String,
    },
    CustomerName: {
      type: String,
    },
    tottal: {
      type: Number,
      require: true,
    },
  },
  { timestamps: true }
);

module.exports = PaymentSchema;
