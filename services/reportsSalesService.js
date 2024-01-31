const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const financialFundsSchema = require("../models/financialFundsModel");
const ReportsSalesSchema = require("../models/reportsSalesModel");
const emoloyeeShcema = require("../models/employeeModel");

//Get all sales
exports.getSales = asyncHandler(async (req, res, next) => {
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    const SalesModel = db.model("ReportsSales", ReportsSalesSchema);
    db.model("FinancialFunds", financialFundsSchema);
    db.model("Employee", emoloyeeShcema);

    const sales = await SalesModel.find({}).sort({ createdAt: -1 });
    if (!sales) {
        console.error(sales);
        return next(new ApiError("Couldn't find sales"));
    }
    res.status(200).json({ status: "true", data: sales });
});

// Get all preports related to a specific product
/*exports.getSpecificReports = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const dbName = req.query.databaseName;

    const db = mongoose.connection.useDb(dbName);
    const ReportsSalesSchema = db.model("ReportsSales", ReportsSalesSchema);

    const financialReports = await ReportsSalesSchema.find({
        financialFundId: id,
    }).sort({ createdAt: -1 });
    res.status(200).json({ status: "true", data: financialReports });
});
*/
