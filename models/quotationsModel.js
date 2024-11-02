const mongoose = require("mongoose");

const quotationSchema = new mongoose.Schema(
  {
    invoicesItems: [
      {
        productId: { type: String },
        qr: String,
        name: String,
        buyingPrice: String,
        sellingPriceWithoutTax: Number,
        orginalSellingPriceWithoutTax: Number,
        sellingPrice: Number,
        tax: { _id: String, tax: Number },
        taxValue: Number,
        quantity: Number,
        totalWithoutTax: Number,
        total: String,
        note: String,
        exchangeRate: Number,
        discountType: String,
        discountPercentege: Number,
        discountAmount: Number,
        discount: Number,
        _id: false,
      },
    ],
    customer: {
      customerId: String,
      customerName: String,
      customersPhone: Number,
      customerAddress: String,
      customerEmail: String,
      _id: false,
    },
    exchangeRate: { type: Number },
    totalQuotationPriceMainCurrence: { type: Number },
    totalQuotationPrice: { type: Number },
    invoiceTax: { type: Number },
    taxSummary: [{ taxRate: Number, totalTaxValue: Number, _id: false }],
    currencyExchangeRate: Number,
    currencyExchangeID: String,
    currencyExchangeCode: String,
    startDate: { type: Date },
    endDate: { type: Date },
    description: { type: String, default: "" },
    shippingPrice: { type: Number, default: 0 },
    counter: { type: String, default: 0 },
    status: { type: String, default: "Draft" },
  },
  { timestamps: true }
);

module.exports = quotationSchema;
