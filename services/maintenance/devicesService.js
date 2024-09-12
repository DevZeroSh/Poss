const asyncHandler = require("express-async-handler");
const ApiError = require("../../utils/apiError");
const mongoose = require("mongoose");
const devicesSchema = require("../../models/maintenance/devicesModel");
const devicesHitstorySchema = require("../../models/maintenance/devicesHistory");
const productSchema = require("../../models/productModel");
const stockSchema = require("../../models/stockModel");
const orderSchema = require("../../models/orderModel");
const ReportsSalesSchema = require("../../models/reportsSalesModel");
const ActiveProductsValueModel = require("../../models/activeProductsValueModel");
const financialFundsSchema = require("../../models/financialFundsModel");
const reportsFinancialFundsSchema = require("../../models/reportsFinancialFunds");
const { createInvoiceHistory } = require("../invoiceHistoryService");

// @desc Get All Devices
// @route get /api/device
// @accsess public
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

// @desc put update Devices
// @route put /api/device/:id
// @accsess public
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
    devicesStatus: req.body.deviceStatus,
  });
  res.status(200).json({ success: "success", data: devicesUpdate, history });
});
// @desc Get one Devices
// @route get /api/device/id
// @accsess public
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
// @desc post Devices
// @route post /api/device
// @accsess public
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
    devicesStatus: req.body.deviceStatus,
  });
  res.status(200).json({
    success: "success",
    message: "devices inserted",
    data: createed,
    history,
  });
});
// @desc delete delete Devices
// @route delete /api/device/id
// @accsess privet
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
// @desc put All Devices
// @route put /api/device/add/id
// @accsess public
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
  console.log(piecesAndCost);
  // Prepare data to be added to the piecesAndCost array
  const data = {
    cost: piecesAndCost.cost || product.taxPrice,
    productId: product._id,
    name: product.name,
    qr: product.qr,
    quantity: Number(piecesAndCost.quantity),
    exchangeRate: Number(piecesAndCost.exchangeRate),
    buyingPrice: Number(piecesAndCost.buyingPrice),
    prodcutType: product.type,
    taxRate: piecesAndCost?.taxRate?.tax || 0,
    taxs: piecesAndCost?.taxRate?._id || 0,
    price: Number(piecesAndCost.price),
  };
  const updatedDevice = await deviceModel.findByIdAndUpdate(
    id,
    { $push: { piecesAndCost: data } },
    { new: true }
  );
  if (product.type !== "Service") {
    const stock = product.stocks.find(
      (stock) => stock.stockId.toString() === piecesAndCost.stockId.toString()
    );
    if (!stock) {
      return next(new ApiError("Stock not found", 400));
    }

    if (stock.productQuantity < piecesAndCost.quantity) {
      return next(new ApiError("Insufficient stock quantity", 400));
    }
    stock.productQuantity -= piecesAndCost.quantity;
    await product.save();
  }
  res.status(200).json({
    status: "success",
    message: "Product added to device and stock updated",
    data: updatedDevice,
  });
});

exports.convertToSales = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const deviceModel = db.model("Device", devicesSchema);
  const productModel = db.model("Product", productSchema);
  const orderModel = db.model("Orders", orderSchema);
  const ReportsSalesModel = db.model("ReportsSales", ReportsSalesSchema);
  const ActiveProductsValue = db.model(
    "ActiveProductsValue",
    ActiveProductsValueModel
  );
  const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
  const ReportsFinancialFundsModel = db.model(
    "ReportsFinancialFunds",
    reportsFinancialFundsSchema
  );
  const nextCounter = (await orderModel.countDocuments()) + 1;
  const nextCounterReports = (await ReportsSalesModel.countDocuments()) + 1;

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
  const { id } = req.params;
  const device = await deviceModel.findById(id);

  let test = [];

  // Accumulate changes to the device document
  device.piecesAndCost.forEach((item) => {
    if (item.paid !== "paid") {
      test.push({
        taxPrice: item.cost,
        product: item.productId,
        exchangeRate: item.exchangeRate,
        buyingPrice: item.buyingPrice,
        taxRate: item.taxRate,
        taxs: item.taxs,
        price: item.price,
        qr: item.qr,
        name: item.name,
        paid: "paid",
        quantity: item.quantity,
      });
      item.paid = "paid";
    }
  });

  // Save the device document after accumulating changes
  await device.save();

  if (test.length > 0) {
    try {
      const order = await orderModel.create({
        employee: req.user._id,
        cartItems: test,
        returnCartItem: test,
        currencyCode: req.body.currency,
        customarId: device.customerId,
        customarName: device.customerName,
        customarEmail: device.customerEmail,
        customarPhone: device.customerPhone,
        customarAddress: device.customarAddress,
        totalOrderPrice: req.body.total,
        priceExchangeRate: req.body.total,
        paidAt: formattedDate,
        onefinancialFunds: req.body.financialFundsId,
        counter: "mt-" + nextCounter,
        exchangeRate: req.body.exchangeRate,
        paid: req.body.paid,
      });
      await ReportsSalesModel.create({
        customer: device.customerName,
        orderId: order._id,
        date: formattedDate,
        fund: req.body.financialFundsId,
        amount: req.body.total,
        cartItems: test,
        type: "mt",
        counter: nextCounterReports,
        paymentType: "Single Fund",
        employee: req.user._id,
      });
      if (req.body.paid === "paid") {
        const financialFund = await FinancialFundsModel.findById(
          req.body.financialFundsId
        );

        financialFund.fundBalance += req.body.total;
        await financialFund.save();

        await ReportsFinancialFundsModel.create({
          date: formattedDate,
          amount: req.body.total,
          totalPriceAfterDiscount: req.body.total,
          order: order._id,
          type: "sales",
          financialFundId: financialFund._id,
          financialFundRest: financialFund.fundBalance,
          exchangeRate: req.body.exchangeRate,
        });
      }
      createInvoiceHistory(dbName, order._id, "create", req.user._id);
      res.status(200).json({ message: order });
    } catch (e) {
      console.log(e);
      res.status(500).json({ message: "An error occurred" });
    }
  } else {
    res.status(404).json({ message: "You don't have any product to add" });
  }
});
