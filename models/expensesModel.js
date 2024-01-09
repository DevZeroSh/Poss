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
    expenseCategory: {
        type: mongoose.Schema.ObjectId,
        ref: "ExpensesCategory",
    },
    paid: {
        type: String,
        default: "unpaid",
        enum: ["paid", "unpaid"],
    },
    expenseTax: String,
    expenseFinancialFund: String,
    counter: {
        type: Number,
        default: 1,
        unique: true,
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

//const expensesModel = mongoose.model("Expenses", expensesSchema);
module.exports = expensesSchema;
