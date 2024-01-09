const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const currencySchema = require("../models/currencyModel");
const ApiError = require("../utils/apiError");

// @desc Get list of Currency
// @route GEt /api/currency
// @accsess public
exports.getCurrencies = asyncHandler(async (req, res) => {
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    const currencyModel = db.model("Currency", currencySchema);

    const currencies = await currencyModel.find();
    res.status(200).json({ status: "true", data: currencies });
});

// @desc Create one currency
// @route Post /api/currency
// @access Private
exports.createCurrency = asyncHandler(async (req, res, next) => {
    
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    const currencyModel = db.model("Currency", currencySchema);

    const currency = await currencyModel.create(req.body);
    res.status(200).json({
        status: "true",
        message: "Currency Inserted",
        data: currency,
    });
});

// @desc GET specific currency by id
// @route Get /api/currency/:id
// @access Public
exports.getCurrency = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    const currencyModel = db.model("Currency", currencySchema);

    const currency = await currencyModel.findById(id);
    if (!currency) {
        return next(new ApiError(`No currency for this id ${id}`, 404));
    }
    res.status(200).json({ status: "true", data: currency });
});

// @desc Update specific currency
// @route Put /api/currency/:id
// @access Private
exports.updataCurrency = asyncHandler(async (req, res, next) => {
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    const currencyModel = db.model("Currency", currencySchema);

    if (!req.body.is_primary || req.body.is_primary == "" || req.body.is_primary == "false" || req.body.is_primary === undefined) {
        const currency = await currencyModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!currency) {
            return next(new ApiError(`No currency for this id ${req.params.id}`, 404));
        }
        res.status(200).json({ status: "true", message: "Currency updated", data: currency });
    } else if (req.body.is_primary == "true") {
        // Update all other currency documents to is_primary to false
        await currencyModel.updateMany({ is_primary: true }, { is_primary: false });
        const currency = await currencyModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!currency) {
            return next(new ApiError(`No currency for this id ${req.params.id}`, 404));
        }
        res.status(200).json({ status: "true", message: "Currency updated", data: currency });
    }
});

// @desc Delete specific currency
// @rout Delete /api/currency/:id
// @access priveta
exports.deleteCurrency = asyncHandler(async (req, res, next) => {

    const { id } = req.params;
    const dbName = req.query.databaseName;

    const db = mongoose.connection.useDb(dbName);
    const currencyModel = db.model("Currency", currencySchema);

    const currency = await currencyModel.findById(id);

    if (!currency) {
        return next(new ApiError(`No currency for this id ${id}`, 404));
    }

    // Add a condition to check if is_primary is not true before deleting
    if (currency.is_primary !== "true") {
        await currencyModel.findByIdAndDelete(id);
        res.status(200).json({ status: true, message: "Currency Deleted" });
    } else {
        // Currency has is_primary true, so prevent deletion
        res.status(400).json({ status: false, message: "Cannot delete primary currency" });
    }
});
