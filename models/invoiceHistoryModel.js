const mongoose = require("mongoose");

const invoiceHistorySchema = new mongoose.Schema(
    {
        invoiceId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        historyType: {
            type: String,
            enum: ["create", "edit", "return"],
            required: true,
        },
        employeeId: {
            type: mongoose.Schema.ObjectId,
            ref: "Employee",
        },
    },
    { timestamps: true }
);
module.exports = invoiceHistorySchema;
