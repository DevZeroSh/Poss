const express = require("express");
const {
    getFinancialFunds,
    createFinancialFunds,
    getOneFinancialFund,
    financialFund,
    deletefinancialFund,
} = require("../services/financialFundsService");

const authService = require("../services/authService");
const financialFundsRoute = express.Router();

financialFundsRoute.use(authService.protect);

financialFundsRoute.route("/").get(getFinancialFunds).post(createFinancialFunds);
financialFundsRoute.route("/:id").get(getOneFinancialFund).put(financialFund).delete(deletefinancialFund);

module.exports = financialFundsRoute;
