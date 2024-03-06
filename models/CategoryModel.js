const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: { type: String },
  parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
});

module.exports = categorySchema;
