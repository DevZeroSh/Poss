const { default: mongoose } = require("mongoose");
const asyncHandler = require("express-async-handler");
const quotationSchema = require("../models/quotationsModel.js");
const { Search } = require("../utils/search.js");
const ApiError = require("../utils/apiError");

exports.createCashQuotation = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const quotationModel = db.model("Quotations", quotationSchema);
  const nextCounter = (await quotationModel.countDocuments()) + 1;
  req.body.counter = "SQ" + nextCounter;
  const quotation = await quotationModel.create(req.body);
  if (!quotation) {
    return next(new ApiError("The cart is empty", 400));
  }
  res.status(201).json({ status: "success", data: quotation });
});

exports.getAllQuotations = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const quotationModel = db.model("Quotations", quotationSchema);

  const { totalPages, mongooseQuery } = await Search(quotationModel, req);

  const quotations = await mongooseQuery;

  res.status(200).json({
    status: "success",
    pages: totalPages,
    results: quotations.length,
    data: quotations,
  });
});

exports.getQuotationById = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const quotationModel = db.model("Quotations", quotationSchema);

  const quotation = await quotationModel.findById({ _id: req.params.id });

  if (!quotation) {
    return next(new ApiError("Quotation not found", 404));
  }

  res.status(200).json({ status: "success", data: quotation });
});

exports.updateQuotation = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const quotationModel = db.model("Quotations", quotationSchema);

  const { id } = req.params;

  const quotation = await quotationModel.findByIdAndUpdate(id, req.body, {
    new: true,
  });

  if (!quotation) {
    return next(new ApiError(`not Update this id ${id}`, 500));
  }

  res.status(201).json({ status: "success", data: quotation });
});
