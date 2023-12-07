const mongoose = require("mongoose");

const reportsFinancialFundsSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    expense: {
        type: mongoose.Schema.ObjectId,
        ref: "Expenses",
    },
    order: {
        type: mongoose.Schema.ObjectId,
        ref: "Orders",
    },
    type: {
        type: String,
        enum: ["expense", "order"],
    },
    financialFundId: {
        type: mongoose.Schema.ObjectId,
        ref: "FinancialFunds",
    },
    financialFundRest: Number,
});

const ReportsFinancialFundsModel = mongoose.model("ReportsFinancialFunds", reportsFinancialFundsSchema);

module.exports = ReportsFinancialFundsModel;
