const mongoose = require("mongoose");

const paymentTypesSchema = new mongoose.Schema(
    {
        paymentName: {
            type: String,
            require: [true, "Payment name is require"],
            minlength: [1, "The payment name is too short"],
            unique: [true, "Payment Name must be unique"],

        },
        paymentType: {
            type: String,
            require: [true, "You have to select one payment type"],
        },
    },
    { timestamps: true }
);

module.exports = paymentTypesSchema;
