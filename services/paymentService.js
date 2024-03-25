const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const paymentSchma = require("../models/paymentModel");
const mongoose = require("mongoose");
const supplierSchema = require("../models/suppliersModel");
const customarSchema = require("../models/customarModel");
const reportsFinancialFundsSchema = require("../models/reportsFinancialFunds");
const financialFundsSchema = require("../models/financialFundsModel");

exports.createPayment = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const paymentModel = db.model("Payment", paymentSchma);
  const supplerModel = db.model("Supplier", supplierSchema);
  const customerModel = db.model("Customar", customarSchema);
  const ReportsFinancialFundsModel = db.model(
    "ReportsFinancialFunds",
    reportsFinancialFundsSchema
  );
  const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
  const financialFundsId = req.body.financialFundsId;
  const financialFunds = await FinancialFundsModel.findById(financialFundsId);
  let paymentText = "";
  if (req.body.taker === "supplier") {
    const suppler = await supplerModel.findById(req.body.supplierId);

    suppler.TotalUnpaid -= req.body.totalMainCurrency;

    await suppler.save();
    paymentText = "payment-sup";
    financialFunds.fundBalance -= req.body.total;
  } else {
    const customer = await customerModel.findById(req.body.customerId);

    customer.TotalUnpaid -= req.body.totalMainCurrency;
    financialFunds.fundBalance += req.body.total;
    paymentText = "payment-cut";
    await customer.save();
  }

  const data = new Date();
  const timeIsoString = data.toISOString();

  await financialFunds.save();
  const payment = await paymentModel.create(req.body);

  await ReportsFinancialFundsModel.create({
    date: timeIsoString,
    amount: req.body.total,
    payment: payment._id,
    type: paymentText,
    financialFundId: financialFundsId,
    financialFundRest: financialFunds.fundBalance,
    exchangeRate: req.body.totalMainCurrency,
  });

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
