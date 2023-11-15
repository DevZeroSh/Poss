const mongoose = require("mongoose");

const expensesCategorySchama = new mongoose.Schema({
    expenseCategoryName: {
        type: String,
        require: true,
    },
    expenseCategoryDescription: String,
});

const expensesCategoryModel = mongoose.model("ExpensesCategory", expensesCategorySchama);
module.exports = expensesCategoryModel;
