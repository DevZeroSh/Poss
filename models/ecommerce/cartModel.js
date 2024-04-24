const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    cartItems: [
      {
        product: {
          type: mongoose.Schema.ObjectId,
          ref: "Product",
        },
        quantity: { type: Number, default: 1 },
        taxPrice: Number,
        name: String,
        qr: String,
        taxRate: Number,
        totalPriceAfterDiscount:Number,
        taxs: Number,
        price: Number,
      },
    ],
    coupon: String,
    totalCartPrice: Number,
    totalPriceAfterDiscount: Number,
    couponCount: String,
    couponType: String,

    customar: {
      type: mongoose.Schema.ObjectId,
      ref: "Customar",
    },
  },
  { timestamps: true }
);

module.exports = cartSchema;
