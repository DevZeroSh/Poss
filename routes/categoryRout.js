const express = require("express");
const {
  getCategories,
  createCategory,
  getCategory,
  updateCategory,
  deleteCategory,
} = require("../services/categoryServices");
const {
  createCategoryVlaidator,
  updateCategoryValidator,
  getCategoryValidator,
  deleteCategoryValidator,
} = require("../utils/validators/categoryValidator");

const authService = require('../services/authService');
const categoryRout = express.Router();
categoryRout.use(authService.protect);

categoryRout
  .route("/")
  .get(getCategories)
  .post(createCategoryVlaidator, createCategory);

categoryRout
  .route("/:id")
  .get(getCategoryValidator, getCategory)
  .put(updateCategoryValidator, updateCategory)
  .delete(deleteCategoryValidator, deleteCategory);
module.exports = categoryRout;
