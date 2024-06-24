const mongoose = require("mongoose");

const customarSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      require: [true, "Customar Name Required"],
      minlength: [3, "Too short customar name"],
      maxlength: [300, "Too long customar name"],
    },
    phoneNumber: {
      type: String,
    },
    email: {
      type: String,
      lowercase: true,
      unique: [true, " Customar Name must be unique"],
    },
    idNumber: {
      type: Number,
      trim: true,
    },
    faks: Number,
    iban: [
      {
        name: String,
        number: String,
      },
    ],
    sex: {
      type: String,
      enum: ["male", "female", "unknow"],
      default: "unknow",
    },
    birthData: Date,
    country: String,
    city: String,
    address: String,
    customarType: {
      type: String,
      enum: ["individual", "corporate", "ecommerce"],
      default: "individual",
    },
    taxNumber: Number,
    taxAdministration: String,
    archives: {
      type: String,
      enum: ["true", "false"],
      default: "false",
    },
    date: String,
    total: { type: Number, default: 0 },
    TotalUnpaid: { type: Number, default: 0 },
    password: String,
    passwordResetCode: String,
    passwordResetExpires: Date,
    resetCodeVerified: Boolean,
    passwordChangedAt: Date,
    passwordResetToken: String,
    wishlist: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Product",
      },
    ],
    addresses: [
      {
        id: { type: mongoose.Schema.Types.ObjectId },
        alias: String,
        details: String,
        phone: String,
        city: String,
        postalCode: String,
        firstName: String,
        lastName: String,
      },
    ],
  },
  { timestamps: true }
);

module.exports = customarSchema;
