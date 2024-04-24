const mongoose = require("mongoose");

const ecommerceOrderSchema = new mongoose.Schema(
  {
    customar: {
      type: mongoose.Schema.ObjectId,
      ref: "Customar",
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
      },
    ],

    shippingAddress: {
      details: String,
      phone: String,
      city: String,
      postalCode: String,
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
      enum: ["card", "cash"],
      default: "cash",
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    paidAt: Date,
    isDelivered: {
      type: Boolean,
      default: false,
    },
    deliveredAt: Date,
  },
  { timestamps: true }
);

ecommerceOrderSchema.pre(/^find/, function (next) {
  this.populate({
    path: "customar",
    select: "name email phone",
  });

  next();
});

module.exports = ecommerceOrderSchema;
