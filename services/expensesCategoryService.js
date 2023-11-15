const asyncHandler = require("express-async-handler");
const expensesCategoryModel = require("../models/expensesCategoryModel");
const ApiError = require("../utils/apiError");

// Create new expense category
// @route get /api/expenseCategories
exports.createExpenseCategory = asyncHandler(async (req, res, next) => {
    try {
        const expenseCategory = await expensesCategoryModel.create(req.body);
        res.status(201).json({
            status: "true",
            message: "expense Category Inserted",
            data: expenseCategory,
        });
    } catch (error) {
        return next(new ApiError(error, 404));
    }
});

// Get all expense categories
// @route get /api/expenseCategories
exports.getExpenseCategories = asyncHandler(async (req, res, next) => {
    try {
        const expenseCategories = await expensesCategoryModel.find();
        res.status(200).json({ status: "true", data: expenseCategories });
    } catch (error) {
        return next(new ApiError(error, 404));
    }
});

// Get one expense category
// @route get /api/expenseCategories/:id
exports.getOneExpenseCategory = asyncHandler(async (req, res, next) => {
    try {
        const { id } = req.params;
        const expenseCategory = await expensesCategoryModel.findById(id);
        if (!expenseCategory) {
            return next(new ApiError(`There is no expense category with this id ${id}`, 404));
        } else {
            res.status(200).json({ status: "true", data: expenseCategory });
        }
    } catch (error) {
        return next(new ApiError(error, 404));
    }
});

// Delete One expense category
// @route delete /api/expenseCategories/:id
exports.deleteOneExpenseCategory = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const expenseCategory = await expensesCategoryModel.findByIdAndDelete(id);

    if (!expenseCategory) {
        return next(new ApiError(`There is no expense category with this id ${id}`, 404));
    } else {
        res.status(200).json({ status: "true", message: "Expense category deleted" });
    }
});

// @desc Update specific expense category
// @route delete /api/expenseCategories/:id
exports.updateOneExpenseCategory = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const expenseCategory = await expensesCategoryModel.findByIdAndUpdate({ _id: id }, req.body, {
        new: true,
    });
    if (!expenseCategory) {
        return next(new ApiError(`There is no expense category with this id ${id}`, 404));
    } else {
        res.status(200).json({ status: "true", message: "Expense category updated" });
    }
});
