const mongoose = require("mongoose");

const paymentTypesSchema = new mongoose.Schema(
  {
    paymentDescription: {
      type: String,
      default: "description",
    },
    paymentType: {
      type: String,
      require: [true, "You have to select one payment type"],
    },
  },
  { timestamps: true }
);

module.exports = paymentTypesSchema;
