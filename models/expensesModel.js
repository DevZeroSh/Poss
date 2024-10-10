const mongoose = require("mongoose");

const expensesSchema = new mongoose.Schema({
  expenseName: String,
  expenseDate: Date,
  expenseCategoryId: String,
  expenseCategory: String,
  supplierId: String,
  supplierName: String,
  invoiceCurrencyTotal: Number,
  currencyCode: String,
  currencyExchangeRate: String,
  Tax: String,
  TaxId: String,
  MainCurrencyTotal: Number,
  paymentStatus: { type: String, default: "Pending" },
  paymentDate: Date,
  finincalFund: String,
  employeeID: Number,
  employeeName: Number,
  expenseClarification: Number,
  expenseFile: String,
  counter: { type: String, default: 0, unique: true },
});

const setFileURL = (doc) => {
  if (doc.expenseFile && doc.expenseFile.length > 0) {
    doc.expenseFile = `${process.env.BASE_URL}/expenses/${file}`;
  }
};

//When findOne, findAll and update
expensesSchema.post("init", (doc) => {
  setFileURL(doc);
});

//When createOne
expensesSchema.post("save", (doc) => {
  setFileURL(doc);
});

module.exports = expensesSchema;
