const mongoose = require("mongoose");

const returnOrderSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.ObjectId,
      ref: "Employee",
    },
    invoiceName: String,

    invoicesItems: [
      {
        type: { type: String, default: "product" },
        qr: String,
        name: String,
        category: String,
        orginalBuyingPrice: Number,
        profitRatio: Number,
        convertedBuyingPrice: Number,
        sellingPrice: Number,
        unit: String,
        tax: { _id: String, tax: Number },
        taxValue: Number,
        stock: {
          _id: { type: mongoose.Schema.Types.ObjectId },
          stock: { type: String },
        },
        soldQuantity: Number,
        totalWithoutTax: Number,
        total: Number,
        note: String,
        exchangeRate: Number,
        discountType: String,
        discountPercentege: Number,
        discountAmount: Number,
        discount: Number,
        showNote: Boolean,
        showDiscount: Boolean,
        buyingpriceMainCurrence: Number,
        _id: false,
      },
    ],
    financailFund: {
      currency: String,
      currencyID: String,
      exchangeRate: String,
      label: String,
      value: String,
      _id: false,
    },
    taxSummary: [
      { taxRate: Number, totalTaxValue: Number, discountTaxValue: Number },
    ],
    counter: {
      type: String,
    },
    customer: {
      id: String,
      name: String,
      phone: String,
      email: String,
      address: String,
      company: String,
      taxAdministration: String,
      taxNumber: String,
      country: String,
      city: String,
      _id: false,
    },
    currency: {
      value: String,
      currencyCode: String,
      exchangeRate: String,
      _id: false,
    },
    currencyExchangeRate: { type: Number, default: 1 },
    orderDate: Date,
    orderNumber: String,
    paymentsStatus: { type: String, default: "unpiad" },
    paymentDate: Date,
    totalInMainCurrency: Number,
    invoiceSubTotal: Number,
    invoiceTax: Number,
    paymentInFundCurrency: Number,
    invoiceGrandTotal: Number,
    type: {
      type: String,
      default: "return",
    },
  },

  { timestamps: true }
);

module.exports = returnOrderSchema;
