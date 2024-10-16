const asyncHandler = require("express-async-handler");
const ApiError = require("../../utils/apiError");
const mongoose = require("mongoose");
const manitencesCaseSchema = require("../../models/maintenance/manitencesCaseModel");
const manitenaceUserSchema = require("../../models/maintenance/manitenaceUserModel");
const devicesSchema = require("../../models/maintenance/devicesModel");
const caseHitstorySchema = require("../../models/maintenance/caseHistoryModel");
const reportsFinancialFundsSchema = require("../../models/reportsFinancialFunds");
const ActiveProductsValueModel = require("../../models/activeProductsValueModel");
const ReportsSalesSchema = require("../../models/reportsSalesModel");
const orderSchema = require("../../models/orderModel");
const productSchema = require("../../models/productModel");
const stockSchema = require("../../models/stockModel");
const financialFundsSchema = require("../../models/financialFundsModel");
const { createInvoiceHistory } = require("../invoiceHistoryService");
const { createProductMovement } = require("../../utils/productMovement");
const {
  createActiveProductsValue,
} = require("../../utils/activeProductsValue");

// @desc  Get All Manitenace Case
// @route Get /api/manitCase
exports.getManitenaceCase = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const manitUserModel = db.model("manitUser", manitenaceUserSchema);
  const deviceModel = db.model("Device", devicesSchema);
  const manitencesCaseModel = db.model("manitencesCase", manitencesCaseSchema);

  const pageSize = parseInt(req.query.limit) || 20;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;

  let query = {};
  let deviceIds = [];
  let usersId = [];

  if (req.query.keyword) {
    // Search in the Device collection
    const devices = await deviceModel.find(
      {
        $or: [{ counter: { $regex: req.query.keyword, $options: "i" } }],
      },
      "_id"
    );
    const users = await manitUserModel.find(
      {
        $or: [
          { userName: { $regex: req.query.keyword, $options: "i" } },
          { userPhone: { $regex: req.query.keyword, $options: "i" } },
        ],
      },
      "_id"
    );
    // Get device IDs from the results
    deviceIds = devices.map((device) => device._id);
    usersId = users.map((user) => user._id);

    // Add keyword searches for manitencesCase fields and `deviceId`
    query.$or = [
      { counter: { $regex: req.query.keyword, $options: "i" } },
      { caseCounter: { $regex: req.query.keyword, $options: "i" } },
      { admin: { $regex: req.query.keyword, $options: "i" } },
      { problemType: { $regex: req.query.keyword, $options: "i" } },
      { manitencesStatus: { $regex: req.query.keyword, $options: "i" } },

      { deviceId: { $in: deviceIds } },
      { userId: { $in: usersId } },
    ];
  }
  if (req.query.admin) {
    query.admin = req.query.admin;
  }
  if (req.query.manitencesStatus) {
    query.manitencesStatus = req.query.manitencesStatus;
  }
  const totalItems = await manitencesCaseModel.countDocuments(query);
  const totalPages = Math.ceil(totalItems / pageSize);

  const manitCase = await manitencesCaseModel
    .find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize)
    .populate({
      path: "deviceId",
    })
    .populate({
      path: "userId",
      select: "userName userPhone",
    });

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
  const caseHistoryModel = db.model("maintenacesHistory", caseHitstorySchema);

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
  await caseHistoryModel.create({
    devicesId: id,
    employeeName: req.user.name,
    date: formattedDate,
    counter: manitCase.counter,
    histoyType: "update",
    manitencesStatus: req.body.manitencesStatus,
  });
  res.status(200).json({ status: "success", data: manitCase });
});

