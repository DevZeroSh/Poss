const mongoose = require("mongoose");

const devicesHitstorySchema = new mongoose.Schema(
  {
    devicesId: String,
    employeeName: String,
    date: String,
    histoyType: String,
    deviceStatus: String,
    counter: String,
    desc: String,
  },
  { timestamps: true }
);

module.exports = devicesHitstorySchema;
