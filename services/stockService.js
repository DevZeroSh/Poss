const asyncHandler = require("express-async-handler");

const mongoose = require("mongoose");
const StockSchema = require("../models/stockModel");
const { default: slugify } = require("slugify");
const ApiError = require("../utils/apiError");
const productSchema = require("../models/productModel");
const stockTransferSchema = require("../models/stockTransfer");

exports.createStock = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const StockModel = db.model("Stock", StockSchema);

  req.body.slug = slugify(req.body.name);
  const Stock = await StockModel.create(req.body);
  res.status(200).json({
    status: "success",
    message: "Stock created successfully",
    data: Stock,
  });
});

exports.getStocks = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const StockModel = db.model("Stock", StockSchema);
  const Stocks = await StockModel.find();
  res
    .status(200)
    .json({ statusbar: "success", results: Stocks.length, data: Stocks });
});

exports.getOneStock = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const StockModel = db.model("Stock", StockSchema);
  db.model("Product", productSchema);
  const Stock = await StockModel.findById(req.params.id);
  if (!Stock) {
    return next(new ApiError(`No Stock found for id ${req.params.id}`, 404));
  }
  res.status(200).json({
    status: "success",
    data: Stock,
  });
});

exports.updateStock = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const StockModel = db.model("Stock", StockSchema);

  req.body.slug = slugify(req.body.name);
  const Stock = await StockModel.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  if (!Stock) {
    return next(new ApiError(`No Stock found for id ${req.params.id}`, 404));
  }
  res.status(200).json({
    status: "success",
    data: Stock,
  });
});

exports.deleteStock = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const StockModel = db.model("Stock", StockSchema);
  const Stock = await StockModel.findByIdAndDelete(req.params.id);
  if (!Stock) {
    return next(new ApiError(`No Stock found for id ${req.params.id}`, 404));
  }
  res.status(200).json({
    status: "success",
    message: "Stock Delete successfully",
  });
});

// @desc put list product
// @route put /api/stock/transfer
// @access Private
exports.transformQuantity = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const StockModel = db.model("Stock", StockSchema);
  const stockTransferModel = db.model("StockTransfer", stockTransferSchema);
  const productModel = db.model("Product", productSchema);

  const { fromStockId, toStockId, products } = req.body;
  const stocks = await StockModel.find({ _id: { $in: [fromStockId, toStockId] } });
  const fromStock = stocks.find(stock => stock._id.toString() === fromStockId);
  const toStock = stocks.find(stock => stock._id.toString() === toStockId);

  if (!fromStock || !toStock) {
    return res.status(404).json({ message: 'Stock not found' });
  }

  // Validation: check if any product quantity is less than 0
  for (const product of products) {
    const quantity = parseInt(product.productQuantity, 10);
    if (quantity < 0) {
      return res.status(400).json({ message: 'Product quantity cannot be less than 0' });
    }
  }

  const productMap = new Map();
  for (const product of products) {
    console.log(products);
    const { productId, productName, productQuantity } = product;
    const quantity = parseInt(productQuantity, 10);

    if (!productMap.has(productId)) {
      productMap.set(productId, { fromQuantity: 0, toQuantity: 0, productName });
    }

    productMap.get(productId).fromQuantity -= quantity;
    productMap.get(productId).toQuantity += quantity;
  }

  // Update fromStock products
  for (const product of fromStock.products) {
    const { productId } = product;
    if (productMap.has(productId.toString())) {
      product.productQuantity += productMap.get(productId.toString()).fromQuantity;
      if (product.productQuantity < 0) {
        return res.status(400).json({ message: 'Product quantity cannot be less than 0' });
      }
    }
  }

  // Update toStock products
  for (const product of toStock.products) {
    const { productId } = product;
    if (productMap.has(productId.toString())) {
      product.productQuantity += productMap.get(productId.toString()).toQuantity;
    }
  }

  // Add new products to toStock
  for (const [productId, quantities] of productMap.entries()) {
    if (!toStock.products.some(p => p.productId.toString() === productId)) {
      toStock.products.push({
        productId,
        productQuantity: quantities.toQuantity,
        productName: quantities.productName
      });
    }
  }

  await StockModel.bulkWrite([
    {
      updateOne: {
        filter: { _id: fromStockId },
        update: { $set: { products: fromStock.products } }
      }
    },
    {
      updateOne: {
        filter: { _id: toStockId },
        update: { $set: { products: toStock.products } }
      }
    }
  ]);

  // Update the stocks array in the product model
  const bulkOps = [];
  for (const product of products) {
    const { productId, productQuantity } = product;
    bulkOps.push({
      updateOne: {
        filter: { _id: productId, "stocks.stockId": fromStockId },
        update: { $inc: { "stocks.$.productQuantity": -productQuantity } }
      }
    });
    bulkOps.push({
      updateOne: {
        filter: { _id: productId, "stocks.stockId": toStockId },
        update: {
          $inc: { "stocks.$.productQuantity": productQuantity },
          $setOnInsert: { "stocks.$.stockId": toStockId, "stocks.$.stockName": toStock.stockName }
        },
        upsert: true
      }
    });
  }

  await productModel.bulkWrite(bulkOps);

  const transferStock = await stockTransferModel.create(req.body);
  res.status(200).json({ status: "success", message: 'Transfer successful', data: transferStock });
});



