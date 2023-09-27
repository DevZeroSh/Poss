const mongoose = require("mongoose");

const paymentTypesSchema = new mongoose.Schema(

    {
        paymentName: {
            type: String,
            require: [true, "Payment name is require"],
            minlength: [1, "The payment name is too short"],
        },
        paymentType: {
            type: String,
            enum: ["Credit card", "Cash", "Other payment type"],
            require: [true, "You have to select one payment type"],
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("PaymentType",paymentTypesSchema);