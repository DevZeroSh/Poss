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

  const {id} = req.params;

  let mongooseQuery = PaymentHistoryModel.find();

  // Base query to include customerId
let query = { $or: [{ customerId: id }, { supplierId: id }] };
  mongooseQuery = mongooseQuery.find(query).sort({ createdAt: -1 });

  // Count total items without pagination
  const totalItems = await PaymentHistoryModel.countDocuments(query);

  // Calculate total pages
  const totalPages = Math.ceil(totalItems / pageSize);

  // Apply pagination
  mongooseQuery = mongooseQuery.skip(skip).limit(pageSize);

  const PaymentHistory = await mongooseQuery;
  res.status(200).json({
    status: "true",
    Pages: totalPages,
    results: PaymentHistory.length,
    data: PaymentHistory,
  });
});

module.exports = { createPaymentHistory, getPaymentHistory };
