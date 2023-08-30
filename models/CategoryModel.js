const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: String,
  parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
});

const Category = mongoose.model("Category", categorySchema);

module.exports = Category;
