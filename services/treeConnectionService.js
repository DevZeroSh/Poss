const asyncHandler = require("express-async-handler");
const treeConnectionSchema = require("../models/treeConnectionModel");
const mongoose = require("mongoose");

exports.getAllTreeConnection = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const treeConnectionModel = db.model("treeConnection", treeConnectionSchema);
  const pageSize = req.query.limit || 25;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  const totalItems = await treeConnectionModel.countDocuments();

  const totalPages = Math.ceil(totalItems / pageSize);
  const treeConnection = await treeConnectionModel
    .find()
    .skip(skip)
    .limit(pageSize);

  res.status(200).json({
    Pages: totalPages,
    results: treeConnection.length,
    data: treeConnection,
  });
});

exports.createTreeConnection = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const treeConnectionModel = db.model("treeConnection", treeConnectionSchema);

  const treeConnection = await treeConnectionModel.create(req.body);
  res.status(200).json({ message: "success", data: treeConnection });
});
