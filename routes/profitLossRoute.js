const express = require("express");

const authService = require("../services/authService");
const {
    getAllProfitLossReports,
    createProfitLossReport,
    updateProfitLossReportByYearMonth,
    createInitialProfitLossReports,
} = require("../services/profitLossService");

const profitLossRoute = express.Router();
profitLossRoute.use(authService.protect);

profitLossRoute.route("/initialize").post(authService.allowedTo("ProfitLoss"),createInitialProfitLossReports);
profitLossRoute.route("/").get(getAllProfitLossReports).post(authService.allowedTo("ProfitLoss"),createProfitLossReport);
profitLossRoute.route("/:year/:month").put(authService.allowedTo("ProfitLoss"),updateProfitLossReportByYearMonth);

module.exports = profitLossRoute;
