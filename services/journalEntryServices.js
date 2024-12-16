const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const { Search } = require("../utils/search");
const journalEntrySchema = require("../models/journalEntryModel");
const AccountingTreeSchema = require("../models/accountingTreeModel");

//@desc Get Account Transaction
//@route Get /api/account
exports.getAccountingTransaction = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const AccountModel = db.model("journalEntry", journalEntrySchema);

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
  const AccountModel = db.model("journalEntry", journalEntrySchema);

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
  const AccountModel = db.model("journalEntry", journalEntrySchema);
  const accountingTreeModel = db.model("AccountingTree", AccountingTreeSchema);
  function padZero(value) {
    return value < 10 ? `0${value}` : value;
  }
  let ts = Date.now();
  let date_ob = new Date(ts);
  let date = padZero(date_ob.getDate());
  let month = padZero(date_ob.getMonth() + 1);
  let year = date_ob.getFullYear();
  let hours = padZero(date_ob.getHours());
  let minutes = padZero(date_ob.getMinutes());
  let seconds = padZero(date_ob.getSeconds());

  const formattedDate =
    year +
    "-" +
    month +
    "-" +
    date +
    " " +
    hours +
    ":" +
    minutes +
    ":" +
    seconds;

  if (req.body.date) {
    req.body.date = formattedDate;
  }
  const nextCounterPayment = (await AccountModel.countDocuments()) + 1;
  req.body.counter = nextCounterPayment;
  const account = await AccountModel.create(req.body);
  const accountingTree = await accountingTreeModel.findByIdAndUpdate(
    req.body.fromAccount.id,
    { $inc: { creditor: -req.body.fromAccount.amount } },
    { new: true }
  );
  req.body.toAccount.map(async (item) => {
    const accountingTree = await accountingTreeModel.findByIdAndUpdate(
      item.id,
      { $inc: { debtor: +item.amount } },
      { new: true }
    );
  });
  res.status(200).json({ status: "success", data: account });
});
