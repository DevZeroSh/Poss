const mongoose = require("mongoose");

const labelsSchema = new mongoose.Schema({
  name: {
    type: String,
    require: true,
    unique: [true, "brand must be unique"],
  },
  slug: {
    type: String,
    lowercase: true,
  },
  description: {
    type: String,
  },
});

const labelsModel = mongoose.model("Labels", labelsSchema);
module.exports = labelsModel;
