const express = require("express");
const {
  getCategories,
  createCategory,
  getCategory,
  updateCategory,
  deleteCategory,
} = require("../services/CategoryServices");
const {
  createCategoryVlaidator, getCategoryValidator,

} = require("../utils/validators/categoryValidator");

const categoryRout = express.Router();

categoryRout
  .route("/")
  .get(getCategories)
  .post(createCategoryVlaidator, createCategory);

categoryRout
  .route("/:id")
  .get(getCategoryValidator,getCategory)
  .put( updateCategory)
  .delete( deleteCategory);
module.exports = categoryRout;
