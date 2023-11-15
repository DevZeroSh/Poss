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
        buyingprice: Number,
        tax: String,
        price: Number,
        taxRate: [String],
        serialNumber: [String],
        totalPrice: Number,
      },
    ],
    paidAt: String,
    totalPriceWithTax: Number,
    totalPriceWitheOutTax: Number,

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
  })
    .populate({ path: "employee", select: "name profileImg email phone" })
    .populate({ path: "invoices.tax", select: "tax" });

  next();
});

const PurchaseInvoicesModel = mongoose.model(
  "PurchaseInvoices",
  PurchaseInvoicesSchema
);

module.exports = PurchaseInvoicesModel;
