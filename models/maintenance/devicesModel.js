const mongoose = require("mongoose");

const devicesSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.ObjectId, ref: "manitUser" },
    serialNumber: String,
    deviceType: String,
    deviceBrand: String,
    deviceModel: String,
    counter: String,
  },
  { timestamps: true }
);

module.exports = devicesSchema;
