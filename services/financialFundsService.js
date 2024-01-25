const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const FinancialFunds = require("../models/financialFundsModel");
const financialFundsSchema = require("../models/financialFundsModel");
const paymentTypeSchema = require("../models/paymentTypesModel");
const currencySchema = require("../models/currencyModel");
const paymentTypesSchema = require("../models/paymentTypesModel");
const reportsFinancialFundsSchema = require("../models/reportsFinancialFunds");

//@desc Get list of Financial Funds
//@route GET  /api/financialfunds
//@accsess Private
exports.getFinancialFunds = asyncHandler(async (req, res) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);

  db.model("PaymentType", paymentTypeSchema);
  db.model("Currency", currencySchema);

  const financialFunds = await FinancialFundsModel.find({
    archives: { $ne: false },
  })
    .populate({
      path: "fundCurrency",
      select: "_id currencyCode currencyName exchangeRate",
    })
    .populate({ path: "fundPaymentType" });
  res.status(200).json({ status: "true", data: financialFunds });
});

// @desc Create a Financial Funds
// @route Post /api/financialfunds
// @access Private
exports.createFinancialFunds = asyncHandler(async (req, res) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);

  const financialFunds = await FinancialFundsModel.create(req.body);
  res.status(201).json({
    status: "true",
    message: "Financial Fund Inserted",
    data: financialFunds,
  });
});

// @desc Get specific a Financial Funds by id
// @route Get /api/financialfunds/:id
// @access Private
exports.getOneFinancialFund = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
  db.model("PaymentType", paymentTypeSchema);
  db.model("Currency", currencySchema);

  const financialFunds = await FinancialFundsModel.findById(id)
    .populate({
      path: "fundCurrency",
      select: "_id currencyCode currencyName exchangeRate",
    })
    .populate({ path: "fundPaymentType" });
  res.status(200).json({ status: "true", data: financialFunds });
});

//@desc update specific Financial Fund by id
//@route Put /api/financialfunds/:id
//@access Private
exports.financialFund = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
  db.model("PaymentType", paymentTypesSchema);
  db.model("Currency", currencySchema);
  const financialFund = await FinancialFundsModel.findByIdAndUpdate(
    { _id: id },
    req.body,
    {
      new: true,
    }
  )
    .populate({
      path: "fundCurrency",
      select: "_id currencyCode currencyName exchangeRate",
    })
    .populate({ path: "fundPaymentType" });

  if (!financialFund) {
    return next(new ApiError(`No financial fund for this id ${id}`, 404));
  }

  res.status(200).json({
    status: "true",
    message: "Financial fund updated",
    data: financialFund,
  });
});

//@desc Delete specific Financial fund
//@rout Delete /api/financialfunds/:id
//@access priveta
exports.deletefinancialFund = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);

  //check if id is used in anther place or not
  //if (checkIdIfUsed(id, "FinancialFunds")) {}

  const financialFund = await FinancialFundsModel.findByIdAndDelete(id);
  if (!financialFund) {
    return next(new ApiError(`No financial fund for this id ${id}`, 404));
  }

  res.status(200).json({ status: "true", message: "Financial fund Deleted" });
});

// @desc Transfer from fund to fund
// @route Post /api/transferfinancialfunds
// @access Private

exports.transfer = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
  const ReportsFinancialFundsModel = db.model(
    "ReportsFinancialFunds",
    reportsFinancialFundsSchema
  );
  db.model("PaymentType", paymentTypesSchema);
  db.model("Currency", currencySchema);

  function padZero(value) {
    return value < 10 ? `0${value}` : value;
  }
  const data = new Date();
  const Time = data.toISOString();

  const { id } = req.params;
  const { fund, quantity, amount } = req.body;

  // 1) Take the first Fund
  const financialFund = await FinancialFundsModel.findByIdAndUpdate({
    _id: id,
  });
  console.log("Befor: " + financialFund.fundBalance);

  // 2) Save the value with which the transfer will be made

  let beforTransfer = financialFund.fundBalance - quantity;
  let after = financialFund.fundBalance - beforTransfer;
  financialFund.fundBalance -= after;

  // 3) Find the fund to which the money will go
  console.log("after: " + financialFund.fundBalance);
  const funds = await FinancialFundsModel.findByIdAndUpdate(fund);
  console.log("Befor Trans: " + funds.fundBalance);
  funds.fundBalance += parseFloat(amount);
  console.log("after Trans: " + funds.fundBalance);

  // 4) Save
  await financialFund.save();
  await ReportsFinancialFundsModel.create({
    date: Time,
    amount: after,
    type: "transfer_to",
    financialFundId: id,
    financialFundRest: financialFund.fundBalance,
  });
  await funds.save();
  await ReportsFinancialFundsModel.create({
    date: Time,
    amount: after,
    exchangeAmount: amount,

    type: "transfer",
    financialFundId: fund,
    financialFundRest: funds.fundBalance,
  });
  res.status(200).json({
    status: "true",
    message: "Financial fund updated",
    data: financialFund,
    data2: funds,
  });
});
