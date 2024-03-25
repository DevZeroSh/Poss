const express = require("express");

const authService = require("../services/authService");
const {
  getAllFinancialLoss,
  createFinancialLossReport,
  getOneFinancialLoss,
} = require("../services/financialLossService");

const financialLossRoute = express.Router();
financialLossRoute.use(authService.protect);

financialLossRoute.route("/").get(getAllFinancialLoss).post(createFinancialLossReport);
financialLossRoute.route("/:id").get(getOneFinancialLoss);

module.exports = financialLossRoute;
