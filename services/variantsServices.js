const asyncHandler = require("express-async-handler");
const variantModel = require("../models/variantsModel");
const ApiError = require("../utils/apiError");

// @desc Get List of Variant
// @route Get /api/variant
// @access Private
exports.getVariants = asyncHandler(async (req, res, next) => {
  const variant = await variantModel.find();
  res.status(200).json({ results: variant.length, data: variant });
});

// @desc Create  Variant
// @route Post /api/variant
// @access Private
exports.createVariant = asyncHandler(async (req, res) => {
  const variant = await variantModel.create(req.body);
  res
    .status(201)
    .json({ status: "true", message: "variant Inserted", data: variant });
});

// @desc get specific Variant by id
// @route Get /api/variant/:id
// @access Private
exports.getVariant = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const variant = await variantModel.findById(id);
  if (!variant) {
    return next(new ApiError(`No Variant for this id ${id}`, 404));
  }
  res
    .status(200)
    .json({ status: "true", message: "variant Inserted", data: variant });
});

// @desc Update specific Variant
// @route Put /api/variant/:id
// @access Private
exports.updataeVariant = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const variant = await variantModel.findByIdAndUpdate(id, req.body, {
    new: true,
  });
  if (!variant) {
    return next(new ApiError(`No Variant for this id ${id}`, 404));
  }
  res
    .status(200)
    .json({ status: "true", message: "variant updated", data: variant });
});

// @desc Delete specific Variant
// @route Delete /api/variant/:id
// @access Private
exports.deleteVariant = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const variant = await variantModel.findByIdAndDelete(id);
  if (!variant) {
    return next(new ApiError(`No Variant for this id ${id}`, 404));
  }
  res.status(200).json({ status: "true", message: "variant Deleted" });
});
