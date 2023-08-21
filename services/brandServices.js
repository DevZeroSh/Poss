const asyncHandler = require("express-async-handler");
const brandModel = require("../models/brandModel");
const ApiError = require("../utils/apiError");
exports.getBrands = asyncHandler(async (req, res, next) => {
  const brand = await brandModel.find();
  res.status(200).json({ results: brand.length, data: brand });
});

exports.createBrand = asyncHandler(async (req, res, next) => {
  const brand = await brandModel.create(req.body);
  res.status(201).json({ data: brand });
});
exports.getBrand = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const brand = await brandModel.findById(id);
  if (!brand) {
    return next(new ApiError(`No Brand for this id ${id}`, 404));
  }
  res.status(200).json({ data: brand });
});

exports.updataBrand = asyncHandler(async (req, res, next) => {
  const brand = await brandModel.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  if (!brand) {
    return next(new ApiError(`No Brand for this id ${req.params.id}`, 404));
  }
  res.status(200).json({ data: brand });
});

exports.deleteBrand = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const brand = await brandModel.findByIdAndDelete(id);
  if (!brand) {
    return next(new ApiError(`No brand for this id ${id}`, 404));
  }
  res.status(204).send();
});
