const mongoose = require("mongoose");

const purchaseOrderSchema = new mongoose.Schema(
  {
    invoicesItems: [
      {
        product: { type: String, ref: "Product" },
        quantity: { type: Number },
        price: { type: Number },
        name: { type: String },
        qr: { type: String },
        taxRate: { type: Number },
        taxPrice: { type: Number },
        taxs: { type: Number },
        totalTax: { type: Number },
        type: { type: String },
        buyingPrice: { type: Number },
        buyingpriceOringal: { type: Number },
        currency: { type: Number },
      },
    ],
    supplierId: { type: String },
    supplierName: { type: String },
    supplierEmail: { type: String },
    supplierAddress: { type: String },
    supplierPhone: { type: String },
    supplierCompany: { type: String },
    exchangeRate: { type: Number },
    priceExchangeRate: { type: Number },
    totalPurchaseOrderPrice: { type: Number },
    invoiceCurrencyId: String,
    currency: { type: String },
    currencyCode: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    description: { type: String, default: "" },
    counter: { type: String, default: 0 },
  },
  { timestamps: true }
);

module.exports = purchaseOrderSchema;
