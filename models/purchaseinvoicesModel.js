const mongoose = require("mongoose");

const PurchaseInvoicesSchema = new mongoose.Schema(
  {
    invoices: [
      {
        product: {
          type: mongoose.Schema.ObjectId,
          ref: "Product",
        },
        quantity: Number,
        name: String,
        qr: String,
        taxPrice: Number,
        tax: String,
        price: Number,
        serialNumber: [String],
      },
    ],
    totalPrice: Number,
    totalPriceAfterDiscount: Number,
    discountCount: String,
    supplier: {
      type: mongoose.Schema.ObjectId,
      ref: "Supplier",
    },
    employee: {
      type: mongoose.Schema.ObjectId,
      ref: "Employee",
    },
  },
  { timestamps: true }
);
PurchaseInvoicesSchema.pre(/^find/, function (next) {
  this.populate({
    path: "supplier",
    select: "supplierName companyName phoneNumber email address",
  }).populate({ path: "employee", select: "name profileImg email phone" });

  next();
});

const PurchaseInvoicesModel = mongoose.model(
  "PurchaseInvoices",
  PurchaseInvoicesSchema
);

module.exports = PurchaseInvoicesModel;
