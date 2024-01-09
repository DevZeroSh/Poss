const mongoose = require("mongoose");

const expensesCategorySchama = new mongoose.Schema({
    expenseCategoryName: {
        type: String,
        require: true,
    },
    expenseCategoryDescription: String,
});

module.exports = expensesCategorySchama;
