const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const FinancialLossSchema = require("../models/financialLossModel");

//@desc     Create a new financial loss report
exports.createFinancialLossReport = asyncHandler(async (req, res, next) => {
  try {
    const data = req.body;
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    const FinancialLoss = db.model("FinancialLoss", FinancialLossSchema);

    const newReport = new FinancialLoss(data);
    const savedReport = await newReport.save();
    res.status(201).json(savedReport);
  } catch (error) {
    console.log(error.message);
    return next(new ApiError("Error creating financial loss: " + error.message));
  }
});

exports.getAllFinancialLoss = asyncHandler(async (req, res, next) => {
  try {
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    const FinancialLoss = db.model("FinancialLoss", FinancialLossSchema);
    const reports = await FinancialLoss.find();
    res.status(200).json(reports);
  } catch (error) {
    return next(new ApiError("Error getting financial loss: " + error.message));
  }
});

exports.getOneFinancialLoss = asyncHandler(async (req, res, next) => {
  try {
    const dbName = req.query.databaseName;
    const { id } = req.params;

    const db = mongoose.connection.useDb(dbName);
    const FinancialLoss = db.model("FinancialLoss", FinancialLossSchema);
    let report;
    report = await FinancialLoss.findById(id);
    if (report === null) {
      report = await FinancialLoss.findOne({ reportRef: id });
    }

    res.status(200).json(report);
  } catch (error) {
    return next(new ApiError("Error getting financial loss: " + error.message));
  }
});
