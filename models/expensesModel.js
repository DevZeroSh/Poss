const mongoose = require("mongoose");

const expensesSchema = new mongoose.Schema({
  invoiceName: String,
  counter: {
    type: Number,
    default: 1,
  },
  expenseDate: Date,
  expenseCategory: {
    type: mongoose.Schema.ObjectId,
    ref: "ExpensesCategory",
  },
  invoiceCurrencyId: String,
  invoiceCurrencyCode: String,
  expensePriceBeforeTax: Number,
  expenseTax: String,
  expensePriceAfterTax: Number,

  expenseTotalMainCurrency: Number,
  expenseTotalExchangeRate: Number,

  expenseFinancialFund: String,
  peymentDueDate: Date,

  paid: {
    type: String,
    default: "unpaid",
    enum: ["paid", "unpaid"],
  },

  expenseClarification: String,
  expenseFile: String,
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
