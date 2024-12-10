const mongoose = require("mongoose");

const SalesPointSchema = new mongoose.Schema(
  {
    name: String,
    stock: { id: String, name: String, _id: false },
    funds: [{ id: String, name: String, _id: false }],
    sold: Number,
    isOpen: { type: Boolean, default: false },
    location: String,
  },
  { timestamps: true }
);

module.exports = SalesPointSchema;
