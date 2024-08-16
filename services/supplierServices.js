const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const supplierSchema = require("../models/suppliersModel");
const productSchema = require("../models/productModel");
const categorySchema = require("../models/CategoryModel");
const brandSchema = require("../models/brandModel");
const labelsSchema = require("../models/labelsModel");
const TaxSchema = require("../models/taxModel");
const UnitSchema = require("../models/UnitsModel");
const variantSchema = require("../models/variantsModel");
const currencySchema = require("../models/currencyModel");
const {
  createPaymentHistory,
  editPaymentHistory,
} = require("./paymentHistoryService");
const PurchaseInvoicesSchema = require("../models/purchaseinvoicesModel");

//Create New Supplier
//rol:Who has rol can create
exports.createSupplier = asyncHandler(async (req, res, next) => {
  function padZero(value) {
    return value < 10 ? `0${value}` : value;
  }

  let ts = Date.now();
  let date_ob = new Date(ts);
  let date = padZero(date_ob.getDate());
  let month = padZero(date_ob.getMonth() + 1);
  let year = date_ob.getFullYear();
  let hours = padZero(date_ob.getHours());
  let minutes = padZero(date_ob.getMinutes());
  let seconds = padZero(date_ob.getSeconds());

  const formattedDate =
    year +
    "-" +
    month +
    "-" +
    date +
    " " +
    hours +
    ":" +
    minutes +
    ":" +
    seconds;

  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const supplierModel = db.model("Supplier", supplierSchema);
  const PurchaseInvoicesModel = db.model(
    "PurchaseInvoices",
    PurchaseInvoicesSchema
  );
  const nextCounter = (await PurchaseInvoicesModel.countDocuments()) + 1;
  const supplierNextCounter = (await supplierModel.countDocuments()) + 1;

  req.body.code = 211000;
  req.body.code += supplierNextCounter;
  req.body.openingBalance = req.body.TotalUnpaid;
  const supplier = await supplierModel.create(req.body);
  const openingBalance = await createPaymentHistory(
    "Opening balance",
    req.body.date || formattedDate,
    req.body.TotalUnpaid,
    supplier.TotalUnpaid,
    "supplier",
    supplier.id,
    "",
    dbName
  );

  supplier.openingBalanceId = openingBalance._id;

  await PurchaseInvoicesModel.create({
    paidAt: formattedDate,
    suppliers: supplier.id,
    supplier: supplier.supplier,
    supplierPhone: supplier.phoneNumber,
    supplierEmail: supplier.email,
    supplierAddress: supplier.address,
    supplierCompany: supplier.companyName,
    finalPrice: req.body.TotalUnpaid,
    finalPriceMainCurrency: req.body.TotalUnpaid,
    totalPriceWitheOutTax: req.body.TotalUnpaid,
    employee: req.user._id,
    counter: nextCounter,
    invoiceCurrencyExchangeRate: 1,
    date: req.body.date,
    totalRemainder: req.body.TotalUnpaid,
    totalRemainderMainCurrency: req.body.TotalUnpaid,
    paid: "unpaid",
  });
  supplier.save();
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

  const supplier = await supplierModel.find();

  res.status(200).json({
    status: "true",
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
  }

  res.status(200).json({ status: "true", data: supplier });
});

//Update one Supplier
//@rol: who has rol can update the Supplier's Data
exports.updataSupplier = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const supplierModel = db.model("Supplier", supplierSchema);

  const supplier = await supplierModel.findById(id);
  if (!supplier) {
    return next(new ApiError(`There is no supplier with this id ${id}`, 404));
  } else {
    await editPaymentHistory(
      dbName,
      supplier.openingBalanceId,
      req.body.openingBalance,
      req.body.date
    );
    req.body.TotalUnpaid =
      parseFloat(supplier.TotalUnpaid) +
      parseFloat(req.body.openingBalance) -
      parseFloat(req.body.openingBalanceBefor);
    req.body.total =
      parseFloat(supplier.total) +
      parseFloat(req.body.openingBalance) -
      parseFloat(req.body.openingBalanceBefor);
    const updatedSupplier = await supplierModel.findByIdAndUpdate(
      id,
      req.body,
      {
        new: true,
      }
    );
    res.status(200).json({
      status: "true",
      message: "Supplier updated",
      data: updatedSupplier,
    });
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
