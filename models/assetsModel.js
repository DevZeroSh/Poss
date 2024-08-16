const mongoose = require("mongoose");

const assetsSchema = new mongoose.Schema({
  name: { type: String, require: true },
  code: { type: String, require: true },
  parentAccountCode: {
    type: String,
    default: 1210,
  },
  type: { type: String, enum: ["building", "furniture", "cars"] },
  code: { type: String, unique: true, require: true },

});

module.exports = assetsSchema;
