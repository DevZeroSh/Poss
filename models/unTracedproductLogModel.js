const mongoose = require("mongoose");

const UnTracedproductLogSchema = new mongoose.Schema(
  {
    type: String,
    buyingPrice: Number,
    sellingPrice: Number,
    name: String,
    quantity: Number,
    desc: String,
    tax: { _id: String, tax: Number },
    totalWithoutTax: Number,
    total: Number,

  },
  { timestamps: true }
);
module.exports = UnTracedproductLogSchema;
