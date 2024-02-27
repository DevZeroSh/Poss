const mongoose = require("mongoose");

const ProductMovementSchema = new mongoose.Schema(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
        quantity: {
            type: Number,
            default: 0,
            required: true,
        },
        newQuantity: {
            type: Number,
            default: 0,
            required: true,
        },
        movementType: {
            type: String,
            enum: ["in", "out", "edit"],
            required: true,
        },
        source: {
            type: String,
            default: "",
            required: true,
        },
    },
    { timestamps: true }
);
module.exports = ProductMovementSchema;
