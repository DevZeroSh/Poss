const mongoose = require("mongoose");

const financialFundsSchema = new mongoose.Schema(
    {
        fundName: {
            type: String,
            required: true,
            minlength: [1, "The fund name is too short"],
            maxlength: [200, "The fund name is too long"],
            unique: [true, "fund Name must be unique"],

        },
        fundCurrency: {
            type: mongoose.Schema.ObjectId,
            ref: "Currency",
        },
        fundBalance: {
            type: Number,
            default: 0,
        },
        fundPaymentType: {
            type: mongoose.Schema.ObjectId,
            ref: "PaymentType",
        },
        fundDescription: String,
    },
    { timestamps: true }
);

module.exports = financialFundsSchema;
