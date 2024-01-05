const mongoose = require("mongoose");

const UnitSchema = new mongoose.Schema({
  name: String,
  slug: {
    type: String,
    lowercase: true,
  },
  code: String,
});

module.exports = UnitSchema;
