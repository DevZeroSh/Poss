const mongoose = require("mongoose");

const devicesHitstorySchema = new mongoose.Schema({
  devicesId: String,
  name: String,
  date: String,
  conuter: String,
  status: { type: String, enum: ["create", "update"] },
});

module.exports = devicesHitstorySchema;
