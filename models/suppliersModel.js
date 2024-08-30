const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema(
  {
    supplierName: {
      type: String,
      require: [true, "supplier Name Required"],
      minlength: [3, "Too short supplier name"],
      maxlength: [300, "Too long supplier name"],
      unique: [true, " Supplier Name must be unique"],
    },
    idNumber: Number,
    nickName: String,
    phoneNumber: {
      type: String,
    },
    email: {
      type: String,
      lowercase: true,
    },
    openingBalanceId: String,
    openingBalance: Number,
    companyName: String,
    country: String,
    city: String,
    address: String,
    note: String,
    taxNumber: Number,
    taxAdministration: String,
    date: String,
    archives: {
      type: String,
      enum: ["true", "false"],
      default: "false",
    },
    total: { type: Number, default: 0 },
    TotalUnpaid: { type: Number, default: 0 },
    supplierType: {
      type: String,
      enum: ["individual", "corporate"],
      default: "individual",
    },
    iban: [
      {
        name: String,
        number: String,
      },
    ],
    products: [
      {
        product: String,
        qr: String,
        name: String,
        buyingprice: Number,
        buyingpriceOriginal: Number,
        taxRate: Number,
        quantity: Number,
        exchangeRate: Number,
      },
    ],
    
    parentAccountCode: {
      type: String,
      default: 211,
    },
    code: { type: String, unique: true, require: true },
  },
  { timestamps: true }
);

module.exports = supplierSchema;
