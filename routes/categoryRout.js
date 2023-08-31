const express = require("express");
const {
  getCategories,
  createCategory,
  getCategory,
  updateCategory,
  deleteCategory,
} = require("../services/CategoryServices");

const categoryRout = express.Router();

categoryRout.route("/").get(getCategories).post(createCategory);

categoryRout
  .route("/:id")
  .get(getCategory)
  .put(updateCategory)
  .delete(deleteCategory);
module.exports = categoryRout;
