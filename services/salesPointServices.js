const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const SalesPointSchema = require("../models/salesPointModel");

exports.createSalesPoint = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const salsePointModel = db.model("salesPoints", SalesPointSchema);

  const sales = await salsePointModel.create(req.body);

  res.status(200).json({ status: "success", data: sales });
});

exports.getSalesPoint = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const salsePointModel = db.model("salesPoints", SalesPointSchema);
  const sales = await salsePointModel.find();
  res.status(200).json({ status: "success", data: sales });
});

exports.getOneSalePoint = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const salsePointModel = db.model("salesPoints", SalesPointSchema);
  const { id } = req.params;
  const sales = await salsePointModel.findById(id);
  res.status(200).json({ status: "success", data: sales });
});
