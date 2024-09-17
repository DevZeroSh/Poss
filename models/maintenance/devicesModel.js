const mongoose = require("mongoose");

const devicesSchema = new mongoose.Schema(
  {
    userId: String,
    serialNumber: String,
    deviceName: String,
    deviceType: String,
    deviceModel: String,
    brand: String,
    counter: String,
  },
  { timestamps: true }
);

module.exports = devicesSchema;
