const express = require("express");

const authService = require("../services/authService");
const {
    createExpenses,
    uploadFiles,
    getExpenses,
    getExpense,
    deleteExpense,
    updateExpense,
} = require("../services/expenseService");

const expensesRoute = express.Router();

expensesRoute.use(authService.protect);
expensesRoute.route("/").post(uploadFiles, createExpenses).get(getExpenses);
expensesRoute.route("/:id").get(getExpense).delete(deleteExpense).put(uploadFiles, updateExpense);

module.exports = expensesRoute;
