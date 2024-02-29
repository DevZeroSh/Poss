const express = require("express");

const authService = require("../services/authService");

const expenseCategoriesRoute = express.Router();

const {
    createExpenseCategory,
    getExpenseCategories,
    getOneExpenseCategory,
    deleteOneExpenseCategory,
    updateOneExpenseCategory,
} = require("../services/expensesCategoryService");

expenseCategoriesRoute.use(authService.protect);
expenseCategoriesRoute.route("/").post(authService.allowedTo("expense category"), createExpenseCategory).get(getExpenseCategories);
expenseCategoriesRoute
    .route("/:id")
    .get(getOneExpenseCategory)
    .delete(authService.allowedTo("delete expense category"), deleteOneExpenseCategory)
    .put(authService.allowedTo("expense category"), updateOneExpenseCategory);

module.exports = expenseCategoriesRoute;
