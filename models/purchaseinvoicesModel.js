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
      default: 1,
    },
    onefinancialFunds: {
      type: mongoose.Schema.ObjectId,
      ref: "FinancialFunds",
    },
    totalPurchasePrice: Number,
    totalPurchasePriceMainCurrency: Number,
    addedValue: Number,

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
