const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const ProfitLossReportsSchema = require("../models/profitLossReports");

//@desc     Create a new profit loss report
exports.createProfitLossReport = asyncHandler(async (req, res, next) => {
  try {
    const reportData = req.body;
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    const ProfitLoss = db.model("ProfitLossReports", ProfitLossReportsSchema);

    const { year, month } = reportData;

    const existingReport = await checkIfReportExists(year, month, req);

    if (!existingReport) {
      const newReport = new ProfitLoss(reportData);
      const savedReport = await newReport.save();
      res.status(201).json(savedReport);
    }
  } catch (error) {
    return next(new ApiError("Error creating profit loss report: " + error.message));
  }
});

const checkIfReportExists = async (year, month, req) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const ProfitLoss = db.model("ProfitLossReports", ProfitLossReportsSchema);
  try {
    const existingReport = await ProfitLoss.findOne({ year: year, month: month });
    return existingReport;
  } catch (error) {
    console.log("Error checking existence of profit loss report: " + error.message);
    return false;
  }
};

exports.getAllProfitLossReports = asyncHandler(async (req, res, next) => {
  try {
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    const ProfitLoss = db.model("ProfitLossReports", ProfitLossReportsSchema);
    const reports = await ProfitLoss.find();
    res.status(200).json(reports);
  } catch (error) {
    return next(new ApiError("Error getting profit loss reports: " + error.message));
  }
});

exports.updateProfitLossReportByYearMonth = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const ProfitLoss = db.model("ProfitLossReports", ProfitLossReportsSchema);

  const { year, month } = req.params;
  const { totalSellingPrice, totalExpenses, totalSellingCost, totalReturns } = req.body;

  try {
    const updateFields = {};
    if (totalSellingPrice !== undefined) updateFields.totalSellingPrice = totalSellingPrice;
    if (totalExpenses !== undefined) updateFields.totalExpenses = totalExpenses;
    if (totalSellingCost !== undefined) updateFields.totalSellingCost = totalSellingCost;
    if (totalReturns !== undefined) updateFields.totalReturns = totalReturns;

    const updatedReport = await ProfitLoss.findOneAndUpdate(
      { year, month },
      { $inc: updateFields },
      { new: true }
    );
    if (!updatedReport) {
      return res.status(404).json({ message: "Profit loss report not found" });
    }
    return res.json(updatedReport);
  } catch (error) {
    return res.status(500).json({ message: "Error updating profit loss report: " + error.message });
  }
});

exports.createInitialProfitLossReports = async () => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const ProfitLoss = db.model("ProfitLossReports", ProfitLossReportsSchema);
  // Get the current month and year
  const currentDate = new Date();
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  // Check if a report already exists for the current month
  const existingReport = await ProfitLoss.findOne({ month, year });

  // If no report exists, create a new one with zero values
  if (!existingReport) {
    await ProfitLoss.create({ month, year });
  }
};
