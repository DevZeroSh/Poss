const mongoose = require("mongoose");

const invoiceHistorySchema = new mongoose.Schema(
  {
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    historyType: {
      type: String,
      enum: ["create", "edit", "return", "cancel", "payment"],
      required: true,
    },
    employeeId: {
      type: mongoose.Schema.ObjectId,
      ref: "Employee",
    },
    date: String,
    desc: String,
  },
  { timestamps: true }
);
module.exports = invoiceHistorySchema;
