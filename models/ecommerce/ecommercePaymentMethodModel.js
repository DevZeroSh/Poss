const mongoose = require("mongoose");

const ecommercePaymentMethodSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      require: [true, "Payment method name is required"],
      unique: [true, "Payment method name must be unique"],
    },
    description: String,
    extraCharge: Number,
    minAmount: Number,
    maxAmount: Number,
    status: Boolean,
    ibanNumber: String,
    ibanName: String,
    bankName: String,
  },
  { timestamps: true }
);

module.exports = ecommercePaymentMethodSchema;
