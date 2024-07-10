const mongoose = require("mongoose");

const ecommerceOrderSchema = new mongoose.Schema(
  {
    customar: {
      type: mongoose.Schema.ObjectId,
      ref: "customar",
      required: [true, "Order must be belong to user"],
    },
    cartItems: [
      {
        product: {
          type: mongoose.Schema.ObjectId,
          ref: "Product",
        },
        quantity: Number,
        price: Number,
        taxPrice: {
          type: Number,
          default: 0,
        },
        orderStatus: {
          type: String,
          enum: [
            "requested",
            "approved",
            "cancelled",
            "processed",
            "shipped",
            "delivered",
            "not delivered",
            "returned",
          ],
          default: "requested",
        },
      },
    ],
    date: String,
    shippingAddress: {
      alias: String,
      details: String,
      phone: String,
      city: String,
      postalCode: String,
      fullName: String,
      phone: String,
    },
    billingAddress: {
      alias: String,
      details: String,
      phone: String,
      city: String,
      postalCode: String,
      fullName: String,
      phone: String,
    },
    shippingPrice: {
      type: Number,
      default: 0,
    },
    totalOrderPrice: {
      type: Number,
    },
    paymentMethodType: {
      type: String,
      enum: ["card", "cash", "transfer"],
      default: "cash",
    },
    isPaid: {
      type: Boolean,
      default: true,
    },
    paidAt: Date,
    deliveredAt: Date,
    orderNumber: String,
  },
  { timestamps: true }
);

module.exports = ecommerceOrderSchema;
