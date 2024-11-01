const mongoose = require("mongoose");

const purchaseRequestSchema = new mongoose.Schema(
  {
    invoicesItems: [
      {
        productId: { type: String },
        qr: String,
        name: String,
        orginalBuyingPrice: String,
        convertedBuyingPrice: String,
        tax: { _id: String, tax: Number },
        taxValue: Number,
        quantity: Number,
        totalWithoutTax: Number,
        total: String,
        note: String,
        exchangeRate: Number,
        _id: false,
      },
    ],
    suppliers: {
      supplierId: String,
      supplierName: String,
      suppliersPhone: Number,
      supplierAddress: String,
      supplierEmail: String,
      _id: false,
    },
    currencyExchangeRate: Number,
    currencyExchangeID: String,
    currencyExchangeCode: String,
    invoiceTax: Number,
    taxSummary: [{ taxRate: Number, totalTaxValue: Number, _id: false }],
    invoiceGrandTotal: Number,
    registryDate: String,
    deliveryDate: String,
    admin: String,
    status: { type: String, default: "Draft" },
    counter: { type: String, default: 0 },
  },
  { timestamps: true }
);

module.exports = purchaseRequestSchema;
