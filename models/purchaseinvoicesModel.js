const mongoose = require("mongoose");

const PurchaseInvoicesSchema = new mongoose.Schema(
  {
    supllier: {
      value: String,
      label: String,
      supplierCompany: String,
      supplierEmail: String,
      phoneNumber: String,
      address: String,
    },
    type: { type: String, default: "normal" },
    invoicesItems: [
      {
        type: { type: String },
        qr: { type: String },
        name: { type: String },
        orginalBuyingPrice: { type: Number },
        tax: {
          _id: { type: mongoose.Schema.Types.ObjectId },
          tax: { type: Number },
        },
        stock: {
          _id: { type: mongoose.Schema.Types.ObjectId },
          stock: { type: String },
        },
        exchangeRate: { type: Number },
        quantity: { type: Number },
        discountType: { type: String },
        discountPercentege: { type: Number },
        discountAmount: { type: Number },
        discount: { type: Number },
        convertedBuyingPrice: { type: Number },
        totalWithoutTax: { type: Number },
        total: { type: Number },
        taxValue: { type: Number },
        profitRatio: { type: Number },
        _id: false,
      },
    ],
    exchangeRate: Number,
    currency: { currencyCode: String, currencyId: String },
    invoiceGrandTotal: Number,
    invoiceSubTotal: Number,
    invoiceDiscount: Number,
    ManualInvoiceDiscount: Number,
    invoiceTax: Number,
    taxDetails: [
      {
        taxRate: Number,
        totalTaxValue: Number,
        discountTaxValue: Number,
        _id: false,
      },
    ],
    invoiceName: String,

    financailFund: { value: String, label: String },
    paymentInFundCurrency: String,
    totalPurchasePrice: Number,
    totalPurchasePriceMainCurrency: Number,

    date: String,
    description: String,
    invoiceType: String,
    totalRemainderMainCurrency: { type: Number, default: 0 },
    totalRemainder: { type: Number, default: 0 },
    payments: [
      {
        payment: Number,
        paymentMainCurrency: Number,
        financialFunds: String,
        financialFundsId: String,
        financialFundsCurrencyCode: String,
        date: String,
        paymentID: String,
        _id: false,
      },
    ],
    InvoiceDiscountType: String,
    paid: {
      type: String,
      default: "unpaid",
      enum: ["paid", "unpaid"],
    },
    employee: {
      type: mongoose.Schema.ObjectId,
      ref: "Employee",
    },
    invoiceNumber: {
      type: String,
      unique: true,
    },

    openingBalanceId: String,
    reportsBalanceId: String,
    //Expens
    employeeID: String,
    employeeName: String,
    expenseClarification: Number,
    expenseFile: String,
    expenseCategoryId: String,
    expenseCategory: String,
    paymentDate: String,
    Tax: String,
    TaxId: String,
    receiptNumber: String,
    expenseName: String,
  },
  { timestamps: true }
);

const setFileURL = (doc) => {
  if (doc?.expenseFile) {
    doc.expenseFile = `${process.env.BASE_URL}/expenses/${doc.expenseFile}`;
  }
};
PurchaseInvoicesSchema.post("init", (doc) => {
  setFileURL(doc);
});

//When createOne
PurchaseInvoicesSchema.post("save", (doc) => {
  setFileURL(doc.expenseFile);
});
//When findOne, findAll and update

module.exports = PurchaseInvoicesSchema;
