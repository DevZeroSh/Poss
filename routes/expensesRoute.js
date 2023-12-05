const express = require("express");

const authService = require("../services/authService");
const { createExpenses, uploadFiles, getExpenses, getExpense, deleteExpense, updateExpense } = require("../services/expenseService");

const expensesRoute = express.Router();

expensesRoute.use(authService.protect);
expensesRoute.route("/").post(authService.allowedTo("expenses"), uploadFiles, createExpenses).get(getExpenses);
expensesRoute.route("/:id").get(getExpense);
// .delete(authService.allowedTo("expenses"), deleteExpense)
// .put(authService.allowedTo("expenses"), uploadFiles, updateExpense);

module.exports = expensesRoute;
