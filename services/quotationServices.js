const { default: mongoose } = require("mongoose");
const asyncHandler = require("express-async-handler");
const quotationSchema = require("../models/quotationsModel.js");

exports.createCashQuotation = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const quotationModel = db.model("Quotations", quotationSchema);

  const cartItems = req.body.cartItems;

  if (!cartItems || cartItems.length === 0) {
    return next(new ApiError("The cart is empty", 400));
  }

  const {
    customarId,
    customarName,
    exchangeRate,
    priceExchangeRate,
    totalQuotationPrice,
    currency,
    startDate,
    endDate,
    description,
  } = req.body;

  const nextCounter = (await quotationModel.countDocuments()) + 1;

  const quotation = await quotationModel.create({
    cartItems,
    customarId,
    customarName,
    exchangeRate,
    priceExchangeRate,
    totalQuotationPrice,
    currency,
    startDate,
    endDate,
    description,
    counter: "QT " + nextCounter,
  });

  res.status(201).json({ status: "success", data: quotation });
});

exports.getAllQuotations = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const quotationModel = db.model("Quotations", quotationSchema);

  const quotations = await quotationModel.find();
  res.status(200).json({ status: "success", data: quotations });
});

exports.getQuotationById = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const quotationModel = db.model("Quotations", quotationSchema);

  const quotation = await quotationModel.find({ _id: req.params.id });

  if (!quotation) {
    return next(new ApiError("Quotation not found", 404));
  }

  res.status(200).json({ status: "success", data: quotation });
});
