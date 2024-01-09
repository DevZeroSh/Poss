const asyncHandler = require("express-async-handler");
const discountSchema = require("../models/discountModel");
const ApiError = require("../utils/apiError");
const mongoose = require("mongoose");

//Create New discount
//@rol: Who has rol can create the discount
exports.createDiscount = asyncHandler(async (req, res, next) => {
    
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    const discountModel = db.model("Discount", discountSchema);

    const discount = await discountModel.create(req.body);
    res.status(201).json({
        status: "true",
        message: "Discount inserted",
        data: discount,
    });
});

//Get all discounts
//@rol: who has rol can Get Customars Data
exports.getDiscounts = asyncHandler(async (req, res, next) => {
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    const discountModel = db.model("Discount", discountSchema);

    const discounts = await discountModel.find();
    res.status(200).json({ staus: "true", data: discounts });
});

//Get one discount
//@rol: who has rol can Get one discount Data
exports.getOneDiscount = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    const discountModel = db.model("Discount", discountSchema);

    const discount = await discountModel.findById(id);

    if (!discount) {
        return next(new ApiError(`There is no discount with this id ${id}`, 404));
    } else {
        res.status(200).json({ status: "true", data: discount });
    }
});

//Update one Discount
//@rol: who has rol can update the discount's Data
exports.updateDiscount = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    const discountModel = db.model("Discount", discountSchema);

    const discount = await discountModel.findByIdAndUpdate(id, req.body, {
        new: true,
    });

    if (!discount) {
        return next(new ApiError(`There is no discount with this id ${id}`, 404));
    } else {
        res.status(200).json({
            status: "true",
            message: "Discount updated",
            data: discount,
        });
    }
});

//Delete One discount
//@rol:who has rol can Delete the Discount
exports.deleteDiscount = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    const discountModel = db.model("Discount", discountSchema);
    const discount = await discountModel.findByIdAndDelete(id);

    if (!discount) {
        return next(new ApiError(`There is no customer with this id ${id}`, 404));
    } else {
        res.status(200).json({ status: "true", message: "Discount Deleted" });
    }
});
