const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const supplierSchema = require("../models/suppliersModel");
const { Search } = require("../utils/search");
const productSchema = require("../models/productModel");
const categorySchema = require("../models/CategoryModel");
const brandSchema = require("../models/brandModel");
const labelsSchema = require("../models/labelsModel");
const TaxSchema = require("../models/taxModel");
const UnitSchema = require("../models/UnitsModel");
const variantSchema = require("../models/variantsModel");
const currencySchema = require("../models/currencyModel");

//Create New Supplier
//rol:Who has rol can create
exports.createSupplier = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const supplierModel = db.model("Supplier", supplierSchema);
  const supplier = await supplierModel.create(req.body);
  res
    .status(201)
    .json({ status: "true", message: "Supplier Inserted", data: supplier });
});

//Get All Suppliers
//@rol: who has rol can Get Suppliers Data
exports.getSuppliers = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const supplierModel = db.model("Supplier", supplierSchema);
  db.model("Product", productSchema);
  db.model("Category", categorySchema);
  db.model("brand", brandSchema);
  db.model("Labels", labelsSchema);
  db.model("Tax", TaxSchema);
  db.model("Unit", UnitSchema);
  db.model("Variant", variantSchema);
  db.model("Currency", currencySchema);
  const { totalPages, mongooseQuery } = await Search(supplierModel, req);

  const supplier = await mongooseQuery;

  res.status(200).json({
    status: "true",
    totalPages: totalPages,
    results: supplier.length,
    data: supplier,
  });
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

  const supplier = await supplierModel.findByIdAndUpdate(id, req.body, {
    new: true,
  });
  if (!supplier) {
    return next(new ApiError(`There is no supplier with this id ${id}`, 404));
  } else {
    res
      .status(200)
      .json({ status: "true", message: "Supplier updated", data: supplier });
  }
});

//Delete One Supplier(Put it in archives)
//@rol:who has rol can Delete the Supplier
exports.deleteSupplier = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const supplierModel = db.model("Supplier", supplierSchema);
  const supplier = await supplierModel.findByIdAndUpdate(
    id,
    { archives: "true" },
    { new: true }
  );

  if (!supplier) {
    return next(new ApiError(`There is no supplier with this id ${id}`, 404));
  } else {
    res.status(200).json({ status: "true", message: "Supplier Deleted" });
  }
});
