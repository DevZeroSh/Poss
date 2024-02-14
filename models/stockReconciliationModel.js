const mongoose = require("mongoose");

const stockReconcilSchema = new mongoose.Schema(
    {
        title: String,
        reconcilingDate: Date,
        items: [
            {
                productId: {
                    type: mongoose.Schema.ObjectId,
                    ref: "Product",
                },
                productBarcode: String,
                productName: String,
                recordCount: Number, // Number in the system
                realCount: Number, // Number IRL
                difference: Number, // Difference between the system the IRL
                reconcilingReason: String,
                reconciled: Boolean, // Whether reconciled or not
            },
        ],
        employee: String,
    },
    { timestamps: true }
);

module.exports = stockReconcilSchema;
