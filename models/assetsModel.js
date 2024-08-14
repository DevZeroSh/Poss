const mongoose = require("mongoose");

const assetsSchema = new mongoose.Schema({
  name: { type: String, require: true },
  code: { type: String, require: true },
  parentAccountCode: {
    type: String,
    default: 121,
  },
});

module.exports = assetsSchema;
