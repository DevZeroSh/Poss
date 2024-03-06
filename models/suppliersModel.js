const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema(
  {
    supplierName: {
      type: String,
      require: [true, "supplier Name Required"],
      minlength: [3, "Too short supplier name"],
      maxlength: [30, "Too long supplier name"],
      unique: [true, " Supplier Name must be unique"],

    },
    phoneNumber: {
      type: String,
      // unique: true,
    },
    email: {
      type: String,
      // unique: true,
      // trim:true,
      lowercase: true,
    },
    companyName: String,
    address: String,
    note: String,
    archives: {
      type: String,
      enum: ["true", "false"],
      default: "false",
    },
    products: [
      {
        product: String,
        qr: String,
        name: String,
        buyingprice: Number,
        taxRate: Number,
        quantity: Number,
        exchangeRate: Number,
      },
    ],
  },
  { timestamps: true }
);

module.exports = supplierSchema;