// @desc Get one Manitenace Case
// @route get /api/manitCase/:id
exports.getOneManitenaceCase = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  db.model("manitUser", manitenaceUserSchema);
  db.model("Device", devicesSchema);
  const manitencesCaseModel = db.model("manitencesCase", manitencesCaseSchema);
  const caseHistoryModel = db.model("maintenacesHistory", caseHitstorySchema);

  const { id } = req.params;

  const manitCase = await manitencesCaseModel
    .findById(id)
    .populate({
      path: "userId",
    })
    .populate({ path: "deviceId" });
  if (!manitCase) {
    return next(new ApiError(`No manitences Case By this ID ${id}`));
  }

  // sort the calling
  if (manitCase.customerCalling && manitCase.customerCalling.length > 0) {
    manitCase.customerCalling.sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );
  }

  const pageSize = req.query.limit || 20;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  const totalItems = await caseHistoryModel.countDocuments();

  const totalPages = Math.ceil(totalItems / pageSize);
  const casehistory = await caseHistoryModel
    .find({
      counter: manitCase.counter,
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize);

  res.status(200).json({
    message: "success",
    Pages: totalPages,
    data: manitCase,
    history: casehistory,
  });
});
// @desc post Manitenace Case
// @route post /api/manitCase
exports.createManitenaceCase = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const manitencesCaseModel = db.model("manitencesCase", manitencesCaseSchema);
  const caseHistoryModel = db.model("maintenacesHistory", caseHitstorySchema);

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

  const milliseconds = ts;
  req.body.counter = milliseconds;
  req.body.caseCounter = 1068 + nextCounter;

  req.body.deviceReceptionDate = formattedDate;
  req.body.manitencesStatus = "Received";
  const createed = await manitencesCaseModel.create(req.body);

  await caseHistoryModel.create({
    devicesId: createed.id,
    employeeName: req.user.name,
    date: formattedDate,
    counter: req.body.caseCounter,
    histoyType: "create",
    deviceStatus: req.body.deviceStatus,
  });

  res.status(200).json({
    status: "success",
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
  db.model("Stock", stockSchema);
  const caseHistoryModel = db.model("maintenacesHistory", caseHitstorySchema);

  const data = piecesAndCost.map((item) => ({
    productId: item.productId,
    taxPrice: item.taxPrice,
    name: item.name,
    qr: item.qr,
    quantity: Number(item.quantity) || 1,
    exchangeRate: Number(item.exchangeRate) || 1,
    buyingPrice: Number(item.buyingPrice) || 0,
    prodcutType: item.prodcutType,
    taxRate: item?.taxRate || 0,
    taxs: item?.taxsId || 0,
    price: Number(item.price) || 0,
    stockId: item.stockId,
    desc: item.desc,
  }));

  const updatedDevice = await manitencesCaseModel.findByIdAndUpdate(
    id,
    {
      amountDue: req.body.amountDue,
      technicalDesc: req.body.technicalDesc,
      $set: { piecesAndCost: data },
    },
    { new: true }
  );

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

  await caseHistoryModel.create({
    devicesId: id,
    employeeName: req.user.name,
    date: formattedDate,
    counter: updatedDevice.counter,
    histoyType: "update pieces",
    deviceStatus: req.body.deviceStatus,
  }),
    res.status(200).json({
      status: "success",
      message: "Products added to manitences Case and stock updated",
      data: updatedDevice,
    });
});
exports.addCalling = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const { id } = req.params;
  const { customerCalling } = req.body;
  const manitencesCaseModel = db.model("manitencesCase", manitencesCaseSchema);
  const caseHistoryModel = db.model("maintenacesHistory", caseHitstorySchema);

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
  const newCallingEntry = {
    connect: customerCalling.connect,
    date: formattedDate,
    user: req.user.name,
  };
  const updatedDevice = await manitencesCaseModel.findByIdAndUpdate(
    id,
    {
      $push: { customerCalling: newCallingEntry },
    },
    { new: true }
  );
  await caseHistoryModel.create({
    devicesId: id,
    employeeName: req.user.name,
    date: formattedDate,
    counter: updatedDevice.counter,
    histoyType: "update contact",
    deviceStatus: req.body.deviceStatus,
  }),
    res.status(200).json({
      status: "success",
      message: "Customer Calling has been added",
      data: updatedDevice,
    });
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
  const caseHistoryModel = db.model("maintenacesHistory", caseHitstorySchema);
  const manitUserModel = db.model("manitUser", manitenaceUserSchema);

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
  const maintenance = await manitencesCaseModel.findByIdAndUpdate(id, {
    manitencesStatus: "Delivered",
    paymentStatus: "paid",
  });
  let piecesAndCost = maintenance.piecesAndCost.map((item) => ({
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
    stockId: item.stockId,
    desc: item.desc,
  }));

  const financialFund = await FinancialFundsModel.findById(
    req.body.financialFundsId
  );
  let client;
  if (req.body.customer === false) {
    client = await manitUserModel.findById(maintenance.userId);
  }
  console.log(req.body);
  try {
    const order = await orderModel.create({
      employee: req.user._id,
      cartItems: piecesAndCost,
      returnCartItem: piecesAndCost,
      currencyCode: req.body.currency,
      customarId: req.body.customerId || maintenance?.userId || "",
      customarName: req.body.customerName || client?.userName || "",
      customarEmail: req.body.customerEmail || client?.userEmail || "",
      customarPhone: req.body.customerPhone || client?.userPhone || "",
      customarAddress: req.body.customerAddress || client?.address || "",
      totalOrderPrice: req.body.amountDue,
      totalPriceExchangeRate: req.body.priceExchangeRate || req.body.amountDue,
      date: req.body.date || formattedDate,
      onefinancialFunds: req.body.financialFundsId,
      counter: "mt-" + nextCounter,
      exchangeRate: req.body.exchangeRate || 1,
      paid: "paid",
    });

    await Promise.all([
      ReportsSalesModel.create({
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
      }),

      ReportsFinancialFundsModel.create({
        date: formattedDate,
        amount: req.body.amountDue,
        totalPriceAfterDiscount: req.body.amountDue,
        order: order._id,
        type: "sales",
        financialFundId: financialFund,
        financialFundRest: financialFund.fundBalance,
        exchangeRate:
          req.body.exchangeRate ||
          financialFund?.fundCurrency?.exchangeRate ||
          1,
      }),

      await caseHistoryModel.create({
        devicesId: id,
        employeeName: req.user.name,
        date: formattedDate,
        counter: maintenance.counter,
        histoyType: "Delivered",
        deviceStatus: req.body.deviceStatus,
      }),
    ]);

    financialFund.fundBalance += req.body.amountDue;
    await financialFund.save();

    await Promise.all(
      piecesAndCost.map(async (item) => {
        const product = await productModel.findOne({ qr: item.qr });
        if (product) {
          createProductMovement(
            product._id,
            product.quantity - item.quantity,
            item.quantity,
            "out",
            "sales",
            dbName
          );
        }
      })
    );
    // Batch update products
    const bulkProductOperations = piecesAndCost.map((item) => ({
      updateOne: {
        filter: { qr: item.qr, "stocks.stockId": item.stockId },
        update: {
          $inc: {
            "stocks.$.productQuantity": -item.quantity,
            quantity: -item.quantity,
            activeCount: -item.quantity,
          },
        },
      },
    }));

    if (bulkProductOperations.length > 0) {
      await productModel.bulkWrite(bulkProductOperations);
    }

    // Process ActiveProductsValue in parallel
    await Promise.all(
      piecesAndCost.map(async (item) => {
        const product = await productModel.findOne({ qr: item.qr });
        if (product && product.type !== "Service") {
          const existingRecord = await ActiveProductsValue.findOne({
            currency: product.currency._id,
          });
          if (existingRecord) {
            existingRecord.activeProductsCount -= item.quantity;
            existingRecord.activeProductsValue -=
              item.buyingPrice * item.quantity;
            await existingRecord.save();
          } else {
            await createActiveProductsValue(0, 0, product.currency._id, dbName);
          }
        }
      })
    );

    createInvoiceHistory(dbName, order._id, "create", req.user._id);

    res.status(200).json({ message: order });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: "An error occurred" });
  }
});

