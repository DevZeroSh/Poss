const mongoose = require("mongoose");

const expensesCategorySchama = new mongoose.Schema({
    expenseCategoryName: {
        type: String,
        require: true,
        unique: [true, "Expense Category Name must be unique"]
    },
    expenseCategoryDescription: String,
});

module.exports = expensesCategorySchama;
