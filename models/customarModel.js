const mongoose = require("mongoose");

const customarSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      require: [true, "Customar Name Required"],
      minlength: [3, "Too short customar name"],
      maxlength: [30, "Too long customar name"],
      unique: [true, " Customar Name must be unique"],
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
    idNumber: {
      type: Number,
      trim: true,
    },
    sex: {
      type: String,
      enum: ["male", "female", ""],
      default: "unknow",
    },
    birthData: Date,
    country: String,
    city: String,
    address: String,
    customarType: {
      type: String,
      enum: ["individual", "corporate"],
      default: "individual",
    },
    taxNumber: Number,
    taxAdministration: String,
    archives: {
      type: String,
      enum: ["true", "false"],
      default: "false",
    },
    total: { type: Number, default: 0 },
    TotalUnpaid: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = customarSchema;
