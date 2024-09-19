const mongoose = require("mongoose");

const devicesSchema = new mongoose.Schema(
  {
    userId: String,
    serialNumber: String,
    deviceType: String,
    deviceModel: String,
    counter: String,
  },
  { timestamps: true }
);

module.exports = devicesSchema;
