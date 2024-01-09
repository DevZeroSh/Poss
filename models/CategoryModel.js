const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: { type: String, unique: [true, "Category must be unique"] },
  parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
});



module.exports = categorySchema;
