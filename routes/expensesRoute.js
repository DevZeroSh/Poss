const express = require("express");

const authService = require("../services/authService");
const {
  createExpenses,
  uploadFile,
  getExpenses,
  getExpense,
  deleteExpense,
  updateExpense,
} = require("../services/expenseService");

const expensesRoute = express.Router();

expensesRoute.use(authService.protect);
expensesRoute.route("/").post(uploadFile, createExpenses).get(getExpenses);
expensesRoute.route("/:id").get(getExpense).put(updateExpense);
// .delete(authService.allowedTo("expenses"), deleteExpense)

module.exports = expensesRoute;
