const mongoose = require("mongoose");

const UnitSchema = new mongoose.Schema({
  name: { type: String, unique: [true, "unit must be unique"] },
  slug: {
    type: String,
    lowercase: true,
  },
  code: String,
});

module.exports = UnitSchema;
