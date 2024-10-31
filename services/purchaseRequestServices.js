const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const purchaseRequestSchema = require("../models/purchaseRequestModel");
const ApiError = require("../utils/apiError");
const { Search } = require("../utils/search");

exports.getAllPurchaseRequest = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const purchaseRequestModel = db.model(
    "PurchaseRequest",
    purchaseRequestSchema
  );

  const { totalPages, mongooseQuery } = await Search(purchaseRequestModel, req);

  const purchaseRequests = await mongooseQuery;
  res.status(200).json({
    status: "success",
    page: totalPages,
    data: purchaseRequests,
  });
});

exports.getPurchaseRequestById = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const purchaseRequestModel = db.model(
    "PurchaseRequest",
    purchaseRequestSchema
  );
  const { id } = req.params;
  const purchaseRequest = await purchaseRequestModel.findById(id);

  if (!purchaseRequest) {
    return next(new ApiError(`Purchase Request not found ${id}`, 404));
  }

  res.status(200).json({ status: "success", data: purchaseRequest });
});

exports.createCashPurchaseRequest = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const purchaseRequestModel = db.model(
    "PurchaseRequest",
    purchaseRequestSchema
  );

  const invoicesItems = req.body.invoicesItems;

  if (!invoicesItems || invoicesItems.length === 0) {
    return next(new ApiError("The cart is empty", 400));
  }

  const nextCounter = (await purchaseRequestModel.countDocuments()) + 1;
  req.body.counter = "PO " + nextCounter;
  req.body.admin = req.user.name;

  const purchaseRequest = await purchaseRequestModel.create(req.body);

  res.status(201).json({ status: "success", data: purchaseRequest });
});

exports.updatePurchaseRequest = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const purchaseRequestModel = db.model(
    "PurchaseRequest",
    purchaseRequestSchema
  );
  const { id } = req.params;

  const purchaseRequest = await purchaseRequestModel.findByIdAndUpdate(
    id,
    req.body,
    { new: true }
  );

  if (!purchaseRequest) {
    return next(new ApiError(`not Update this id ${id}`, 500));
  }

  res.status(201).json({ status: "success", data: purchaseRequest });
});
