const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: [true, "Category must be unique"],
  },
  slug: {
    type: String,
    lowercase: true,
  },
  description: {
    type: String,
    minlength: [9, "too short brand description"],
    maxlength: [100, "too long brand description"],
  },
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
  },
});

const categoryModel = mongoose.model("Category", categorySchema);
module.exports = categoryModel;
