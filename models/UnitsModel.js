const mongoose = require("mongoose");

const UnitSchema = new mongoose.Schema({
  name: String,
  slug: {
    type: String,
    lowercase: true,
  },
  code: String,
});

const UnitModel = mongoose.model("Unit", UnitSchema);

module.exports = UnitModel;
