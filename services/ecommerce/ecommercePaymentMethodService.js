const asyncHandler = require("express-async-handler");
const ecommercePaymentMethodSchema = require("../../models/ecommerce/ecommercePaymentMethodModel");
const ApiError = require("../../utils/apiError");
const mongoose = require("mongoose");

// Get all payment methods
exports.getPaymentMethods = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const paymentMethodsModel = db.model(
    "ecommercePaymentMethods",
    ecommercePaymentMethodSchema
  );
  const paymentMethods = await paymentMethodsModel.find();

  res.status(200).json({
    status: "success",
    results: paymentMethods.length,
    data: paymentMethods,
  });
});

// Get specific payment method by ID
exports.getPaymentMethod = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const paymentMethodModel = db.model(
    "ecommercePaymentMethods",
    ecommercePaymentMethodSchema
  );

  const { id } = req.params;
  const paymentMethod = await paymentMethodModel.findById(id);

  if (!paymentMethod) {
    return next(new ApiError(`No payment method found for ID ${id}`, 404));
  }
  res.status(200).json({ status: "success", data: paymentMethod });
});

// Update specific payment method
exports.updatePaymentMethod = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const paymentMethodModel = db.model(
    "ecommercePaymentMethods",
    ecommercePaymentMethodSchema
  );

  const id = req.params.id;

  let paymentMethod = await paymentMethodModel.findById(id);
  if (!paymentMethod) {
    return next(new ApiError(`No payment method found for ID ${id}`, 404));
  }

  if (req.body.status) paymentMethod.status = req.body.status;
  if (req.body.extraCharge) paymentMethod.extraCharge = req.body.extraCharge;
  if (req.body.minAmount) paymentMethod.minAmount = req.body.minAmount;
  if (req.body.maxAmount) paymentMethod.maxAmount = req.body.maxAmount;
  if (req.body.desc) paymentMethod.description = req.body.desc;
  if (req.body.ibanNumber) paymentMethod.ibanNumber = req.body.ibanNumber;
  if (req.body.ibanName) paymentMethod.ibanName = req.body.ibanName;
  if (req.body.bankName) paymentMethod.bankName = req.body.bankName;
  if (req.body.companyRatio) paymentMethod.companyRatio = req.body.companyRatio;

  paymentMethod = await paymentMethod.save();

  res.status(200).json({
    status: "success",
    message: "Payment Method updated",
    data: paymentMethod,
  });
});
