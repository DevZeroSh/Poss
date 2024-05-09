const { default: mongoose } = require("mongoose");

const stockSchema = new mongoose.Schema(
  {
    name: String,
    slug: {
      type: String,
      lowercase: true,
    },
    number: String,
    productCount: Number,
  },
  { timestamps: true }
);

module.exports = stockSchema;
