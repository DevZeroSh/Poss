const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const FinancialFunds = require("../models/financialFundsModel");

//@desc Get list of Financial Funds
//@route GET  /api/financialfunds
//@accsess Private
exports.getFinancialFunds = asyncHandler(async (req, res) => {
    const financialFunds = await FinancialFunds.find().populate({
        path: "fundCurrency",
        select: "_id currencyCode currencyName exchangeRate",
    });
    res.status(200).json({ status: "true", data: financialFunds });
});

// @desc Create a Financial Funds
// @route Post /api/financialfunds
// @access Private
exports.createFinancialFunds = asyncHandler(async (req, res) => {
    const financialFunds = await FinancialFunds.create(req.body);
    res.status(201).json({
        status: "true",
        message: "Financial Fund Inserted",
        data: financialFunds,
    });
});

// @desc Get specific a Financial Funds by id
// @route Get /api/financialfunds/:id
// @access Private
exports.getOneFinancialFund = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    const financialFunds = await FinancialFunds.findById(id).populate({
        path: "fundCurrency",
        select: "_id currencyCode currencyName exchangeRate",
    });
    res.status(200).json({ status: "true", data: financialFunds });
});

//@desc update specific Financial Fund by id
//@route Put /api/financialfunds/:id
//@access Private
exports.financialFund = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const financialFund = await FinancialFunds.findByIdAndUpdate({ _id: id }, req.body, {
        new: true,
    }).populate({
        path: "fundCurrency",
        select: "_id currencyCode currencyName exchangeRate",
    });

    if (!financialFund) {
        return next(new ApiError(`No financial fund for this id ${id}`, 404));
    }

    res.status(200).json({
        status: "true",
        message: "Financial fund updated",
        data: financialFund,
    });
});

//@desc Delete specific Financial fund
//@rout Delete /api/financialfunds/:id
//@access priveta
exports.deletefinancialFund = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const financialFund = await FinancialFunds.findByIdAndDelete(id);
    if (!financialFund) {
        return next(new ApiError(`No financial fund for this id ${id}`, 404));
    }

    res.status(200).json({ status: "true", message: "Financial fund Deleted" });
});
