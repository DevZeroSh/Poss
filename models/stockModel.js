const { default: mongoose } = require("mongoose");

const stockSchema = new mongoose.Schema(
  {
    name: String,
    slug: {
      type: String,
      lowercase: true,
    },
    number: String,
    productCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = stockSchema;
