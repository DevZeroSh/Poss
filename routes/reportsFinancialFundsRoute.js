const express = require("express");

const reportsFinancialFundRoute = express.Router();

const authService = require("../services/authService");
const { getReportsFinancialFunds, getSpecificReports } = require("../services/reportsFinancialFundsService");

reportsFinancialFundRoute.use(authService.protect);

reportsFinancialFundRoute.route("/").get(authService.allowedTo("Financial Funds Reports"),getReportsFinancialFunds);
reportsFinancialFundRoute.route("/:id").get(authService.allowedTo("Financial Funds Reports"),getSpecificReports);

module.exports = reportsFinancialFundRoute;
