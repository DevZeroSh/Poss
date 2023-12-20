const express = require("express");
const {
  getCategories,
  createCategory,
  getCategory,
  updateCategory,
  deleteCategory,
} = require("../services/CategoryServices");
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
  .post(authService.allowedTo("new category"),createCategoryVlaidator, createCategory);

categoryRout
  .route("/:id")
  .get(getCategoryValidator, getCategory)
  .put(authService.allowedTo("edit category"),updateCategoryValidator, updateCategory)
  .delete(authService.allowedTo("delete category"),deleteCategoryValidator, deleteCategory);
module.exports = categoryRout;
