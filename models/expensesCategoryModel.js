const mongoose = require("mongoose");

const expensesCategorySchama = new mongoose.Schema({
  expenseCategoryName: {
    type: String,
    require: true,
    unique: [true, "Expense Category Name must be unique"],
  },
  expenseCategoryDescription: String,
  linkedAccount: {
    type: String,
    require: true,
  },
});

module.exports = expensesCategorySchama;
