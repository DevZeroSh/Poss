const { Double } = require("mongodb");
const mongoose = require("mongoose");

const PurchaseInvoicesSchema = new mongoose.Schema(
  {
    suppliersId: String,
    supplierName: String,
    supplierPhone: String,
    supplierEmail: String,
    supplierAddress: String,
    supplierCompany: String,
    type: { type: String, default: "normal" },
    invoicesItems: [
      {
        product: {
          type: mongoose.Schema.ObjectId,
          ref: "Product",
        },
        buyingPrice: Number,
        quantity: Number,
        taxPrice: Number,
        taxRate: Number,
        taxs: Number,
        taxId: { type: mongoose.Schema.ObjectId, ref: "Tax" },
        price: Number,
        name: String,
        qr: String,
        exchangeRate: Number,
        buyingpriceOringal: Number,
        stockId: String,
        stockName: String,
        _id: false,
      },
    ],
    exchangeRate: Number,
    currencyCode: String,
    currencyId: String,
    priceExchangeRate: {
      type: Number,
      default: 0,
    },
    onefinancialFunds: {
      type: mongoose.Schema.ObjectId,
      ref: "FinancialFunds",
    },
    totalPurchasePrice: Number,
    totalPurchasePriceMainCurrency: Number,
    addedValue: Number,
    paidAt: String,
    date: String,
    description: String,

    totalRemainderMainCurrency: { type: Number, default: 0 },
    totalRemainder: { type: Number, default: 0 },
    payments: [
      {
        payment: Number,
        paymentMainCurrency: Number,
        financialFunds: String,
        date: String,
        _id: false,
      },
    ],

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
    reportsBalanceId: String,
  },
  { timestamps: true }
);

module.exports = PurchaseInvoicesSchema;
