const { default: mongoose } = require("mongoose");

const stockSchema = new mongoose.Schema(
  {
    name: String,
    slug: {
      type: String,
      lowercase: true,
    },
    description: {
      type: String,
      default: "Stock description",
    },
    location: String,
    posStock: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = stockSchema;
