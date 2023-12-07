const asyncHandler = require("express-async-handler");
const FinancialFunds = require("../models/financialFundsModel");
const expensesModel = require("../models/expensesModel");
const ReportsFinancialFundsModel = require("../models/reportsFinancialFunds");
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

        const taxId = req.body.expenseTax;
        //find the tax value using taxId
        const taxValue = await TaxModel.findById(taxId);
        if (!taxValue) {
            return next(new ApiError(`tax value not found`, 404));
        }
        req.body.expenseTax = taxValue.tax;

        if (req.body.paid == "paid") {
            const fundId = req.body.expenseFinancialFund; // replace with your actual ID

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
            console.log("1");
            let expense = await expensesModel.create({ ...req.body, counter: nextCounter, expenseFile: uploadedFiles });

            //Start create a record in reports financial fund table
            let operationDate = req.body.expenseDate;
            let amount = req.body.expenseQuantityAfterKdv;
            let expenseId = expense._id;
            let type = "expense";
            let financialFundId = fundId;
            let financialFundRest = financialFund.fundBalance;

            await ReportsFinancialFundsModel.create({
                date: operationDate,
                amount: amount,
                expense: expenseId,
                type: type,
                financialFundId: financialFundId,
                financialFundRest: financialFundRest,
            });
            //End create a record in reports financial fund table

            res.status(201).json({ status: "true", message: "Expense inserted", data: expense });
        } else {
            req.body.expenseFinancialFund = "Unpaid";
            const nextCounter = (await expensesModel.countDocuments()) + 1;
            console.log("2");
            let expense = await expensesModel.create({ ...req.body, counter: nextCounter, expenseFile: uploadedFiles });
            res.status(201).json({ status: "true", message: "Expense inserted", data: expense });
        }
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
    const expenses = await expensesModel.find().populate({ path: "expenseCategory", select: "expenseCategoryName expenseCategoryDescription _id" });
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

//@desc Update specific expense
// @route Put /api/expenses/:id
// @access Private
exports.updateExpense = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    console.log(req.body);

    const fundId = req.body.expenseFinancialFund; // replace with your actual ID

    // Find the financial fund by ID
    const financialFund = await FinancialFunds.findByIdAndUpdate(fundId);
    if (!financialFund) {
        return next(new ApiError(`Financial fund not found`, 404));
    }
    req.body.expenseFinancialFund = financialFund.fundName;

    //const uploadedFiles = req.files.map((file) => `${file.filename}`);
    const expense = await expensesModel.findByIdAndUpdate(
        { _id: id },
        { paid: req.body.paid, expenseFinancialFund: req.body.expenseFinancialFund },
        { new: true }
    );
    if (!expense) {
        return next(new ApiError(`No expense for this id ${req.params.id}`, 404));
    }

    financialFund.fundBalance -= expense.expenseQuantityAfterKdv;
    // Save the updated financial fund
    await financialFund.save();

    //Start create a record in reports financial fund table
    let operationDate = req.body.payDate;
    let amount = expense.expenseQuantityAfterKdv;
    let expenseId = id;
    let type = "expense";
    let financialFundId = fundId;
    let financialFundRest = financialFund.fundBalance;

    await ReportsFinancialFundsModel.create({
        date: operationDate,
        amount: amount,
        expense: expenseId,
        type: type,
        financialFundId: financialFundId,
        financialFundRest: financialFundRest,
    });
    //End create a record in reports financial fund table

    res.status(200).json({ status: "true", message: "Expense updated" });
});
