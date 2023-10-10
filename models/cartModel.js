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
        price: Number,
        name: String,
        qr:String
      },
    ],
    totalCartPrice: Number,
    totalPriceAfterDiscount: Number,
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const CartModel = mongoose.model("Cart", cartSchema);
module.exports = CartModel;
