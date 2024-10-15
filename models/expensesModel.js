const mongoose = require("mongoose");

const expensesSchema = new mongoose.Schema(
  {
    expenseName: String,
    expenseDate: Date,
    expenseCategoryId: String,
    expenseCategory: String,
    supplierId: String,
    supplierName: String,
    invoiceCurrencyTotal: Number,
    currencyId: String,
    currencyCode: String,
    currencyExchangeRate: String,
    Tax: String,
    TaxId: String,
    MainCurrencyTotal: Number,
    paymentStatus: { type: String, default: "Pending" },
    paymentDate: Date,
    finincalFund: String,
    employeeID: String,
    employeeName: String,
    expenseClarification: Number,
    expenseFile: String,
    receiptNumber: String,
    totalRemainderMainCurrency: { type: Number, default: 0 },
    totalRemainder: { type: Number, default: 0 },
    counter: { type: String, default: 0, unique: true },
  },
  { timestamps: true }
);

const setFileURL = (doc) => {
  if (doc.expenseFile) {
    doc.expenseFile = `${process.env.BASE_URL}/expenses/${doc.expenseFile}`;
  }
};

//When findOne, findAll and update
expensesSchema.post("init", (doc) => {
  setFileURL(doc);
});

//When createOne
expensesSchema.post("save", (doc) => {
  setFileURL(doc.expenseFile);
});

module.exports = expensesSchema;
