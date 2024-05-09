const { default: mongoose } = require("mongoose");

const stokSchema = new mongoose.Schema(
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

module.exports = stokSchema;
