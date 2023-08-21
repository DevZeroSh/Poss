const asyncHandler = require("express-async-handler");
const categoryModel = require("../models/CategoryModel");
const ApiError = require("../utils/apiError");

exports.getCategories = asyncHandler(async (req, res, next) => {
  const category = await categoryModel.find();
  res.status(200).json({ results: category.length, data: category });
});

exports.createCategory = asyncHandler(async (req, res, next) => {
  const category = await categoryModel.create(req.body);
  res.status(201).json({ data: category });
});

exports.getCategory = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const category = await categoryModel.findById(id);

  if (!category) {
    return next(new ApiError(`No Category for this id ${id}`, 404));
  }
  res.status(200).json({ data: category });
});

exports.updateCategory = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const category = await categoryModel.findByIdAndUpdate(id, res.body, {
    new: true,
  });
  if (!category) {
    return next(new ApiError(`No Category for this id ${id}`, 404));
  }
  res.status(200).json({ data: category });
});

exports.deleteCategory = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const category = await categoryModel.findByIdAndDelete(id);
  if (!category) {
    return next(new ApiError(`No Category for this id ${id}`, 404));
  }
  res.status(204).send();
});
