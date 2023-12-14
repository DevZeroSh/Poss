const mongoose = require("mongoose");

const pricingMethodSchema = new mongoose.Schema({
    selectedCategory: {
        type: mongoose.Schema.ObjectId,
        ref: "Category",
        required: true,
    },

    percentageIncrease: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
    },
});

const PricingMethodModel = mongoose.model("PricingMethod", pricingMethodSchema);
module.exports = PricingMethodModel;
