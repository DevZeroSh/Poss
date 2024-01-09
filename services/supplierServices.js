const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const supplierSchema = require("../models/suppliersModel");

//Create New Supplier
//rol:Who has rol can create
exports.createSupplier = asyncHandler(async (req, res, next) => {
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    const supplierModel = db.model("Supplier", supplierSchema);
    const supplier = await supplierModel.create(req.body);
    res.status(201).json({ status: "true", message: "Supplier Inserted", data: supplier });
});

//Get All Suppliers
//@rol: who has rol can Get Suppliers Data
exports.getSuppliers = asyncHandler(async (req, res, next) => {
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    const supplierModel = db.model("Supplier", supplierSchema);
    const supplier = await supplierModel.find();
    
    res.status(200).json({ status: "true", data: supplier });
});

//Get One Supplier
//@rol: who has rol can Get the Supplier's Data
exports.getSupplier = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    const supplierModel = db.model("Supplier", supplierSchema);
    const supplier = await supplierModel.findById(id);

    if (!supplier) {
        return next(new ApiError(`There is no supplier with this id ${id}`, 404));
    } else {
        res.status(200).json({ status: "true", data: supplier });
    }
});

//Update one Supplier
//@rol: who has rol can update the Supplier's Data
exports.updataSupplier = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    const supplierModel = db.model("Supplier", supplierSchema);

    const supplier = await supplierModel.findByIdAndUpdate(id, req.body, { new: true });
    if (!supplier) {
        return next(new ApiError(`There is no supplier with this id ${id}`, 404));
    } else {
        res.status(200).json({ status: "true", message: "Supplier updated", data: supplier });
    }
});

//Delete One Supplier(Put it in archives)
//@rol:who has rol can Delete the Supplier
exports.deleteSupplier = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    const supplierModel = db.model("Supplier", supplierSchema);
    const supplier = await supplierModel.findByIdAndUpdate(id, { archives: "true" }, { new: true });

    if (!supplier) {
        return next(new ApiError(`There is no supplier with this id ${id}`, 404));
    } else {
        res.status(200).json({ status: "true", message: "Supplier Deleted" });
    }
});
