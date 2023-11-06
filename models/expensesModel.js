const mongoose = require("mongoose");

const expensesSchema = new mongoose.Schema({
    expenseDate: {
        type: Date,
        require: true,
    },
    expenseClarification: String,
    expenseQuantityBeforeKdv: {
        type: Number,
        require: true,
    },
    expenseQuantityAfterKdv: {
        type: Number,
        require: true,
    },
    expenseCurrency: {
        type: mongoose.Schema.ObjectId,
        ref: "Currency",
    },
    expenseTax: {
        type: mongoose.Schema.ObjectId,
        ref: "Tax",
    },
    expenseFinancialFund: {
        type: mongoose.Schema.ObjectId,
        ref: "FinancialFunds",
    },
    expenseFile: [
        {
            type: String,
        },
    ],
});

const setFileURL = (doc) => {
    if (doc.expenseFile && doc.expenseFile.length > 0) {
        doc.expenseFile = doc.expenseFile.map((file) => {
            return `${process.env.BASE_URL}/expenses/${file}`;
        });
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

const expensesModel = mongoose.model("Expenses", expensesSchema);
module.exports = expensesModel;
