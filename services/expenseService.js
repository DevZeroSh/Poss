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
const { createInvoiceHistory } = require("./invoiceHistoryService");
const invoiceHistorySchema = require("../models/invoiceHistoryModel");
const emoloyeeShcema = require("../models/employeeModel");
const supplierSchema = require("../models/suppliersModel");
const PurchaseInvoicesSchema = require("../models/purchaseinvoicesModel");
const { createPaymentHistory } = require("./paymentHistoryService");

const multerStorage = multer.diskStorage({
  destination: function (req, file, callback) {
    // Specify the destination folder for storing the files
    callback(null, "./uploads/expenses");
  },
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

exports.uploadFile = upload.single("expenseFile");

// @desc Create invoice expenses
// @route POST /api/expenses
exports.createInvoiceExpenses = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const expensesModel = db.model("PurchaseInvoices", PurchaseInvoicesSchema);
  const SupplierModel = db.model("Supplier", supplierSchema);
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
  req.body.invoiceNumber = nextCounter;
  req.body.expenseFile = req.file?.filename;

  // Create the expense document
  const expense = await expensesModel.create(req.body);
  const supplier = await SupplierModel.findById(req.body.suppliersId);

  // Set the full URL for the expense file

  if (req.body.paid === "paid") {
    const financialFunds = await FinancialFundsModel.findById(
      req.body.finincalFund
    );
    financialFunds.fundBalance -= req.body.invoiceCurrencyTotal;

    if (financialFunds) {
      await ReportsFinancialFundsModel.create({
        date: formattedDate,
        amount: req.body.invoiceCurrencyTotal,
        exchangeAmount: req.body.MainCurrencyTotal,
        expense: expense._id,
        type: "expense",
        financialFundId: financialFunds._id,
        financialFundRest: financialFunds.fundBalance,
        exchangeRate: req.body.currencyExchangeRate,
      });
      await financialFunds.save();
    }

    req.body.totalRemainderMainCurrency = 0;
    req.body.totalRemainder = 0;
    await expense.save();
  }

  // Call history functions
  await createPaymentHistory(
    "invoice",
    req.body.expenseDate || formattedDate,
    req.body.MainCurrencyTotal,
    supplier.TotalUnpaid,
    "supplier",
    req.body.suppliersId,
    nextCounter,
    dbName
  );

  await createInvoiceHistory(
    dbName,
    expense._id,
    "create",
    req.user._id,
    formattedDate
  );

  // Send response
  res.status(200).json({ status: "success", data: expense });
});

//Get All invoice Expenses
//@rol: who has rol can Get Expenses Data
exports.getInvoiceExpenses = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const expensesModel = db.model("PurchaseInvoices", PurchaseInvoicesSchema);
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

//Get One invoice Expense
//@rol: who has rol can Get the Expense's Data
exports.getInvoiceExpense = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const dbName = req.query.databaseName;

  const db = mongoose.connection.useDb(dbName);

  const expensesModel = db.model("PurchaseInvoices", PurchaseInvoicesSchema);
  db.model("ExpensesCategory", expensesCategorySchama);
  const invoiceHistoryModel = db.model("invoiceHistory", invoiceHistorySchema);
  db.model("Employee", emoloyeeShcema);

  const expense = await expensesModel.findById(id).populate({
    path: "expenseCategory",
    select: "expenseCategoryName expenseCategoryDescription _id",
  });

  if (!expense) {
    return next(new ApiError(`There is no expense with this id ${id}`, 404));
  }

  const pageSize = req.query.limit || 20;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  const totalItems = await invoiceHistoryModel.countDocuments();

  const totalPages = Math.ceil(totalItems / pageSize);
  const casehistory = await invoiceHistoryModel
    .find({
      invoiceId: id,
    })
    .populate("employeeId")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize);

  res.status(200).json({
    status: "true",
    Pages: totalPages,
    data: expense,
    history: casehistory,
  });
});

//@desc Update specific invoice expense
// @route Put /api/expenses/:id
// @access Private
exports.updateInvoiceExpense = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
  const expensesModel = db.model("PurchaseInvoices", PurchaseInvoicesSchema);
  const ReportsFinancialFundsModel = db.model(
    "ReportsFinancialFunds",
    reportsFinancialFundsSchema
  );

  const { id } = req.params;

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

  const expense = await expensesModel.findByIdAndUpdate(id, req.body, {
    new: true,
  });
  if (!expense) {
    return next(new ApiError(`No expense for this id ${req.params.id}`, 404));
  }
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

  const history = createInvoiceHistory(
    dbName,
    id,
    "edit",
    req.user._id,
    formattedDate
  );
  res.status(200).json({ status: "true", message: "Expense updated" });
});

exports.createExpenses = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const expensesModel = db.model("expenses", expensesSchema);

  const newExpense = await expensesModel.create(req.body);

  res.status(200).json({ status: "success", data: newExpense });
});

exports.getExpenses = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const expensesModel = db.model("expenses", expensesSchema);

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
  const expensesModel = db.model("expenses", expensesSchema);
  db.model("ExpensesCategory", expensesCategorySchama);
  const expense = await expensesModel.findById(id).populate({
    path: "expenseCategory",
    select: "expenseCategoryName expenseCategoryDescription _id",
  });
  if (!expense) {
    return next(new ApiError(`There is no expense with this id ${id}`, 404));
  }
  res.status(200).json({
    status: "true",
    data: expense,
  });
});

exports.updateExpense = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const expensesModel = db.model("expenses", expensesSchema);
  db.model("ExpensesCategory", expensesCategorySchama);
  const expense = await expensesModel.findByIdAndUpdate(id, req.body, {
    new: true,
  });
  if (!expense) {
    return next(new ApiError(`There is no expense with this id ${id}`, 404));
  }
  res.status(200).json({
    status: "true",
    data: expense,
  });
});