// @desc put list product
// @route put /api/stock/transfer
// @access Private

exports.getTransferStock = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const stockTransferModel = db.model("StockTransfer", stockTransferSchema);
  const pageSize = req.query.limit || 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;

  let query = {};

  if (req.query.keyword) {
    query.$or = [
      { name: { $regex: req.query.keyword, $options: "i" } },
      { date: { $regex: req.query.keyword, $options: "i" } },
    ];
  }
  const totalItems = await stockTransferModel.countDocuments(query);

  const totalPages = Math.ceil(totalItems / pageSize);

  const transfer = await stockTransferModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(pageSize);

  res
    .status(200)
    .json({ statusbar: "success", results: transfer.length, Pages: totalPages, data: transfer });
});

exports.getTransferForStock = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const stockTransferModel = db.model("StockTransfer", stockTransferSchema);
  const pageSize = req.query.limit || 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  const { id } = req.params;

  let query = {
    $or: [
      { toStockId: id },
      { fromStockId: id }
    ]
  };

  if (req.query.keyword) {
    query.$or.push(
      { name: { $regex: req.query.keyword, $options: "i" } },
      { date: { $regex: req.query.keyword, $options: "i" } }
    );
  }

  const totalItems = await stockTransferModel.countDocuments(query);
  const totalPages = Math.ceil(totalItems / pageSize);
  const transfer = await stockTransferModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(pageSize);

  res.status(200).json({ statusbar: "success", results: transfer.length, Pages: totalPages, data: transfer });
});

exports.getAllStatementStock = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const stockTransferModel = db.model("StockTransfer", stockTransferSchema);
  const pageSize = req.query.limit || 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;


  let query = {};

  if (req.query.keyword) {
    query.$or.push(
      { name: { $regex: req.query.keyword, $options: "i" } },
      { date: { $regex: req.query.keyword, $options: "i" } }
    );
  }

  const totalItems = await stockTransferModel.countDocuments(query);
  const totalPages = Math.ceil(totalItems / pageSize);
  const transfer = await stockTransferModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(pageSize);

  res.status(200).json({ statusbar: "success", results: transfer.length, Pages: totalPages, data: transfer });
});

exports.getOneTransferStock = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const stockTransferModel = db.model("StockTransfer", stockTransferSchema);
  const { id } = req.params;
  const transfer = await stockTransferModel.findById(id);

  res
    .status(200)
    .json({ statusbar: "success", data: transfer });
});




