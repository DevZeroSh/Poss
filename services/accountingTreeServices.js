const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const AccountingTree = require("../models/accountingTreeModel");
const ApiError = require("../utils/apiError");

exports.getAccountingTree = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const accountingTree = db.model("AccountingTree", AccountingTree);
  const getAllAccount = await accountingTree.find();
  res.status(200).json({ status: "success", data: getAllAccount });
});

exports.createAccountingTree = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const accountingTree = db.model("AccountingTree", AccountingTree);
  const createAccount = await accountingTree.create(req.body);

  res.status(200).json({ status: "success", data: createAccount });
});

exports.updateAccountingTree = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const accountingTree = db.model("AccountingTree", AccountingTree);

  const { id } = req.params;

  const updateTree = await accountingTree.findByIdAndUpdate(
    id,
    { name: req.body.name },
    { new: true }
  );

  res.status(200).json({ status: "success", data: updateTree });
});

exports.getAccountingTreeByCode = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const accountingTree = db.model("AccountingTree", AccountingTree);
  const code = req.params.id;
  const getAllAccount = await accountingTree.find({
    $or: [{ code: code }, { parentCode: code }],
  });
  res.status(200).json({ status: "success", data: getAllAccount });
});

exports.deleteAccountingTree = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const accountingTreeModel = db.model("AccountingTree", AccountingTree);

  const { id } = req.params;
  const accountingTree = await accountingTreeModel.find({
    $or: [{ code: id }, { parentCode: id }],
  });
  if (!accountingTree) {
    return next(new ApiError(`not fund the account Tree for this code ${id}`));
  }
  if (accountingTree.length === 1) {
    const deleteAccountTree = await accountingTreeModel.deleteOne({ code: id });
  } else if (accountingTree.length > 1) {
    return next(new ApiError(`that have a chiled ${id}`));
  } else {
    return next(new ApiError(`not fund the account Tree for this code ${id}`));
  }
  res.status(200).json({
    status: "true",
    meesage: "deleted",
  });
});
