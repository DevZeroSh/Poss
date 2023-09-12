const asyncHandler = require("express-async-handler");
const brandModel = require("../models/brandModel");
const ApiError = require("../utils/apiError");
const { default: slugify } = require("slugify");

//@desc Get list of Brand
//@route GEt /api/brand
//@accsess public
exports.getBrands = asyncHandler(async (req, res, next) => {
  const brand = await brandModel.find();
  res.status(200).json({ status: "true", results: brand.length, data: brand });
});
//@desc Create Brand
//@route Post /api/brand
//@access Private
exports.createBrand = asyncHandler(async (req, res, next) => {
  req.body.slug = slugify(req.body.name);
  const brand = await brandModel.create(req.body);
  res
    .status(200)
    .json({ status: "true", message: "Brand Inserted", data: brand });
});
//@desc GEtspecific Brand by id
//@route Get /api/brand/:id
//@access Public
exports.getBrand = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const brand = await brandModel.findById(id);
  if (!brand) {
    return next(new ApiError(`No Brand for this id ${id}`, 404));
  }
  res.status(200).json({ status: "true", data: brand });
});
// @desc Update specific Breand
// @route Put /api/brand/:id
// @access Private
exports.updataBrand = asyncHandler(async (req, res, next) => {
  const brand = await brandModel.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  if (!brand) {
    return next(new ApiError(`No Brand for this id ${req.params.id}`, 404));
  }
  res
    .status(200)
    .json({ status: "true", message: "Brand updated", data: brand });
});
//@desc Delete specific brand
// @rout Delete /api/brand/:id
// @access priveta
exports.deleteBrand = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const brand = await brandModel.findByIdAndDelete(id);
  if (!brand) {
    return next(new ApiError(`No brand for this id ${id}`, 404));
  }
  res.status(200).json({ status: "true", message: "Brand Deleted" });
});
