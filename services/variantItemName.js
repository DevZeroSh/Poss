const asyncHandler = require("express-async-handler");
const variantElmentModel = require("../models/variantElmentModel");
const ApiError = require("../utils/apiError");

exports.setCategoryIdToBody = (req, res, next) => {
  // Nested route
  if (!req.body.varuant) {
    req.body.varuant = req.params.varuantId;
  }
  next();
};

exports.createFilterObj = (req, res, next) => {
  let filterObject = {};
  if (req.params.varuantId) filterObject = { varuant: req.params.varuantId };
  req.filterObj = filterObject;
  next();
};

exports.getVariantsName = asyncHandler(async (req, res, next) => {
  const variant = await variantElmentModel
    .find()
    .populate({ path: "varuant", select: "variant  -_id" });
  res.status(200).json({ results: variant.length, data: variant });
});

exports.createVariantName = asyncHandler(async (req, res, next) => {
  const variant = await variantElmentModel.create(req.body);
  res.status(201).json({ data: variant });
});

exports.getVariantName = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const variant = await variantElmentModel.findById(id);
  if (!variant) {
    return next(new ApiError(`No Variant for this id ${id}`, 404));
  }
  res.status(200).json({ data: variant });
});

exports.updataeVariantName = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const variant = await variantElmentModel.findByIdAndUpdate(id, res.body, {
    new: true,
  });
  if (!variant) {
    return next(new ApiError(`No Variant for this id ${id}`, 404));
  }
  res.status(200).json({ data: variant });
});
exports.deleteVariantName = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const variant = await variantElmentModel.findByIdAndDelete(id);
  if (!variant) {
    return next(new ApiError(`No Variant for this id ${id}`, 404));
  }
  res.status(204).send();
});
