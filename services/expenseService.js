const asyncHandler = require("express-async-handler");
const FinancialFunds = require("../models/financialFundsModel");
const expensesModel = require("../models/expensesModel");
const TaxModel = require("../models/taxModel");
const multer = require("multer");
const ApiError = require("../utils/apiError");
const { v4: uuidv4 } = require("uuid");

const multerStorage = multer.diskStorage({
    filename: function (req, file, callback) {
        /*Specify the filename for the uploaded file*/
        //get file extension
        const originalname = file.originalname;
        const lastDotIndex = originalname.lastIndexOf(".");
        const fileExtension = lastDotIndex !== -1 ? originalname.slice(lastDotIndex + 1) : "";
        const filename = `ex-${uuidv4()}-${Date.now()}-${Math.floor(Math.random() * (10000000000 - 1 + 1)) + 1}.${fileExtension}`;

        callback(null, filename);
    },
    destination: function (req, file, callback) {
        // Specify the destination folder for storing the files
        callback(null, "./uploads/expenses");
    },
});

const upload = multer({
    storage: multerStorage,
    fileFilter: (req, file, callback) => {
        const allowedMimes = ["image/jpeg", "image/png", "application/pdf"];
        if (allowedMimes.includes(file.mimetype)) {
            callback(null, true);
        } else {
            callback(new ApiError("Invalid file type. Only images and PDFs are allowed."));
        }
    },
});

exports.uploadFiles = upload.any();

// @desc Create expenses
// @route Post /api/expenses
exports.createExpenses = asyncHandler(async (req, res, next) => {
    try {
        const uploadedFiles = req.files.map((file) => `${file.filename}`);
        const fundId = req.body.expenseFinancialFund; // replace with your actual ID
        const taxId = req.body.expenseTax;

        //find the tax value using taxId
        const taxValue = await TaxModel.findById(taxId);
        if (!taxValue) {
            return next(new ApiError(`tax value not found`, 404));
        }

        req.body.expenseTax = taxValue.tax;

        // Find the financial fund by ID
        const financialFund = await FinancialFunds.findById(fundId);

        if (!financialFund) {
            return next(new ApiError(`Financial fund not found`, 404));
        }
        req.body.expenseFinancialFund = financialFund.fundName;
        // Decrease the fundBalance
        financialFund.fundBalance -= req.body.expenseQuantityAfterKdv;

        // Save the updated financial fund
        await financialFund.save();

        const nextCounter = (await expensesModel.countDocuments()) + 1;

        const expense = await expensesModel.create({ ...req.body, counter: nextCounter, expenseFile: uploadedFiles });

        res.status(201).json({ status: "true", message: "Expense inserted", data: expense });
    } catch (error) {
        // If an error occurs, handle it and do not change anything
        console.error("Error creating expense:", error);
        return next(new ApiError("Error creating expense", 500));
    }
});

//Get All Expenses
//@rol: who has rol can Get Expenses Data
exports.getExpenses = asyncHandler(async (req, res, next) => {
    //.populate({ path: "expenseCurrency", select: "currencyName _id" })
    const expenses = await expensesModel
        .find()
        .populate({ path: "expenseCategory", select: "expenseCategoryName expenseCategoryDescription _id" })
    res.status(200).json({ status: "true", data: expenses });
});

//Get One Expense
//@rol: who has rol can Get the Expense's Data
exports.getExpense = asyncHandler(async (req, res, next) => {
    // .populate({ path: "expenseCurrency", select: "currencyName _id" })
    const { id } = req.params;
    const expense = await expensesModel
        .findById(id)
        .populate({ path: "expenseCategory", select: "expenseCategoryName expenseCategoryDescription _id" });

    if (!expense) {
        return next(new ApiError(`There is no expense with this id ${id}`, 404));
    } else {
        res.status(200).json({ status: "true", data: expense });
    }
});

//Delete One Expense(Put it in archives)
//@rol:who has rol can Delete the Expense
// exports.deleteExpense = asyncHandler(async (req, res, next) => {
//     const { id } = req.params;

//     const expense = await expensesModel.findByIdAndDelete(id);

//     if (!expense) {
//         return next(new ApiError(`There is no expense with this id ${id}`, 404));
//     } else {
//         res.status(200).json({ status: "true", message: "Expense Deleted" });
//     }
// });

// @desc Update specific expense
// @route Put /api/expenses/:id
// @access Private
// exports.updateExpense = asyncHandler(async (req, res, next) => {
//     const { id } = req.params;

//     const uploadedFiles = req.files.map((file) => `${file.filename}`);
//     const expense = await expensesModel.findByIdAndUpdate({ _id: id }, { ...req.body, expenseFile: uploadedFiles }, { new: true });

//     if (!expense) {
//         return next(new ApiError(`No expense for this id ${req.params.id}`, 404));
//     }
//     res.status(200).json({ status: "true", message: "Expense updated", data: expense });
// });
