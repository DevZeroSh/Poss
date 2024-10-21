const mongoose = require("mongoose");
const assetsSchema = require("../models/assetsModel");
const asyncHandler = require("express-async-handler");
const { Search } = require("../utils/search");
const ApiError = require("../utils/apiError");

exports.createAssets = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const assetsModel = db.model("Assets", assetsSchema);
  if (req.body.type === "building") {
    const findBuilding = await assetsModel.findOne({ type: "building" });
    req.body.parentAccountCode = 1211;
    req.body.code = 121100;
  }
  const createAccount = await assetsModel.create(req.body);

  res.status(200).json({ status: "success", data: createAccount });
});

exports.getAssets = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const assetsModel = db.model("Assets", assetsSchema);

  const { totalPages, mongooseQuery } = await Search(assetsModel, req);

  const assets = await mongooseQuery;

  res.status(200).json({
    status: "true",
    totalPages: totalPages,
    results: assets.length,
    data: assets,
  });
});

exports.getOneAsset = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const assetsModel = db.model("Assets", assetsSchema);
  const { id } = req.params;

  const asset = await assetsModel.findById(id);

  if (!asset) {
    return next(new ApiError(`not find asset for this id ${id}`));
  }
  res.status(200).json({
    status: "true",
    data: asset,
  });
});

exports.updateAsset = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const assetsModel = db.model("Assets", assetsSchema);
  const { id } = req.params;

  const asset = await assetsModel.findByIdAndUpdate(id, req.body, {
    new: true,
  });

  if (!asset) {
    return next(new ApiError(`not find asset for this id ${id}`));
  }
  res.status(200).json({
    status: "true",
    data: asset,
  });
});

exports.deleteAsset = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const assetsModel = db.model("Assets", assetsSchema);
  const { id } = req.params;
  const asset = await assetsModel.findByIdAndDelete(id);
  if (!asset) {
    return next(new ApiError(`not find asset for this id ${id}`));
  }
  res.status(200).json({
    status: "true",
    data: asset,
  });
});
