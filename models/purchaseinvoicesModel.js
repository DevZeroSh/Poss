const { Double } = require("mongodb");
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
        price: Number,
        buyingprice: Number,
        totalTax: Number,
        taxPrice: Number,
        totalWitheOutTaxPrice: Number,
        totalWitheTaxPrice: Number,
        totalPrice: String,
        currency: Number,
        buyingpriceOringal: Number,
        serialNumber: [String],
        profitRatio: Number,
      },
    ],
    paidAt: String,
    totalProductTax: Number,
    totalPriceWitheOutTax: Number,
    finalPrice: Number,
    addedValue: Number,
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
    invoiceCurrencyExchangeRate: Number,
    invoiceFinancialFund: String,
    finalPriceMainCurrency: Number,
    totalRemainderMainCurrency: { type: Number, default: 0 },
    totalRemainder: { type: Number, default: 0 },
    payments: [
      {
        payment: Number,
        paymentMainCurrency: Number,
        financialFunds: String,
        date: String,
      },
    ],
    date: String,
    description: String,
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
      type: String,
      unique: true,
    },
    openingBalanceId: String,
    type: String,
  },
  { timestamps: true }
);
PurchaseInvoicesSchema.pre(/^find/, function (next) {
  this.populate({
    path: "suppliers",
    select: "supplierName companyName phoneNumber email address tax",
  })
    .populate({ path: "employee", select: "name profileImg email phone" })
    .populate({ path: "invoices.taxId", select: "tax " })
    .populate({
      path: "invoiceCurrencyId",
      select: "currencyCode exchangeRate ",
    });

  next();
});

module.exports = PurchaseInvoicesSchema;
