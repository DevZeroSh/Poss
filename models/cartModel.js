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
        taxs: Number,
        price: Number,
      },
    ],
    coupon: String,
    totalCartPrice: Number,
    totalPriceAfterDiscount: Number,
    couponCount: String,
    couponType: String,
    employee: {
      type: mongoose.Schema.ObjectId,
      ref: "Employee",
    },
  },
  { timestamps: true }
);

const CartModel = mongoose.model("Cart", cartSchema);
module.exports = CartModel;
