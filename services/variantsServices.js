const asyncHandler = require("express-async-handler");
const variantModel = require("../models/variantsModel");
const ApiError = require("../utils/apiError");

exports.getVariants = asyncHandler(async (req, res, next) => {
  const variant = await variantModel.find();
  res.status(200).json({ results: variant.length, data: variant });
});

exports.createVariant = asyncHandler(async (req, res, next) => {
  const variant = await variantModel.create(req.body);
  res.status(201).json({ data: variant });
});

exports.getVariant = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const variant = await variantModel.findById(id);
  if (!variant) {
    return next(new ApiError(`No Variant for this id ${id}`, 404));
  }
  res.status(200).json({ data: variant });
});

exports.updataeVariant = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const variant = await variantModel.findByIdAndUpdate(id);
  if (!variant) {
    return next(new ApiError(`No Variant for this id ${id}`, 404));
  }
  res.status(200).json({ data: variant });
});
exports.deleteVariant = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const variant = await variantModel.findByIdAndDelete(id);
  if (!variant) {
    return next(new ApiError(`No Variant for this id ${id}`, 404));
  }
  res.status(204).send();
});
