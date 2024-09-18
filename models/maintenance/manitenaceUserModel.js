const mongoose = require("mongoose");

const manitenaceUserSchema = new mongoose.Schema(
  {
    userName: String,
    userPhone: String,
    userEmail: String,
    taxNumber: String,
    taxAdminstration: String,
    counter: String,
  },
  { timestamps: true }
);

module.exports = manitenaceUserSchema;
