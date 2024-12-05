const mongoose = require("mongoose");

const SalesPointSchema = new mongoose.Schema(
  {
    name: String,
    stock: { id: String, name: String, _id: false },
    funds: [{ id: String, name: String, _id: false }],
    isOpen: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = SalesPointSchema;
