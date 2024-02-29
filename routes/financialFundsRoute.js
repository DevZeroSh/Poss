const express = require("express");
const {
  getFinancialFunds,
  createFinancialFunds,
  getOneFinancialFund,
  financialFund,
  deletefinancialFund,
  transfer,
} = require("../services/financialFundsService");

const authService = require("../services/authService");
const financialFundsRoute = express.Router();

financialFundsRoute.use(authService.protect);

financialFundsRoute
  .route("/")
  .get(getFinancialFunds)
  .post(authService.allowedTo("financial funds"), createFinancialFunds);
financialFundsRoute
  .route("/:id")
  .get(getOneFinancialFund)
  .put(authService.allowedTo("financial funds"), financialFund)
  .delete(authService.allowedTo("delete financial funds"), deletefinancialFund);
financialFundsRoute
  .route("/trans/:id")
  .put(authService.allowedTo("transfer financial funds"), transfer);
module.exports = financialFundsRoute;
