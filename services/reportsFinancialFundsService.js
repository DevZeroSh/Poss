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
  const ReportsFinancialFundsModel = db.model("ReportsFinancialFunds", reportsFinancialFundsSchema);

  const financialFundReports = await ReportsFinancialFundsModel.find({
    archives: { $ne: true },
  })
    .sort({ createdAt: -1 })
    .populate({
      path: "financialFundId",
      select: "fundName",
    });
  res.status(200).json({ status: "true", data: financialFundReports });
});

//Bring all reports related to a specific financial fund id
exports.getSpecificReports = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const dbName = req.query.databaseName;

  const db = mongoose.connection.useDb(dbName);
  const ReportsFinancialFundsModel = db.model("ReportsFinancialFunds", reportsFinancialFundsSchema);

  const financialReports = await ReportsFinancialFundsModel.find({
    financialFundId: id,
  }).sort({ createdAt: -1 });
  res.status(200).json({ status: "true", data: financialReports });
});
