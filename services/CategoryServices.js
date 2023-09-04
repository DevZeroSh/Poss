const asyncHandler = require("express-async-handler");
const categoryModel = require("../models/CategoryModel");
const ApiError = require("../utils/apiError");

//@desc Get List category 
//@route Get /api/category/
//@access Private
exports.getCategories = asyncHandler(async (req, res, next) => {
  const category = await categoryModel.find()
  res.status(200).json({status:"true", results: category.length, data: category });
});

//@desc Create  category 
//@route Post /api/category
//@access Private
exports.createCategory = asyncHandler(async (req, res, next) => {
  const category = await categoryModel.create(req.body);
  res.status(201).json({status:"true",message:"Category Inserted", data: category });
});

//@desc Get specific category by id
//@route Get /api/category/:id
//@access Private
exports.getCategory = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const category = await categoryModel.findById(id);

  if (!category) {
    return next(new ApiError(`No Category for this id ${id}`, 404));
  }
  res.status(200).json({status:"true", data: category });
});

//@desc Update category by id
//@route Put /api/category/:id
//@access Private
exports.updateCategory = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const category = await categoryModel.findByIdAndUpdate(id, req.body, {
    new: true,
  });
  if (!category) {
    return next(new ApiError(`No Category for this id ${id}`, 404));
  }
  res.status(200).json({status:"true",message:"Category updated", data: category });
});

//@desc Delete specific category 
//@route Delete /api/category/:id
//@access Private
exports.deleteCategory = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const category = await categoryModel.findByIdAndDelete(id);
  if (!category) {
    return next(new ApiError(`No Category for this id ${id}`, 404));
  }
  res.status(200).json({ status: "true", message: "Category Deleted" });;
});
