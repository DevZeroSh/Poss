const express = require("express");

const authService = require("../services/authService");
const {
  createInvoiceExpenses,
  uploadFile,
  getInvoiceExpenses,
  getInvoiceExpense,
  updateInvoiceExpense,
  createExpenses,
  getExpenses,
  updateExpense,
  getExpense,
} = require("../services/expenseService");

const expensesRoute = express.Router();

expensesRoute.use(authService.protect);
expensesRoute.route("/ex").get(getExpenses).post(createExpenses);
expensesRoute
  .route("/")
  .post(uploadFile, createInvoiceExpenses)
  .get(getInvoiceExpenses);
expensesRoute
  .route("/:id")
  .get(getInvoiceExpense)
  .put(uploadFile, updateInvoiceExpense);
// .delete(authService.allowedTo("expenses"), deleteExpense)

expensesRoute.route("/ex/:id").get(getExpense).put(updateExpense);
module.exports = expensesRoute;
