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
      proudctId: {
        type: mongoose.Schema.ObjectId,
        ref: "Product",
      },
      proudctName: String,
      proudctQuantity: Number,
    }],
    posStock: { type: Boolean, default: false }

  },
  { timestamps: true }
);

module.exports = stockSchema;
