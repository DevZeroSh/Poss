const asyncHandler = require("express-async-handler");
const ApiError = require("../../utils/apiError");
const mongoose = require("mongoose");
const manitencesCaseSchema = require("../../models/maintenance/manitencesCaseModel");
const manitenaceUserSchema = require("../../models/maintenance/manitenaceUserModel");
const devicesSchema = require("../../models/maintenance/devicesModel");
const devicesHitstorySchema = require("../../models/maintenance/devicesHistoryModel");
const reportsFinancialFundsSchema = require("../../models/reportsFinancialFunds");
const ActiveProductsValueModel = require("../../models/activeProductsValueModel");
const ReportsSalesSchema = require("../../models/reportsSalesModel");
const orderSchema = require("../../models/orderModel");
const productSchema = require("../../models/productModel");
const stockSchema = require("../../models/stockModel");
const financialFundsSchema = require("../../models/financialFundsModel");
const { createInvoiceHistory } = require("../invoiceHistoryService");

// @desc  Get All Manitenace Case
// @route Get /api/manitCase
exports.getManitenaceCase = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  db.model("manitUser", manitenaceUserSchema);
  db.model("Device", devicesSchema);
  const manitencesCaseModel = db.model("manitencesCase", manitencesCaseSchema);

  const pageSize = req.query.limit || 25;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  let query = {};
  if (req.query.keyword) {
    query.$or = [
      { CaseName: { $regex: req.query.keyword, $options: "i" } },
      { CasePhone: { $regex: req.query.keyword, $options: "i" } },
    ];
  }

  const totalItems = await manitencesCaseModel.countDocuments(query);

  const totalPages = Math.ceil(totalItems / pageSize);

  const manitCase = await manitencesCaseModel
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize)
    .populate({ path: "userId", select: "userName userPhone " })
    .populate({ path: "deviceId" });

  res.status(200).json({
    status: "true",
    results: manitCase.length,
    Pages: totalPages,
    data: manitCase,
  });
});

// @desc put update Manitenace Case
// @route put /api/manitCase/:id
exports.updateManitenaceCase = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const manitencesCaseModel = db.model("manitencesCase", manitencesCaseSchema);
  const deviceHistoryModel = db.model("DeviceHistory", devicesHitstorySchema);

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

  const manitCase = await manitencesCaseModel.findByIdAndUpdate(id, req.body, {
    new: true,
  });
  if (!manitCase) {
    return next(new ApiError(`No Diveces with this id ${id}`));
  }
  await deviceHistoryModel.create({
    devicesId: id,
    employeeName: req.user.name,
    date: formattedDate,
    counter: manitCase.counter,
    histoyType: "update",
    deviceStatus: req.body.deviceStatus,
    desc: req.body.desc,
  });
  res.status(200).json({ success: "success", data: manitCase });
});

// @desc Get one Manitenace Case
// @route get /api/manitCase/:id
exports.getOneManitenaceCase = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const manitencesCaseModel = db.model("manitencesCase", manitencesCaseSchema);

  const { id } = req.params;

  const manitCase = await manitencesCaseModel.findById(id);

  if (!manitCase) {
    return next(new ApiError(`No manitences Case By this ID ${id}`));
  }

  res.status(200).json({ message: "success", data: manitCase });
});
// @desc post Manitenace Case
// @route post /api/manitCase
exports.createManitenaceCase = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const manitencesCaseModel = db.model("manitencesCase", manitencesCaseSchema);
  const deviceHistoryModel = db.model("DeviceHistory", devicesHitstorySchema);

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

  const nextCounter = (await manitencesCaseModel.countDocuments()) + 1;

  req.body.counter = "case " + nextCounter;
  const createed = await manitencesCaseModel.create(req.body);

  await deviceHistoryModel.create({
    devicesId: createed.id,
    employeeName: req.user.name,
    date: formattedDate,
    counter: "case " + nextCounter,
    histoyType: "create",
    deviceStatus: req.body.deviceStatus,
    desc: "Created case",
  });

  res.status(200).json({
    success: "success",
    message: "Manitenace Case  inserted",
    data: createed,
  });
});
// @desc delete Manitenace Case
// @route delete /api/manitCase/id
exports.deleteManitenaceCase = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const manitencesCaseModel = db.model("manitencesCase", manitencesCaseSchema);
  const { id } = req.params;

  const manitCase = await manitencesCaseModel.findByIdAndDelete(id);

  if (!manitCase) {
    return next(new ApiError(`not Fund for manitences Case with id ${id}`));
  }
  res
    .status(200)
    .json({ success: "success", message: "Manitenace Case has deleted" });
});

