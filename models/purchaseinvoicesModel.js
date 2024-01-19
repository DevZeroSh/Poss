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
        taxId: {
          type: mongoose.Schema.ObjectId,
          ref: "Tax",
        },
        buyingprice: Number,
        totalTax: Number,
        priceAfterPrice: Number,
        totalWitheOutTaxPrice: Number,
        totalWitheTaxPrice: Number,
        totalPrice: String,
        currency:Number,
        serialNumber: [String],
      },
    ],
    paidAt: String,
    totalProductTax: Number,
    totalPriceWitheOutTax: Number,
    finalPrice: Number,
    totalQuantity: Number,
    totalbuyingprice: Number,

    suppliers: { type: mongoose.Schema.ObjectId, ref: "Supplier" },
    supplier: String,
    supplierPhone: String,
    supplierEmail: String,
    supplierAddress: String,
    supplierCompany: String,
    invoiceCurrencyId: { type: mongoose.Schema.ObjectId, ref: "Currency" },
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
    path: "suppliers",
    select: "supplierName companyName phoneNumber email address tax",
  })
    .populate({ path: "employee", select: "name profileImg email phone" })
    .populate({ path: "invoices.taxId", select: "name tax " })
    .populate({
      path: "invoiceCurrencyId",
      select: "currencyCode exchangeRate ",
    });

  next();
});

module.exports = PurchaseInvoicesSchema;
