const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const { Search } = require("../utils/search");
const AccountTransactionSchema = require("../models/accountModel");

//@desc Get Account Transaction
//@route Get /api/account
exports.getAccountingTransaction = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const AccountModel = db.model("Account", AccountTransactionSchema);

  const { totalPages, mongooseQuery } = await Search(AccountModel, req);

  const account = await mongooseQuery;

  res.status(200).json({
    status: "true",
    totalPages: totalPages,
    results: account.length,
    data: account,
  });
});

//@desc Get Account Transaction
//@route Get /api/account:id
exports.getOneAccountTransaction = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const AccountModel = db.model("Account", AccountTransactionSchema);

  const { id } = req.params;

  const account = await AccountModel.findById(id);
  if (!account) {
    return next(new ApiError(`not find Transaction in this id: ${id}`, 404));
  }

  res.status(200).json({ data: account });
});

//@desc Create new Account Transaction
//@route post /api/account
exports.createAccountTransaction = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const AccountModel = db.model("Account", AccountTransactionSchema);

  const account = await AccountModel.create(req.body);

  res.status(200).json({ status: "success", data: account });
});
