const asyncHandler = require("express-async-handler");

const mongoose = require("mongoose");
const stokSchema = require("../models/stokModel");
const { default: slugify } = require("slugify");
const ApiError = require("../utils/apiError");

exports.createStok = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const stokModel = db.model("Stok", stokSchema);

  req.body.slug = slugify(req.body.name);
  const stok = await stokModel.create(req.body);
  res.status(200).json({
    status: "success",
    message: "Stok created successfully",
    data: stok,
  });
});

exports.getStoks = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const stokModel = db.model("Stok", stokSchema);
  const stoks = await stokModel.find();
  res
    .status(200)
    .json({ statusbar: "success", results: stoks.length, data: stoks });
});

exports.getOneStok = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const stokModel = db.model("Stok", stokSchema);
  const stok = await stokModel.findById(req.params.id);
  if (!stok) {
    return next(new ApiError(`No Stok found for id ${req.params.id}`, 404));
  }
  res.status(200).json({
    status: "success",
    data: stok,
  });
});

exports.updateStok = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const stokModel = db.model("Stok", stokSchema);
  req.body.slug = slugify(req.body.name);
  const stok = await stokModel.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  if (!stok) {
    return next(new ApiError(`No Stok found for id ${req.params.id}`, 404));
  }
  res.status(200).json({
    status: "success",
    data: stok,
  });
});

exports.deleteStok = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const stokModel = db.model("Stok", stokSchema);
  const stok = await stokModel.findByIdAndDelete(req.params.id);
  if (!stok) {
    return next(new ApiError(`No Stok found for id ${req.params.id}`, 404));
  }
  res.status(200).json({
    status: "success",
    message: "Stok Delete successfully",
  });
});
