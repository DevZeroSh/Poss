const asyncHandler = require("express-async-handler");
const ApiError = require("../../utils/apiError");
const mongoose = require("mongoose");
const devicesSchema = require("../../models/maintenance/devicesModel");
const devicesHitstorySchema = require("../../models/maintenance/devicesHistory");
const productSchema = require("../../models/productModel");
const stockSchema = require("../../models/stockModel");

exports.getDevices = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const deviceModel = db.model("Device", devicesSchema);
  const pageSize = req.query.limit || 25;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  let query = {};
  if (req.query.keyword) {
    query.$or = [
      { admin: { $regex: req.query.keyword, $options: "i" } },
      { customerName: { $regex: req.query.keyword, $options: "i" } },
      { customerPhone: { $regex: req.query.keyword, $options: "i" } },
    ];
  }

  const totalItems = await deviceModel.countDocuments(query);

  const totalPages = Math.ceil(totalItems / pageSize);

  const device = await deviceModel
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize);

  res.status(200).json({
    status: "true",
    results: device.length,
    Pages: totalPages,
    data: device,
  });
});

exports.updateDevices = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const deviceModel = db.model("Device", devicesSchema);
  const deviceHistoryModel = db.model("DeviceHistory", devicesHitstorySchema);

  const { id } = req.params;
  function padZero(value) {
    return value < 10 ? `0${value}` : value;
  }

  const ts = Date.now();
  const date_ob = new Date(ts);
  const formattedDate = `${date_ob.getFullYear()}-${padZero(
    date_ob.getMonth() + 1
  )}-${padZero(date_ob.getDate())} ${padZero(date_ob.getHours())}:${padZero(
    date_ob.getMinutes()
  )}:${padZero(date_ob.getSeconds())}`;
  const devicesUpdate = await deviceModel.findByIdAndUpdate(id, req.body, {
    new: true,
  });

  if (!devicesUpdate) {
    return next(new ApiError(`No Diveces with this id ${id}`));
  }
  const history = await deviceHistoryModel.create({
    devicesId: id,
    name: req.user.name,
    date: formattedDate,
    conuter: devicesUpdate.conuter,
    status: "update",
  });
  res.status(200).json({ success: "success", data: devicesUpdate, history });
});

exports.getOneDevice = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const deviceModel = db.model("Device", devicesSchema);
  const deviceHistoryModel = db.model("DeviceHistory", devicesHitstorySchema);

  const { id } = req.params;

  const findDevice = await deviceModel.findById(id);
  const history = await deviceHistoryModel
    .find({ devicesId: id })
    .sort({ date: -1 });
  if (!findDevice) {
    return next(new ApiError(`No Devices By this ID ${id}`));
  }

  res.status(200).json({ message: "success", data: findDevice, history });
});

exports.createDevice = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const deviceHistoryModel = db.model("DeviceHistory", devicesHitstorySchema);
  const deviceModel = db.model("Device", devicesSchema);
  function padZero(value) {
    return value < 10 ? `0${value}` : value;
  }

  const nextCounter = (await deviceModel.countDocuments()) + 1;
  const ts = Date.now();
  const date_ob = new Date(ts);
  const formattedDate = `${date_ob.getFullYear()}-${padZero(
    date_ob.getMonth() + 1
  )}-${padZero(date_ob.getDate())} ${padZero(date_ob.getHours())}:${padZero(
    date_ob.getMinutes()
  )}:${padZero(date_ob.getSeconds())}`;

  req.body.admin = req.body.admin || req.user.name;
  req.body.conuter = nextCounter;
  const createed = await deviceModel.create(req.body);
  const history = await deviceHistoryModel.create({
    devicesId: createed.id,
    name: req.user.name,
    date: formattedDate,
    conuter: nextCounter,
    status: "create",
  });
  res.status(200).json({
    success: "success",
    message: "devices inserted",
    data: createed,
    history,
  });
});

exports.deleteDevice = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const deviceModel = db.model("Device", devicesSchema);
  const { id } = req.params;

  const deleteDevice = await deviceModel.findByIdAndDelete(id);

  if (!deleteDevice) {
    return next(new ApiError(`not Fund for device with id ${id}`));
  }
  res.status(200).json({ success: "success", message: "devices has deleted" });
});

exports.addProductInDevice = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const { id } = req.params;
  const { piecesAndCost } = req.body;
  const deviceModel = db.model("Device", devicesSchema);
  const productModel = db.model("Product", productSchema);
  db.model("Stock", stockSchema);

  // Find the product by ID
  const product = await productModel.findById({ _id: piecesAndCost.productId });
  if (!product) {
    return next(new ApiError("Product not found", 400));
  }
  if (product.type !== "Service") {
    // Find the specific stock within the product's stocks array
    const stock = product.stocks.find(
      (stock) => stock.stockId.toString() === piecesAndCost.stockId.toString()
    );
    if (!stock) {
      return next(new ApiError("Stock not found", 400));
    }

    // Ensure the quantity is available in the stock
    if (stock.productQuantity < piecesAndCost.quantity) {
      return next(new ApiError("Insufficient stock quantity", 400));
    }
  }
  // Prepare data to be added to the piecesAndCost array
  const data = {
    cost: piecesAndCost.cost || product.taxPrice,
    productId: product._id,
    name: product.name,
    qr: product.qr,
    quantity: piecesAndCost.quantity,
  };

  const updatedDevice = await deviceModel.findByIdAndUpdate(
    id,
    { $push: { piecesAndCost: data } },
    { new: true }
  );
  if (product.type !== "Service") {
    // Update the product's stock quantity by subtracting the quantity
    stock.productQuantity -= piecesAndCost.quantity;

    await product.save();
  }
  res.status(200).json({
    status: "success",
    message: "Product added to device and stock updated",
    data: updatedDevice,
  });
});
