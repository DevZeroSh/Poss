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

profitLossRoute.route("/initialize").post(authService.allowedTo("view reports"),createInitialProfitLossReports);
profitLossRoute.route("/").get(getAllProfitLossReports).post(authService.allowedTo("view reports"),createProfitLossReport);
profitLossRoute.route("/:year/:month").put(authService.allowedTo("view reports"),updateProfitLossReportByYearMonth);

module.exports = profitLossRoute;
