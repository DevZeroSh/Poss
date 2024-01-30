const mongoose = require("mongoose");

const ReportsSalesSchema = new mongoose.Schema(
    {
        customer: {
            type: String,
            default: "Customer",
        },
        orderId: {
            type: mongoose.Schema.ObjectId,
            ref: "Orders",
        },
        date: {
            type: Date,
            required: true,
            default: Date.now,
        },
        fund: {
            type: mongoose.Schema.ObjectId,
            ref: "FinancialFunds",
        },
        financialFunds: [
            {
                fundId: {
                    type: mongoose.Schema.ObjectId,
                    ref: "FinancialFunds",
                },
                allocatedAmount: {
                    type: Number,
                },
            },
        ],
        amount: {
            type: Number,
            default: 0,
        },
        paymentType: {
            type: String,
            default: "",
        },
        employee: {
            type: mongoose.Schema.ObjectId,
            ref: "Employee",
        },
        counter: {
            type: Number,
            default: 0,
            unique: true,
        },
    },
    { timestamps: true }
);

ReportsSalesSchema.pre(/^find/, function (next) {
    this.populate({
        path: "financialFunds.fundId",
        select: "fundName",
    })
        .populate({
            path: "fund",
            select: "fundName",
        })
        .populate({
            path: "employee",
            select: "name",
        });

    next();
});

module.exports = ReportsSalesSchema;
