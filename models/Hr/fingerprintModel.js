const mongoose = require("mongoose");

const fingerPrintSchema = new mongoose.Schema(
  {
    name: String,
    userID: String,
    email: String,
    Time: String,
    date: String,
    type: { type: String, enum: ["Check-in", "Check-out"] },
  },
  { timestamps: true }
);

module.exports = fingerPrintSchema;
