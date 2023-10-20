const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    cartItems: [
      {
        prodcut: {
          type: mongoose.Schema.ObjectId,
          ref: "Product",
        },
        quantity: { type: Number, default: 1 },
        taxPrice: Number,
        name: String,
        qr: String,
      },
    ],
    coupon: String,
    totalCartPrice: Number,
    totalPriceAfterDiscount: Number,
    employee: {
      type: mongoose.Schema.ObjectId,
      ref: "Employee",
    },
  },
  { timestamps: true }
);

const CartModel = mongoose.model("Cart", cartSchema);
module.exports = CartModel;
