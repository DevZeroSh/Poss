const mongoose = require("mongoose");

const assetsSchema = new mongoose.Schema(
  {
    name: { type: String, require: true },
    code: { type: String },
    buyingprice: { type: String, default: 0 },
    currentValue: Number,
    usefulLife: String, // using in life
    salvageValue: { type: Number, default: 0 }, // save price
    sellingPrice: Number,
    annualDepreciation: Number, //using in years
    parentAccountCode: {
      type: String,
      default: 1210,
    },
    startDate: String,
    endDate: String,
    type: { type: String },
  },
  { timestamps: true }
);

module.exports = assetsSchema;
