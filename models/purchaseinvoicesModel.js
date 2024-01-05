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
        taxRate: Number,
        buyingprice: Number,
        totalTax: Number,
        priceAfterPrice: Number,
        totalWitheOutTaxPrice: Number,
        totalWitheTaxPrice: Number,
        totalPrice: String,
        serialNumber: [String],
      },
    ],
    paidAt: String,
    totalProductTax: Number,
    totalPriceWitheOutTax: Number,
    finalPrice: Number,
    totalQuantity: Number,
    totalbuyingprice: Number,
    supplier: String,
    supplierPhone: String,
    supplierEmail: String,
    supplierAddress: String,
    supplierCompany: String,
    invoiceCurrency: String,
    invoiceFinancialFund: String,

    paid: {
      type: String,
      default: "unpaid",
      enum: ["paid", "unpaid"],
    },
    employee: {
      type: mongoose.Schema.ObjectId,
      ref: "Employee",
    },
    counter: {
      type: Number,
      default: 0,
      unique: true,
    },
  },
  { timestamps: true }
);
PurchaseInvoicesSchema.pre(/^find/, function (next) {
  this.populate({
    path: "supplier",
    select: "supplierName companyName phoneNumber email address tax",
  }).populate({ path: "employee", select: "name profileImg email phone" });

  next();
});

const PurchaseInvoicesModel = mongoose.model(
  "PurchaseInvoices",
  PurchaseInvoicesSchema
);

module.exports = PurchaseInvoicesModel;