exports.getCaseByDeviceId = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const manitencesCaseModel = db.model("manitencesCase", manitencesCaseSchema);
  const deviceModel = db.model("Device", devicesSchema);
  db.model("manitUser", manitenaceUserSchema);
  const { id } = req.params;
  const device = await deviceModel.findById(id);
  const pageSize = req.query.limit || 25;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  const totalItems = await deviceModel.countDocuments();

  const totalPages = Math.ceil(totalItems / pageSize);

  const manitencesCase = await manitencesCaseModel
    .find({ deviceId: id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize);

  res.status(200).json({
    status: "true",
    results: manitencesCase.length,
    Pages: totalPages,
    data: { manitencesCase, device },
  });
});

exports.getOneManitenaceCaseForUser = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  db.model("manitUser", manitenaceUserSchema);
  db.model("Device", devicesSchema);
  const manitencesCaseModel = db.model("manitencesCase", manitencesCaseSchema);
  const caseHistoryModel = db.model("maintenacesHistory", caseHitstorySchema);

  const caseNumber = req.params.counter;

  const manitCase = await manitencesCaseModel
    .findOne({ counter: caseNumber })
    .populate({
      path: "userId",
    })
    .populate({ path: "deviceId" });
  if (!manitCase) {
    return next(
      new ApiError(`No manitences Case By this case Number ${caseNumber}`)
    );
  }

  const pageSize = req.query.limit || 20;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  const totalItems = await caseHistoryModel.countDocuments({
    counter: manitCase.counter,
  });

  const totalPages = Math.ceil(totalItems / pageSize);
  const casehistory = await caseHistoryModel
    .find({
      counter: manitCase.counter,
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize);

  res.status(200).json({
    message: "success",
    Pages: totalPages,
    data: manitCase,
    history: casehistory,
  });
});
