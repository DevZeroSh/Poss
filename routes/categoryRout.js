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

const authService = require("../services/authService");
const categoryRout = express.Router();

categoryRout
  .route("/")
  .get(getCategories)
  .post(authService.protect,createCategoryVlaidator, createCategory);

categoryRout
  .route("/:id")
  .get(getCategoryValidator, getCategory)
  .put(authService.protect,updateCategoryValidator, updateCategory)
  .delete(authService.protect,deleteCategoryValidator, deleteCategory);
module.exports = categoryRout;
