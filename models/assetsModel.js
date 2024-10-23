const mongoose = require("mongoose");

const assetsSchema = new mongoose.Schema({
  name: { type: String, require: true },
  code: { type: String },
  buyingprice: { type: String, default: 0 },
  currentValue: Number,
  usefulLife: String,
  salvageValue: { type: Number, default: 0 },
  sellingPrice: Number,
  annualDepreciation: Number,
  parentAccountCode: {
    type: String,
    default: 1210,
  },
  type: { type: String },
});

module.exports = assetsSchema;
