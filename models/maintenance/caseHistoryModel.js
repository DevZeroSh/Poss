const mongoose = require("mongoose");

const caseHitstorySchema = new mongoose.Schema(
  {
    devicsId: String,
    employeeName: String,
    date: String,
    histoyType: String,
    deviceStatus: String,
    counter: String,
  },
  { timestamps: true }
);

module.exports = caseHitstorySchema;
