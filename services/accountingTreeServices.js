const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const AccountingTree = require("../models/accountingTreeModel");

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
