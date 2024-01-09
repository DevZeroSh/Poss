const asyncHandler = require("express-async-handler");
const brandSchema = require("../models/brandModel");
const ApiError = require("../utils/apiError");
const { default: slugify } = require("slugify");
const mongoose = require("mongoose");

// Get list of Brands
exports.getBrands = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const brandModel = db.model("brand", brandSchema);
  const brands = await brandModel.find();
  res
    .status(200)
    .json({ status: "success", results: brands.length, data: brands });
});

// Create Brand
exports.createBrand = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const brandModel = db.model("brand", brandSchema);

  req.body.slug = slugify(req.body.name);
  const brand = await brandModel.create(req.body);
  res
    .status(201)
    .json({ status: "success", message: "Brand Inserted", data: brand });
});

// Get specific Brand by id
exports.getBrand = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const brandModel = db.model("brand", brandSchema);

  const { id } = req.params;
  const brand = await brandModel.findById(id);
  
  if (!brand) {
    return next(new ApiError(`No Brand found for id ${id}`, 404));
  }
  res.status(200).json({ status: "success", data: brand });
});

// Update specific Brand
exports.updataBrand = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const brandModel = db.model("brand", brandSchema);
  const brand = await brandModel.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  if (!brand) {
    return next(new ApiError(`No Brand found for id ${req.params.id}`, 404));
  }
  res
    .status(200)
    .json({ status: "success", message: "Brand updated", data: brand });
});

// Delete specific Brand
exports.deleteBrand = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const brandModel = db.model("brand", brandSchema);
  const { id } = req.params;
  const brand = await brandModel.findByIdAndDelete(id);
  if (!brand) {
    return next(new ApiError(`No Brand found for id ${id}`, 404));
  }
  res.status(200).json({ status: "success", message: "Brand Deleted" });
});
