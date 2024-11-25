const express = require("express");

const authService = require("../services/authService");
const {
  getAccountingTransaction,
  createAccountTransaction,
  getOneAccountTransaction,
} = require("../services/accountServices");

const accountingRoute = express.Router();

accountingRoute.use(authService.protect);

accountingRoute
  .route("/")
  .get(getAccountingTransaction)
  .post(createAccountTransaction);
accountingRoute.route("/:id").get(getOneAccountTransaction);
module.exports = accountingRoute;
