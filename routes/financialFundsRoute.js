const express = require("express");
const {
  getFinancialFunds,
  createFinancialFunds,
  getOneFinancialFund,
  financialFund,
  deletefinancialFund,
  transfer,
  getFinancialFundForSalesPoint,
} = require("../services/financialFundsService");

const authService = require("../services/authService");
const financialFundsRoute = express.Router();

financialFundsRoute.use(authService.protect);

financialFundsRoute
  .route("/")
  .get(getFinancialFunds)
  .post(createFinancialFunds);
financialFundsRoute
  .route("/:id")
  .get(getOneFinancialFund)
  .put(financialFund)
  .delete(deletefinancialFund);
financialFundsRoute
  .route("/trans/:id")
  .put(transfer)
  .get(getFinancialFundForSalesPoint);
module.exports = financialFundsRoute;
