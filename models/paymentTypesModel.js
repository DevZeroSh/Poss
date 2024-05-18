const mongoose = require("mongoose");

const paymentTypesSchema = new mongoose.Schema(
  {
    paymentDescription: {
      type: String,
      default: "description",
    },
    paymentType: {
      type: String,
      require: [true, "You have to select one payment type"],
    },
    haveRatio: {
      type: String,
      enum: [true, false],
      default: false,
    },
    bankRatio: {
      type: Number,
      default: 0,
    },
    expenseCategory: {
      type: mongoose.Schema.ObjectId,
      ref: "ExpensesCategory",
    },
  },
  { timestamps: true }
);

module.exports = paymentTypesSchema;
