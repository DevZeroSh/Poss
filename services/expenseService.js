const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const multer = require("multer");
const ApiError = require("../utils/apiError");
const { v4: uuidv4 } = require("uuid");
const expensesSchema = require("../models/expensesModel");
const expensesCategorySchama = require("../models/expensesCategoryModel");
const financialFundsSchema = require("../models/financialFundsModel");
const TaxSchema = require("../models/taxModel");
const reportsFinancialFundsSchema = require("../models/reportsFinancialFunds");
const { Search } = require("../utils/search");

const multerStorage = multer.diskStorage({
  filename: function (req, file, callback) {
    // Specify the filename for the uploaded file
    const originalname = file.originalname;
    const lastDotIndex = originalname.lastIndexOf(".");
    const fileExtension =
      lastDotIndex !== -1 ? originalname.slice(lastDotIndex + 1) : "";
    const filename = `ex-${uuidv4()}-${Date.now()}-${
      Math.floor(Math.random() * (10000000000 - 1 + 1)) + 1
    }.${fileExtension}`;

    callback(null, filename);
  },
  destination: function (req, file, callback) {
    // Specify the destination folder for storing the files
    callback(null, "./uploads/expenses");
  },
});

const upload = multer({
  storage: multerStorage,
  fileFilter: (req, file, callback) => {
    const allowedMimes = ["image/jpeg", "image/png", "application/pdf"];
    if (allowedMimes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(
        new ApiError("Invalid file type. Only images and PDFs are allowed.")
      );
    }
  },
});

// For uploading a single file
exports.uploadFile = upload.single("expenseFile"); // 'file' is the field name expected in the form

// @desc Create expenses
// @route Post /api/expenses
exports.createExpenses = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const expensesModel = db.model("Expenses", expensesSchema);
  const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
  const TaxModel = db.model("Tax", TaxSchema);
  const ReportsFinancialFundsModel = db.model(
    "ReportsFinancialFunds",
    reportsFinancialFundsSchema
  );
  function padZero(value) {
    return value < 10 ? `0${value}` : value;
  }

  const ts = Date.now();
  const date_ob = new Date(ts);
  const formattedDate = `${date_ob.getFullYear()}-${padZero(
    date_ob.getMonth() + 1
  )}-${padZero(date_ob.getDate())} ${padZero(date_ob.getHours())}:${padZero(
    date_ob.getMinutes()
  )}:${padZero(date_ob.getSeconds())}:${padZero(date_ob.getMilliseconds())}`;
  const nextCounter = (await expensesModel.countDocuments()) + 1;
  req.body.counter = nextCounter;
  const expense = await expensesModel.create(req.body);

  if (req.body.paidStatus === "paid") {
    const financialFunds = await FinancialFundsModel.findById(
      req.body.finincalFund
    );

    financialFunds.fundBalance -= req.body.invoiceCurrencyTotal;

    if (financialFunds) {
      ReportsFinancialFundsModel.create({
        date: formattedDate,
        amount: req.body.invoiceCurrencyTotal,
        exchangeAmount: req.body.MainCurrencyTotal,
        expense: expense._id,
        type: "expense",
        financialFundId: financialFunds._id,
        financialFundRest: financialFunds.fundBalance,
        exchangeRate: req.body.currencyExchangeRate,
      });
      financialFunds.save();
    }
  }
  res.status(200).json({ status: "success", data: expense });
});

//Get All Expenses
//@rol: who has rol can Get Expenses Data
exports.getExpenses = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const expensesModel = db.model("Expenses", expensesSchema);
  db.model("ExpensesCategory", expensesCategorySchama);

  // Search for product or qr
  const { totalPages, mongooseQuery } = await Search(expensesModel, req);

  const expenses = await mongooseQuery.sort({ expenseDate: -1 });
  res.status(200).json({
    status: "true",
    Pages: totalPages,
    results: expenses.length,
    data: expenses,
  });
});

//Get One Expense
//@rol: who has rol can Get the Expense's Data
exports.getExpense = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const dbName = req.query.databaseName;

  const db = mongoose.connection.useDb(dbName);

  const expensesModel = db.model("Expenses", expensesSchema);
  db.model("ExpensesCategory", expensesCategorySchama);

  const expense = await expensesModel.findById(id).populate({
    path: "expenseCategory",
    select: "expenseCategoryName expenseCategoryDescription _id",
  });

  if (!expense) {
    return next(new ApiError(`There is no expense with this id ${id}`, 404));
  } else {
    res.status(200).json({ status: "true", data: expense });
  }
});

//Delete One Expense(Put it in archives)
//@rol:who has rol can Delete the Expense
// exports.deleteExpense = asyncHandler(async (req, res, next) => {
//     const { id } = req.params;

//     const expense = await expensesModel.findByIdAndDelete(id);

//     if (!expense) {
//         return next(new ApiError(`There is no expense with this id ${id}`, 404));
//     } else {
//         res.status(200).json({ status: "true", message: "Expense Deleted" });
//     }
// });

//@desc Update specific expense
// @route Put /api/expenses/:id
// @access Private
exports.updateExpense = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const fundId = req.body.expenseFinancialFund;

  const dbName = req.query.databaseName;

  const db = mongoose.connection.useDb(dbName);
  const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
  const expensesModel = db.model("Expenses", expensesSchema);
  const ReportsFinancialFundsModel = db.model(
    "ReportsFinancialFunds",
    reportsFinancialFundsSchema
  );

  // Find the financial fund by ID
  const financialFund = await FinancialFundsModel.findByIdAndUpdate(fundId);
  if (!financialFund) {
    return next(new ApiError(`Financial fund not found`, 404));
  }
  req.body.expenseFinancialFund = financialFund.fundName;

  //const uploadedFiles = req.files.map((file) => `${file.filename}`);
  const expense = await expensesModel.findByIdAndUpdate(
    { _id: id },
    {
      paid: req.body.paid,
      expenseFinancialFund: req.body.expenseFinancialFund,
    },
    { new: true }
  );
  if (!expense) {
    return next(new ApiError(`No expense for this id ${req.params.id}`, 404));
  }

  financialFund.fundBalance -= req.body.expenseTotalExchangeRate;
  // Save the updated financial fund
  await financialFund.save();

  //Start create a record in reports financial fund table
  let operationDate = req.body.payDate;
  let amount = req.body.expenseTotalExchangeRate;
  let expenseId = id;
  let type = "expense";
  let financialFundId = fundId;
  let financialFundRest = financialFund.fundBalance;

  await ReportsFinancialFundsModel.create({
    date: operationDate,
    amount: expense.expenseQuantityAfterKdv,
    exchangeRate: amount,
    expense: expenseId,
    type: type,
    financialFundId: financialFundId,
    financialFundRest: financialFundRest,
  });
  //End create a record in reports financial fund table

  res.status(200).json({ status: "true", message: "Expense updated" });
});
