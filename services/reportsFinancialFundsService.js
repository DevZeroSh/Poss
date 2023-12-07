const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const ReportsFinancialFundsModel = require("../models/reportsFinancialFunds");

//get all financial funds reports
exports.getReportsFinancialFunds = asyncHandler(async (req, res, next) => {
    const financialFundReports = await ReportsFinancialFundsModel.find();
    res.status(200).json({ status: "true", data: financialFundReports });
});

//Bring all reports related to a specific financial fund id
exports.getSpecificReports = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const financialReports = await ReportsFinancialFundsModel.find({ financialFundId: id });
    res.status(200).json({ status: "true", data: financialReports });
});
