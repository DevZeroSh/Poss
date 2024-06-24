const express = require("express");
const {
  getCategories,
  createCategory,
  getCategory,
  updateCategory,
  deleteCategory,
  uploadCategoryImage,
  resizerCategoryImage,
  getLastChildrenCategories,
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
  .route("/last-children")
  .get(getLastChildrenCategories)

categoryRout
  .route("/")
  .get(getCategories)
  .post(
    authService.protect,
    uploadCategoryImage,
    resizerCategoryImage,
    createCategoryVlaidator,
    createCategory
  );

categoryRout
  .route("/:id")
  .get(getCategoryValidator, getCategory)
  .put(
    authService.protect,
    uploadCategoryImage,
    resizerCategoryImage,
    updateCategoryValidator,
    updateCategory
  )
  .delete(authService.protect, deleteCategoryValidator, deleteCategory);
module.exports = categoryRout;
