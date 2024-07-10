const asyncHandler = require("express-async-handler");

const mongoose = require("mongoose");
const StockSchema = require("../models/stockModel");
const { default: slugify } = require("slugify");
const ApiError = require("../utils/apiError");
const productSchema = require("../models/productModel");

exports.createStock = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const StockModel = db.model("Stock", StockSchema);

  req.body.slug = slugify(req.body.name);
  const Stock = await StockModel.create(req.body);
  res.status(200).json({
    status: "success",
    message: "Stock created successfully",
    data: Stock,
  });
});

exports.getStocks = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const StockModel = db.model("Stock", StockSchema);
  const Stocks = await StockModel.find();
  res
    .status(200)
    .json({ statusbar: "success", results: Stocks.length, data: Stocks });
});

exports.getOneStock = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const StockModel = db.model("Stock", StockSchema);
  db.model("Product", productSchema);
  const Stock = await StockModel.findById(req.params.id);
  if (!Stock) {
    return next(new ApiError(`No Stock found for id ${req.params.id}`, 404));
  }
  res.status(200).json({
    status: "success",
    data: Stock,
  });
});

exports.updateStock = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const StockModel = db.model("Stock", StockSchema);
  req.body.slug = slugify(req.body.name);
  const Stock = await StockModel.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  if (!Stock) {
    return next(new ApiError(`No Stock found for id ${req.params.id}`, 404));
  }
  res.status(200).json({
    status: "success",
    data: Stock,
  });
});

exports.deleteStock = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const StockModel = db.model("Stock", StockSchema);
  const Stock = await StockModel.findByIdAndDelete(req.params.id);
  if (!Stock) {
    return next(new ApiError(`No Stock found for id ${req.params.id}`, 404));
  }
  res.status(200).json({
    status: "success",
    message: "Stock Delete successfully",
  });
});


