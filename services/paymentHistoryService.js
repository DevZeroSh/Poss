const mongoose = require("mongoose");
const PaymentHistorySchema = require("../models/paymentHistoryModel");
const ApiError = require("../utils/apiError");
const asyncHandler = require("express-async-handler");

const createPaymentHistory = async (
  type,
  date,
  rest,
  amount,
  taker,
  id,
  invoiceNumber,
  dbName
) => {
  const db = mongoose.connection.useDb(dbName);
  const PaymentHistoryModel = db.model("PaymentHistory", PaymentHistorySchema);
  try {
    // Create a new payment history object
    const newPaymentHistoryData = {
      type,
      date,
      rest,
      amount,
      invoiceNumber
    };
    // Dynamically assign supplierId or customerId based on the taker value
    if (taker === "supplier") {
      newPaymentHistoryData.supplierId = id;
    } else {
      newPaymentHistoryData.customerId = id;
    }

    const newPaymentHistory = new PaymentHistoryModel(newPaymentHistoryData);
    const savedPaymentHistory = await newPaymentHistory.save();
    return savedPaymentHistory;
  } catch (error) {
    throw new ApiError(`Error creating payment history: ${error.message}`, 500);
  }
};

const getPaymentHistory = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;

  const db = mongoose.connection.useDb(dbName);
  const PaymentHistoryModel = db.model("PaymentHistory", PaymentHistorySchema);
  const pageSize = 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;

  const { id } = req.params;

  // Base query to include customerId or supplierId
  const query = { $or: [{ customerId: id }, { supplierId: id }] };

  // Count total items without pagination
  const totalItems = await PaymentHistoryModel.countDocuments(query);

  // Calculate total pages
  const totalPages = Math.ceil(totalItems / pageSize);

  // Fetch all transactions before the current page to calculate the initial balance for the current page
  const transactionsBeforeCurrentPage = await PaymentHistoryModel.find(query)
    .sort({ date: -1 })
    .skip(0)
    .limit(skip); // fetches transactions before the current page

  // Calculate the balance up to the start of the current page
  let startingBalance = 0;
  transactionsBeforeCurrentPage.forEach((item) => {
    if (item.type === "payment") {
      startingBalance -= item.rest;
    } else {
      startingBalance += item.rest;
    }
  });

  // Fetch the transactions for the current page with pagination
  const PaymentHistory = await PaymentHistoryModel.find(query)
    .sort({ date: -1 })
    .skip(skip)
    .limit(pageSize);

  res.status(200).json({
    status: "true",
    Pages: totalPages,
    results: PaymentHistory.length,
    startingBalance, 
    data: PaymentHistory,
  });
});


module.exports = { createPaymentHistory, getPaymentHistory };
