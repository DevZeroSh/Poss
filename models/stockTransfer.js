const mongoose = require("mongoose");

const stockTransferSchema = new mongoose.Schema({
    fromStock: String,
    fromStockId: String,
    toStock: String,
    toStockId: String,
    date: Date,
    sender: String,
    recipient: String,

    products: [{
        productId: String,
        productName: String,
        productQuantity: Number,
    }],
    counter: String,

}, { timestamps: true })

module.exports = stockTransferSchema