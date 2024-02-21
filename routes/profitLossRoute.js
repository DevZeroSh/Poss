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

profitLossRoute.route("/initialize").post(createInitialProfitLossReports);
profitLossRoute.route("/").get(getAllProfitLossReports).post(createProfitLossReport);
profitLossRoute.route("/:year/:month").put(updateProfitLossReportByYearMonth);

module.exports = profitLossRoute;
