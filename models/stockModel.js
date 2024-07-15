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

    products: [{
      productId: {
        type: mongoose.Schema.ObjectId,
        ref: "Product",
      },
      productName: String,
      productQuantity: Number,
    }],
    posStock: { type: Boolean, default: false }

  },
  { timestamps: true }
);

module.exports = stockSchema;
