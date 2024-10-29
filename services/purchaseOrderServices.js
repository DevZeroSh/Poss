const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const purchaseOrderSchema = require("../models/purchaseOrderModel");
const ApiError = require("../utils/apiError");
exports.getAllPurchaseOrder = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const purchaseOrderModel = db.model("PurchaseOrder", purchaseOrderSchema);

  // Get pagination parameters from query string
  const pageSize = 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;

  // Fetch the total count of purchase orders
  const totalItems = await purchaseOrderModel.countDocuments();

  // Calculate total pages
  const totalPages = Math.ceil(totalItems / pageSize);

  // Fetch the purchase orders with pagination
  const purchaseOrders = await purchaseOrderModel
    .find()
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize);
  res.status(200).json({
    status: "success",
    page: totalPages,
    data: purchaseOrders,
  });
});

exports.getPurchaseOrderById = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const purchaseOrderModel = db.model("PurchaseOrder", purchaseOrderSchema);
  const { id } = req.params;
  const purchaseOrder = await purchaseOrderModel.findById(id);

  if (!purchaseOrder) {
    return next(new ApiError("Purchase Order not found", 404));
  }

  res.status(200).json({ status: "success", data: purchaseOrder });
});

exports.createCashPurchaseOrder = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const purchaseOrderModel = db.model("PurchaseOrder", purchaseOrderSchema);

  const invoicesItems = req.body.invoicesItems;

  if (!invoicesItems || invoicesItems.length === 0) {
    return next(new ApiError("The cart is empty", 400));
  }

  const {
    supplierId,
    supplierName,
    exchangeRate,
    priceExchangeRate,
    totalPurchaseOrderPrice,
    currency,
    startDate,
    endDate,
    description,
    invoiceCurrencyId,
  } = req.body;

  const nextCounter = (await purchaseOrderModel.countDocuments()) + 1;

  const purchaseOrder = await purchaseOrderModel.create({
    invoicesItems,
    supplierId,
    supplierName,
    exchangeRate,
    priceExchangeRate,
    totalPurchaseOrderPrice,
    currency,
    startDate,
    endDate,
    description,
    counter: "PO " + nextCounter,
    invoiceCurrencyId,
  });

  res.status(201).json({ status: "success", data: purchaseOrder });
});
