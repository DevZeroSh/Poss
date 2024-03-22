const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const paymentSchma = require("../models/paymentModel");
const mongoose = require("mongoose");

exports.createPayment = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const paymentModel = db.model("Payment", paymentSchma);

  const payment = await paymentModel.create(req.body);

  if (!payment) {
    return next(new ApiError("Payment not created", 404));
  }
  res.status(200).json({ status: "success", data: payment });
});

exports.getPayment = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const paymentModel = db.model("Payment", paymentSchma);

  const payment = await paymentModel.find();
  if (!payment) {
    return next(new ApiError("Not found any Payment here", 404));
  }
  res.status(200).json({ status: "success", data: payment });
});

exports.getOnePayment = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const paymentModel = db.model("Payment", paymentSchma);
  const { id } = req.params;
  const payment = await paymentModel.findById(id);
  if (!payment) {
    return next(new ApiError("Payment not found", 404));
  }

  res.status(200).json({ status: "success", data: payment });
});
