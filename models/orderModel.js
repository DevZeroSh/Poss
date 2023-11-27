const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.ObjectId,
      ref: "Employee",
    },
    cartItems: [
      {
        product: {
          type: mongoose.Schema.ObjectId,
          ref: "Product",
        },
        quantity: Number,
        taxPrice: Number,
        name: String,
        qr: String,
      },
    ],
    taxPrice: {
      type: Number,
      default: 0,
    },
    // paymentMethodType: { type: String, default: "Nakit" },
    totalOrderPrice: Number,
    isPadid: {
      type: Boolean,
      default: false,
    },
    financialFunds: 
      {
        type: mongoose.Schema.ObjectId,
        ref: "FinancialFunds",
      },
    
    paidAt: String,
    coupon: String,
    couponCount: String,
    couponType: String,
  },
  { timestamps: true }
);

orderSchema.pre(/^find/, function (next) {
  this.populate({
    path: "employee",
    select: "name profileImg email phone",
  }).populate({
    path: "cartItems.product",
    select: "name  price",
  });

  next();
});

const orderModel = mongoose.model("Orders", orderSchema);
module.exports = orderModel;
