const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const reportsFinancialFundsSchema = require("../models/reportsFinancialFunds");
const financialFundsSchema = require("../models/financialFundsModel");

//get all financial funds reports
exports.getReportsFinancialFunds = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  db.model("FinancialFunds", financialFundsSchema);
  const ReportsFinancialFundsModel = db.model(
    "ReportsFinancialFunds",
    reportsFinancialFundsSchema
  );

  const financialFundReports = await ReportsFinancialFundsModel.find({
    archives: { $ne: true },
  })
    .sort({ createdAt: -1 })
    .populate({
      path: "financialFundId",
      select: "fundName activeinpos",
    });

  res.status(200).json({ status: "true", data: financialFundReports });
});

//Bring all reports related to a specific financial fund id
exports.getSpecificReports = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const dbName = req.query.databaseName;
  const pageSize = 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  const db = mongoose.connection.useDb(dbName);
  const ReportsFinancialFundsModel = db.model(
    "ReportsFinancialFunds",
    reportsFinancialFundsSchema
  );

  const financialReports = await ReportsFinancialFundsModel.find({
    financialFundId: id,
  });
  let runningBalance = 0;
  financialReports.forEach((transaction) => {
    if (
      transaction.type === "expense" ||
      transaction.type === "purchase" ||
      transaction.type === "transfer_to" ||
      transaction.type === "refund-sales" ||
      transaction.type === "payment-sup" ||
      transaction.type === "cancel"
    ) {
      runningBalance -= transaction?.amount;
    } else {
      runningBalance += transaction?.amount;
    }
    transaction.runningBalance = runningBalance;
    console.log(runningBalance);
  });

  // Sort transactions in descending order before applying pagination
  const sortedTransactions = financialReports.sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  // Apply pagination to the transactions with running balances
  const paginatedTransactions = sortedTransactions.slice(skip, skip + pageSize);

  const totalItems = financialReports.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  res.status(200).json({
    status: "true",
    pages: totalPages,
    results: paginatedTransactions.length,
    data: financialReports,
  });
});
