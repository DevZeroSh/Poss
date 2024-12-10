const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const AccountingTree = require("../models/accountingTreeModel");
const ApiError = require("../utils/apiError");
const xlsx = require("xlsx");
exports.getAccountingTree = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const accountingTree = db.model("AccountingTree", AccountingTree);

  try {
    const getAllAccount = await accountingTree.find();

    const buildTree = (data, parentCode = null) => {
      return data
        .filter((item) => item.parentCode === parentCode)
        .map((item) => {
          const children = buildTree(data, item.code);
          const initialBalance = item.balance;
          const totalChildBalance = children.reduce(
            (sum, child) => sum + (child.balance || 0),
            0
          );

          return {
            ...item._doc,
            balance: initialBalance + totalChildBalance,
            children: children.length > 0 ? children : [],
          };
        });
    };

    const treeData = buildTree(getAllAccount);
    res.status(200).json({ status: "success", data: treeData });
  } catch (error) {
    next(error);
  }
});

exports.getAccountingTreeNoBalance = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const accountingTree = db.model("AccountingTree", AccountingTree);

  const account = await accountingTree.find();

  res.status(200).json({ results: account.length, data: account });
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
  const type = req.params.id;
  const getAllAccount = await accountingTree.find({
    $or: [{ accountType: type }, { accountType: type }],
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
  console.log(accountingTree[0].balance);

  if (accountingTree.length === 1 && accountingTree[0].balance === 0) {
    const deleteAccountTree = await accountingTreeModel.deleteOne({ code: id });
  } else if (accountingTree.length > 1) {
    return next(new ApiError(`that have a chiled ${id}`));
  } else if (accountingTree.balance !== 0) {
    return next(new ApiError(`that have a balance ${id}`));
  } else {
    return next(new ApiError(`not fund the account Tree for this code ${id}`));
  }
  res.status(200).json({
    status: "true",
    meesage: "deleted",
  });
});

exports.importAccountingTree = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const accountingTree = db.model("AccountingTree", AccountingTree);
  // Check if file is provided
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  const { buffer } = req.file;
  let csvData;

  if (
    req.file.originalname.endsWith(".csv") ||
    req.file.mimetype === "text/csv"
  ) {
    csvData = await csvtojson().fromString(buffer.toString());
  } else if (
    req.file.originalname.endsWith(".xlsx") ||
    req.file.mimetype ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheet_name_list = workbook.SheetNames;
    csvData = xlsx.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
  } else {
    return res.status(400).json({ error: "Unsupported file type" });
  }

  try {
    // Insert Tree into the database
    const insertedTree = await accountingTree.insertMany(csvData, {
      ordered: false,
    });

    res.status(200).json({
      status: "success",
      message: "Tree imported successfully",
      data: insertedTree,
    });
  } catch (error) {
    res.status(500).json({
      status: "faild",
      error: error.message,
    });
  }
});

exports.changeBalance = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const accountingTree = db.model("AccountingTree", AccountingTree);

  const { id } = req.params;

  const account = await accountingTree.findOneAndUpdate(
    { _id: id },
    {
      $inc: { balance: req.body.balance },
    },
    { new: true }
  );

  res
    .status(200)
    .json({ status: "success", message: "balance Updated", data: account });
});