// @desc put for add Pieces And Cost
// @route put /api/manitcase/addproduct/id
exports.addProductInManitencesCase = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const { id } = req.params;
  const { piecesAndCost } = req.body;
  const manitencesCaseModel = db.model("manitencesCase", manitencesCaseSchema);
  const productModel = db.model("Product", productSchema);
  db.model("Stock", stockSchema);

  // Find the product by ID
  const chaker = await manitencesCaseModel.findById(id);
  if (chaker.paymentStatus !== "paid") {
    const product = await productModel.findById({
      _id: piecesAndCost.productId,
    });
    if (!product) {
      return next(new ApiError("Product not found", 400));
    }
    // Prepare data to be added to the piecesAndCost array
    const data = {
      productId: product._id,
      taxPrice: piecesAndCost.taxPrice || product.taxPrice,
      name: product.name,
      qr: product.qr,
      quantity: Number(piecesAndCost.quantity),
      exchangeRate: Number(piecesAndCost.exchangeRate),
      buyingPrice: Number(piecesAndCost.buyingPrice),
      prodcutType: product.type,
      taxRate: piecesAndCost?.taxRate || 0,
      taxs: piecesAndCost?.taxsId || 0,
      price: Number(piecesAndCost.price),
    };
    const updatedDevice = await manitencesCaseModel.findByIdAndUpdate(
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
      product;

      stock.productQuantity -= piecesAndCost.quantity;
      product.quantity -= piecesAndCost.quantity;
      product.activeCount -= piecesAndCost.quantity;
      await product.save();
    }
    res.status(200).json({
      status: "success",
      message: "Product added to manitences Case and stock updated",
      data: updatedDevice,
    });
  } else {
    res.status(500).json({
      message: "that case is paided",
    });
  }
});

// @desc put convet to Sales Invoice
// @route put /api/manitcase/convert/id
exports.convertToSales = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const manitencesCaseModel = db.model("manitencesCase", manitencesCaseSchema);
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
  const deviceHistoryModel = db.model("DeviceHistory", devicesHitstorySchema);

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
  const maintenance = await manitencesCaseModel.findById(id);

  let piecesAndCost = [];
  if (maintenance.paymentStatus !== "paid") {
    // Accumulate changes to the manitencesCase document
    maintenance.piecesAndCost.forEach((item) => {
      piecesAndCost.push({
        taxPrice: item.taxPrice,
        product: item.productId,
        exchangeRate: item.exchangeRate,
        buyingPrice: item.buyingPrice,
        taxRate: item.taxRate,
        taxs: item.taxs,
        price: item.price,
        qr: item.qr,
        name: item.name,

        quantity: item.quantity,
      });
    });
    maintenance.paymentStatus = "paid";
    // Save the manitencesCase document after accumulating changes
    await maintenance.save();

    try {
      const order = await orderModel.create({
        employee: req.user._id,
        cartItems: piecesAndCost,
        returnCartItem: piecesAndCost,
        currencyCode: req.body.currency,
        customarId: maintenance.customerId,
        customarName: maintenance.customerName,
        customarEmail: maintenance.customerEmail,
        customarPhone: maintenance.customerPhone,
        customarAddress: maintenance.customarAddress,
        totalOrderPrice: req.body.total,
        totalPriceExchangeRate: req.body.priceExchangeRate || req.body.total,
        date: req.body.date || formattedDate,
        onefinancialFunds: req.body.financialFundsId,
        counter: "mt-" + nextCounter,
        exchangeRate: req.body.exchangeRate || 1,
        paid: "paid",
      });
      await ReportsSalesModel.create({
        customer: maintenance.customerName,
        orderId: order._id,
        date: formattedDate,
        fund: req.body.financialFundsId,
        amount: req.body.total,
        cartItems: piecesAndCost,
        type: "mt",
        counter: nextCounterReports,
        paymentType: "Single Fund",
        employee: req.user._id,
      });

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
      await deviceHistoryModel.create({
        devicesId: id,
        employeeName: req.user.name,
        date: formattedDate,
        counter: maintenance.counter,
        histoyType: "Delivered",
        deviceStatus: req.body.deviceStatus,
        desc: req.body.desc,
      });
      createInvoiceHistory(dbName, order._id, "create", req.user._id);
      res.status(200).json({ message: order });
    } catch (e) {
      console.log(e);
      res.status(500).json({ message: "An error occurred" });
    }
  } else {
    res.status(500).json({ message: "This manitences Case paided" });
  }
});
