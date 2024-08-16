const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const purchaseOrderSchema = require("../models/purchaseOrderModel");

exports.getAllPurchaseOrder = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const purchaseOrderModel = db.model("PurchaseOrder", purchaseOrderSchema);

  const purchaseOrder = await purchaseOrderModel.find();
  res.status(200).json({ status: "success", data: purchaseOrder });
});

exports.getPurchaseOrderById = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const purchaseOrderModel = db.model("PurchaseOrder", purchaseOrderSchema);

  const purchaseOrder = await purchaseOrderModel.find({ _id: req.params.id });

  if (!purchaseOrder) {
    return next(new ApiError("Purchase Order not found", 404));
  }

  res.status(200).json({ status: "success", data: purchaseOrder });
});


exports.createCashPurchaseOrder = asyncHandler(async (req, res, next) => {
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
  
    const purchaseOrderModel = db.model("PurchaseOrder", purchaseOrderSchema);
  
    const cartItems = req.body.cartItems;
  
    if (!cartItems || cartItems.length === 0) {
      return next(new ApiError("The cart is empty", 400));
    }
  
    const {
      customarId,
      customarName,
      exchangeRate,
      priceExchangeRate,
      totalPurchaseOrderPrice,
      currency,
      startDate,
      endDate,
      description,
    } = req.body;
  
    const nextCounter = (await purchaseOrderModel.countDocuments()) + 1;
  
    const purchaseOrder = await purchaseOrderModel.create({
      cartItems,
      customarId,
      customarName,
      exchangeRate,
      priceExchangeRate,
      totalPurchaseOrderPrice,
      currency,
      startDate,
      endDate,
      description,
      counter: "PO " + nextCounter,
    });
  
    res.status(201).json({ status: "success", data: purchaseOrder });
  });
