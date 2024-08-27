const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const mongoose = require("mongoose");
const productSchema = require("../models/productModel");
const financialFundsSchema = require("../models/financialFundsModel");
const reportsFinancialFundsSchema = require("../models/reportsFinancialFunds");
const emoloyeeShcema = require("../models/employeeModel");
const ReportsSalesSchema = require("../models/reportsSalesModel");
const { Search } = require("../utils/search");
const { createInvoiceHistory } = require("./invoiceHistoryService");
const { createProductMovement } = require("../utils/productMovement");
const currencySchema = require("../models/currencyModel");
const categorySchema = require("../models/CategoryModel");
const brandSchema = require("../models/brandModel");
const labelsSchema = require("../models/labelsModel");
const TaxSchema = require("../models/taxModel");
const UnitSchema = require("../models/UnitsModel");
const variantSchema = require("../models/variantsModel");
const customarSchema = require("../models/customarModel");
const ActiveProductsValueModel = require("../models/activeProductsValueModel");
const { createActiveProductsValue } = require("../utils/activeProductsValue");
const paymentTypesSchema = require("../models/paymentTypesModel");
const expensesSchema = require("../models/expensesModel");
const orderFishSchema = require("../models/orderModelFish");
const refundPosSalesSchema = require("../models/refundPosSales");

// @desc    Create cash order from the POS page
// @route   POST /api/salse-pos
// @access  privet/Pos Sales
exports.createCashOrder = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const orderFishPosModel = db.model("orderFishPos", orderFishSchema);
  const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
  const ReportsFinancialFundsModel = db.model(
    "ReportsFinancialFunds",
    reportsFinancialFundsSchema
  );
  const ReportsSalesModel = db.model("ReportsSales", ReportsSalesSchema);
  const productModel = db.model("Product", productSchema);
  const expensesModel = db.model("Expenses", expensesSchema);
  const ActiveProductsValue = db.model(
    "ActiveProductsValue",
    ActiveProductsValueModel
  );
  db.model("PaymentType", paymentTypesSchema);
  db.model("Currency", currencySchema);
  const cartItems = req.body.cartItems;

  if (!cartItems || cartItems.length === 0) {
    return next(new ApiError("The cart is empty", 400));
  }

  const {
    totalOrderPrice,
    financialFunds: financialFundsId,
    exchangeRate,
    couponCount,
    totalPriceAfterDiscount,
    priceExchangeRate,
  } = req.body;

  const financialFunds = await FinancialFundsModel.findById(
    financialFundsId
  ).populate({ path: "fundPaymentType" });
  if (!financialFunds) {
    return next(
      new ApiError(
        `There is no such financial fund with id ${financialFundsId}`,
        404
      )
    );
  }

  const stockID = req.body.stock;

  // Get next counter
  const nextCounter = (await orderFishPosModel.countDocuments()) + 1;
  const nextCounterReports = (await ReportsSalesModel.countDocuments()) + 1;
  // Create order
  const order = await orderFishPosModel.create({
    employee: req.user._id,
    priceExchangeRate,
    cartItems,
    returnCartItem: cartItems,
    currencyCode: req.body.currency,
    totalOrderPrice,
    totalPriceAfterDiscount,
    taxs: req.body.taxs,
    price: req.body.price,
    taxRate: req.body.taxRate,
    customarId: req.body.customarId,
    customarName: req.body.customarName,
    customarEmail: req.body.customarEmail,
    customarPhone: req.body.customarPhone,
    customaraddres: req.body.customaraddres,
    coupon: req.body.coupon,
    couponCount: req.body.couponCount,
    couponType: req.body.couponType,
    type: req.body.type,
    onefinancialFunds: financialFundsId,
    paidAt: new Date().toISOString(),
    counter: nextCounter,
    exchangeRate,
  });

  // Update financial funds
  financialFunds.fundBalance +=
    couponCount > 0
      ? totalPriceAfterDiscount / exchangeRate
      : priceExchangeRate;

  // Create ReportsFinancialFunds
  const createReportsFinancialFundsPromise = ReportsFinancialFundsModel.create({
    date: new Date().toISOString(),
    amount:
      totalPriceAfterDiscount > 0 ? totalPriceAfterDiscount : totalOrderPrice,
    totalPriceAfterDiscount: totalPriceAfterDiscount / exchangeRate,
    order: order._id,
    type: "sales",
    financialFundId: financialFundsId,
    financialFundRest: financialFunds.fundBalance,
    exchangeRate,
  });

  // Product movements
  const productMovementPromises = cartItems.map(async (item) => {
    const product = await productModel.findOne({ qr: item.qr });
    if (product && product.type !== "Service") {
      const stockEntry = product.stocks.find(
        (stock) => stock.stockId.toString() === stockID.toString()
      );
      if (stockEntry) {
        stockEntry.productQuantity -= item.quantity;
        product.sold += item.quantity;
        await product.save();
        createProductMovement(
          item.product,
          stockEntry.productQuantity,
          item.quantity,
          "out",
          "sales",
          dbName
        );
      }
    }
  });

  // ActiveProductsValue updates
  const activeProductsValueUpdates = cartItems.map(async (item) => {
    const product = await productModel.findOne({ qr: item.qr });
    if (product && product.type !== "Service") {
      const existingRecord = await ActiveProductsValue.findOne({
        currency: product.currency._id,
      });
      if (existingRecord) {
        existingRecord.activeProductsValue -= item.buyingPrice * item.quantity;
        existingRecord.activeProductsCount -= item.quantity;
        await existingRecord.save();
      } else {
        await createActiveProductsValue(0, 0, product.currency._id, dbName);
      }
    }
  });

  // Create Expense
  const createExpensePromise =
    financialFunds.fundPaymentType.haveRatio === "true"
      ? (async () => {
          const nextExpenseCounter = (await expensesModel.countDocuments()) + 1;
          const expenseQuantityAfterKdv =
            (totalPriceAfterDiscount / exchangeRate) *
              (financialFunds.bankRatio / 100) ||
            priceExchangeRate * (financialFunds.bankRatio / 100);
          financialFunds.fundBalance -= expenseQuantityAfterKdv;
          const expense = await expensesModel.create({
            ...req.body,
            expenseQuantityAfterKdv,
            expenseQuantityBeforeKdv: expenseQuantityAfterKdv,
            expenseCategory: financialFunds.fundPaymentType.expenseCategory,
            counter: nextExpenseCounter,
            expenseDate: new Date().toISOString(),
            expenseFinancialFund: financialFunds.fundName,
            expenseTax: "0",
            type: "paid",
          });

          await ReportsFinancialFundsModel.create({
            date: new Date().toISOString(),
            amount: expenseQuantityAfterKdv,
            order: expense._id,
            type: "expense",
            financialFundId: financialFundsId,
            financialFundRest: financialFunds.fundBalance,
            exchangeRate: expenseQuantityAfterKdv,
          });
        })()
      : Promise.resolve();
  const reportsSalesPromise = ReportsSalesModel.create({
    customer: req.body.customarName,
    orderId: order._id,
    date: new Date().toISOString(),
    fund: financialFundsId,
    amount: totalOrderPrice,
    cartItems: cartItems,
    type: "pos",
    counter: nextCounterReports,
    paymentType: "Single Fund",
    employee: req.user._id,
  });

  // Wait for all promises to resolve
  await Promise.all([
    createReportsFinancialFundsPromise,
    ...productMovementPromises,
    createExpensePromise,
    reportsSalesPromise,
    ...activeProductsValueUpdates,
  ]);

  // Save financial funds and respond
  await financialFunds.save();
  const history = createInvoiceHistory(
    dbName,
    order._id,
    "create",
    req.user._id
  );
  res.status(201).json({ status: "success", data: order, history });
});

// @desc    create cash order for multiple funds
// @route   POST /api/salse-pos/funds
// @access  privet/User
exports.createCashOrderMultipelFunds = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const salsePos = db.model("orderFishPos", orderFishSchema);
  const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
  const ReportsFinancialFundsModel = db.model(
    "ReportsFinancialFunds",
    reportsFinancialFundsSchema
  );
  const expensesModel = db.model("Expenses", expensesSchema);
  const ReportsSalesModel = db.model("ReportsSales", ReportsSalesSchema);
  const productModel = db.model("Product", productSchema);
  db.model("PaymentType", paymentTypesSchema);
  const stockID = req.body.stock;
  console.log(req.body.stock);
  db.model("Currency", currencySchema);
  const padZero = (value) => (value < 10 ? `0${value}` : value);
  const ts = Date.now();
  const date_ob = new Date(ts);
  const date = `${date_ob.getFullYear()}-${padZero(
    date_ob.getMonth() + 1
  )}-${padZero(date_ob.getDate())} ${padZero(date_ob.getHours())}:${padZero(
    date_ob.getMinutes()
  )}:${padZero(date_ob.getSeconds())}`;
  const timeIsoString = new Date().toISOString();

  const { cartItems, financialFunds, ...orderData } = req.body;

  if (!cartItems || cartItems.length === 0) {
    return next(new ApiError("The cart is empty", 400));
  }

  const totalOrderCount = (await salsePos.countDocuments()) + 1;
  const reportsOrderCount = (await ReportsSalesModel.countDocuments()) + 1;
  const order = await salsePos.create({
    ...orderData,
    employee: req.user._id,
    cartItems,
    returnCartItem: cartItems,
    totalOrderPrice: 0,
    paidAt: date,
    counter: totalOrderCount,
    financialFunds: financialFunds
      .filter((fund) => fund.amount !== 0)
      .map((fund) => ({
        fundId: fund.fundId,
        allocatedAmount: parseFloat(fund.amount),
        exchangeRateIcon: fund.exchangeRateIcon,
        exchangeRate: fund.exchangeRate,
      })),
  });

  let totalAllocatedAmount = 0;
  const bulkUpdates = [];
  const bulkUpdates2 = [];
  const financialFundsMap = {};
  let expenseCounter = await expensesModel.countDocuments();

  const fundsPromises = financialFunds
    .filter((fund) => fund.amount !== 0)
    .map(async ({ fundId, amount, exchangeRate }) => {
      const financialFund = await FinancialFundsModel.findById(fundId).populate(
        { path: "fundPaymentType" }
      );

      if (!financialFund) {
        return next(new ApiError(`Financial fund ${fundId} not found`, 404));
      }

      const updatedFundBalance =
        parseFloat(financialFund.fundBalance) + parseFloat(amount);
      totalAllocatedAmount += parseFloat(amount) * exchangeRate;

      bulkUpdates.push({
        updateOne: {
          filter: { _id: fundId },
          update: { $inc: { fundBalance: parseFloat(amount) } },
        },
      });

      await ReportsFinancialFundsModel.create({
        date: timeIsoString,
        amount: parseFloat(amount) * exchangeRate,
        order: order._id,
        type: "sales",
        financialFundId: fundId,
        financialFundRest: updatedFundBalance,
        exchangeRate,
      });

      if (
        financialFund.fundPaymentType &&
        financialFund.fundPaymentType.haveRatio === "true"
      ) {
        const expenseQuantityAfterKdv =
          parseFloat(amount) * (parseFloat(financialFund.bankRatio) / 100);
        const finalFundBalance = updatedFundBalance - expenseQuantityAfterKdv;

        const expensee = await expensesModel.create({
          ...req.body,
          expenseQuantityAfterKdv,
          expenseQuantityBeforeKdv: expenseQuantityAfterKdv,
          expenseCategory: financialFund.fundPaymentType.expenseCategory,
          counter: ++expenseCounter,
          expenseDate: timeIsoString,
          expenseFinancialFund: financialFund.fundName,
          expenseTax: "0",
        });

        await ReportsFinancialFundsModel.create({
          date: timeIsoString,
          amount: expenseQuantityAfterKdv,
          order: expensee._id,
          type: "expense",
          financialFundId: fundId,
          financialFundRest: finalFundBalance,
          exchangeRate,
        });

        bulkUpdates2.push({
          updateOne: {
            filter: { _id: fundId },
            update: { $set: { fundBalance: finalFundBalance } },
          },
        });
      }

      financialFundsMap[fundId] = financialFund;
    });

  await Promise.all(fundsPromises);

  await Promise.all([
    FinancialFundsModel.bulkWrite(bulkUpdates),
    FinancialFundsModel.bulkWrite(bulkUpdates2),
    salsePos.findByIdAndUpdate(order._id, {
      taxPrice: parseFloat(totalAllocatedAmount),
      totalOrderPrice: parseFloat(totalAllocatedAmount),
    }),
  ]);

  if (totalAllocatedAmount === 0) {
    return res.status(400).json({
      status: "error",
      message:
        "Total allocated amount is zero. Please review your allocations.",
    });
  }

  const productMovementPromises = cartItems.map(async (item) => {
    const product = await productModel.findOne({ qr: item.qr });
    if (product && product.type !== "Service") {
      const stockEntry = product.stocks.find(
        (stock) => stock.stockId.toString() === stockID.toString()
      );
      if (stockEntry) {
        stockEntry.productQuantity -= item.quantity;
        product.sold += item.quantity;
        await product.save();
        createProductMovement(
          item.product,
          stockEntry.productQuantity,
          item.quantity,
          "out",
          "sales",
          dbName
        );
      }
    }
  });

  await Promise.all(productMovementPromises);

  await ReportsSalesModel.create({
    customer: req.body.customarName,
    orderId: order._id,
    date: timeIsoString,
    financialFunds: financialFunds
      .filter((fund) => fund.amount !== 0)
      .map((fund) => ({
        fundId: fund.fundId,
        allocatedAmount: fund.amount,
        exchangeRateIcon: fund.exchangeRateIcon,
        exchangeRate: fund.exchangeRate,
      })),
    amount: parseFloat(totalAllocatedAmount),
    cartItems,
    paymentType: "Multiple Funds",
    employee: req.user._id,
    counter: reportsOrderCount,
    type: "pos",
  });

  try {
    const ActiveProductsValue = db.model(
      "ActiveProductsValue",
      ActiveProductsValueModel
    );

    await Promise.all(
      cartItems.map(async (item) => {
        const { type, currency: itemCurrency } = await productModel.findOne({
          qr: item.qr,
        });

        if (type !== "Service") {
          const totalValue = item.buyingPrice * item.quantity;
          const existingRecord = await ActiveProductsValue.findOne({
            currency: itemCurrency,
          });

          if (existingRecord) {
            existingRecord.activeProductsCount -= item.quantity;
            existingRecord.activeProductsValue -= totalValue;
            await existingRecord.save();
          } else {
            await createActiveProductsValue(
              item.quantity,
              totalValue,
              itemCurrency,
              dbName
            );
          }
        }
      })
    );
  } catch (err) {
    console.log("OrderServices 619");
    console.log(err.message);
  }

  const history = createInvoiceHistory(
    dbName,
    order._id,
    "create",
    req.user._id
  );

  res.status(201).json({ status: "success", data: order, history });
});

// @desc    Get All order
// @route   GET /api/salse-pos
// @access  privet/All
exports.findAllSalsePos = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const salsePos = db.model("orderFishPos", orderFishSchema);
  db.model("Employee", emoloyeeShcema);
  db.model("Product", productSchema);
  db.model("FinancialFunds", financialFundsSchema);
  db.model("ReportsFinancialFunds", reportsFinancialFundsSchema);

  const pageSize = 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;

  // Initialize the base query to exclude type "pos"
  let query = {};
  // Add keyword filter if provided
  if (req.query.keyword) {
    query = {
      $and: [
        query,
        {
          $or: [{ counter: req.query.keyword }],
        },
      ],
    };
  }

  let mongooseQuery = salsePos.find(query);

  // Apply sorting
  mongooseQuery = mongooseQuery.sort({ createdAt: -1 });

  // Count total items without pagination
  const totalItems = await salsePos.countDocuments(query);

  // Calculate total pages
  const totalPages = Math.ceil(totalItems / pageSize);

  // Apply pagination
  mongooseQuery = mongooseQuery
    .skip(skip)
    .limit(pageSize)
    .populate({ path: "employee" });

  const order = await mongooseQuery;

  res.status(200).json({
    status: "true",
    Pages: totalPages,
    results: order.length,
    data: order,
  });
});

// @desc    Get All order
// @route   GET /api/salse-pos/:id
// @access  privet/All
exports.findOneSalsePos = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  db.model("Employee", emoloyeeShcema);
  db.model("Product", productSchema);
  db.model("FinancialFunds", financialFundsSchema);
  db.model("ReportsFinancialFunds", reportsFinancialFundsSchema);
  const salsePos = db.model("orderFishPos", orderFishSchema);

  const { id } = req.params;
  let query = {};
  // Check if the id is a valid ObjectId
  const isObjectId = mongoose.Types.ObjectId.isValid(id);

  if (isObjectId) {
    query = { _id: id };
  } else {
    // Check if the id is a number
    query = { counter: id };
  }
  try {
    const order = await salsePos
      .findOne(query)
      .populate({
        path: "financialFunds.fundId",
        select: "fundName",
      })
      .populate({
        path: "onefinancialFunds",
        select: "fundName",
      });

    if (!order) {
      return next(new ApiError(`No order found for this id ${id}`, 404));
    }

    res.status(200).json({ status: "true", data: order });
  } catch (error) {
    return next(
      new ApiError(`Error retrieving order for id ${id}: ${error.message}`, 500)
    );
  }
});

exports.editPosOrder = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  db.model("Employee", emoloyeeShcema);
  db.model("Product", productSchema);
  const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
  db.model("ReportsFinancialFunds", reportsFinancialFundsSchema);
  const productModel = db.model("Product", productSchema);
  const orderModel = db.model("orderFishPos", orderFishSchema);
  const ReportsSalesModel = db.model("ReportsSales", ReportsSalesSchema);
  const customersModel = db.model("Customar", customarSchema);
  const ReportsFinancialFundsModel = db.model(
    "ReportsFinancialFunds",
    reportsFinancialFundsSchema
  );
  db.model("Currency", currencySchema);
  db.model("Variant", variantSchema);

  const data = new Date();
  const timeIsoString = data.toISOString();

  const { id } = req.params;
  const originalOrders = await orderModel.findById(id);
  oldQuantity = originalOrders?.cartItems?.quantity;
  oldValue = originalOrders?.returnCartItem?.buyingPrice;

  if (req.body.name) {
    req.body.slug = slugify(req.body.name);
  }

  const order = await orderModel.findByIdAndUpdate(id, req.body, {
    new: true,
  });

  if (!order) {
    return next(new ApiError(`No Order for this id ${req.params.id}`, 404));
  }
  const originalOrder = await orderModel.findById(id);

  if (order) {
    const bulkOption = req.body.cartItems.map((item) => ({
      updateOne: {
        filter: { _id: item._id },
        update: {
          $inc: {
            quantity: -item.quantity,
            sold: +item.quantity,
            activeCount: -item.quantity,
          },
        },
      },
    }));
    const bulkOption2 = originalOrder.cartItems.map((item) => ({
      updateOne: {
        filter: { _id: item._id },
        update: {
          $inc: {
            quantity: +item.quantity,
            activeCount: +item.quantity,
          },
        },
      },
    }));

    await productModel.bulkWrite(bulkOption, {});
    await productModel.bulkWrite(bulkOption2, {});
    let customars;
    if (req.body.customerId)
      customars = await customersModel.findById(req.body.customerId);

    const originalfinancialFunds = await FinancialFundsModel.findById(
      originalOrder.onefinancialFunds._id
    );
    const financialFunds = await FinancialFundsModel.findById(
      order.onefinancialFunds._id
    );
    originalfinancialFunds.fundBalance -= originalOrder.totalOrderPrice;

    financialFunds.fundBalance += order.totalOrderPrice;
    await originalfinancialFunds.save();
    await ReportsFinancialFundsModel.create({
      date: timeIsoString,
      amount: order.totalOrderPrice,
      order: order._id,
      type: "sales",
      financialFundId: order.onefinancialFunds._id,
      financialFundRest: financialFunds.fundBalance,
      exchangeRate: req.body.exchangeRate,
    });

    await financialFunds.save();

    // Create sales report
    await ReportsSalesModel.create({
      date: timeIsoString,
      orderId: id,
      fund: financialFunds,
      amount: order.totalOrderPrice,
      cartItems: cartItems,
      paymentType: "Edit Order",
      employee: req.user._id,
    });

    if (customars) {
      customars.total -= originalOrder.totalOrderPrice;
      customars.TotalUnpaid -= originalOrder.totalOrderPrice;

      order.totalRemainderMainCurrency -= originalOrder.totalOrderPrice;
      order.totalRemainder -= originalOrder.totalOrderPrice;

      await customars.save();
    }
    await order.save();
  }

  originalOrder.cartItems.map(async (item) => {
    const { quantity } = await productModel.findOne({ qr: item.qr });
    createProductMovement(
      item.product,
      quantity,
      item.quantity,
      "in",
      "Edit Sales",
      dbName
    );
  });

  try {
    const ActiveProductsValue = db.model(
      "ActiveProductsValue",
      ActiveProductsValueModel
    );
    let totalCount = 0;
    let totalValue = 0;

    for (const returnItem of originalOrder.returnCartItem) {
      const { type, currency: itemCurrency } = await productModel.findOne({
        qr: returnItem.qr,
      });

      if (type != "Service") {
        const cartItem = originalOrder.cartItems.find(
          (cartItem) => cartItem.qr === returnItem.qr
        );

        if (cartItem) {
          const oldQty = cartItem.quantity;
          const newQty = returnItem.quantity;

          const qtyDifference = newQty - oldQty;
          const itemValue = returnItem.buyingPrice * qtyDifference;

          totalValue += itemValue;
          totalCount += qtyDifference;

          const existingRecord = await ActiveProductsValue.findOne({
            currency: itemCurrency,
          });

          if (existingRecord) {
            existingRecord.activeProductsCount -= qtyDifference;
            existingRecord.activeProductsValue -= itemValue;
            await existingRecord.save();
          } else {
            await createActiveProductsValue(
              qtyDifference,
              itemValue,
              itemCurrency,
              dbName
            );
          }
        }
      }
    }
  } catch (err) {
    console.log("OrderServices 858");
    console.log(err.message);
  }

  const history = createInvoiceHistory(dbName, id, "edit", req.user._id);

  res.status(200).json({
    status: "true",
    message: "Order updated successfully",
    data: order,
    history,
  });
});

exports.returnPosSales = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  // Define models
  const models = {
    Employee: db.model("Employee", emoloyeeShcema),
    Product: db.model("Product", productSchema),
    Currency: db.model("Currency", currencySchema),
    Category: db.model("Category", categorySchema),
    Brand: db.model("brand", brandSchema),
    Labels: db.model("Labels", labelsSchema),
    Tax: db.model("Tax", TaxSchema),
    Unit: db.model("Unit", UnitSchema),
    Variant: db.model("Variant", variantSchema),
    OrderFishPos: db.model("orderFishPos", orderFishSchema),
    FinancialFunds: db.model("FinancialFunds", financialFundsSchema),
    ReturnOrder: db.model("RefundPosSales", refundPosSalesSchema),
    ReportsFinancialFunds: db.model(
      "ReportsFinancialFunds",
      reportsFinancialFundsSchema
    ),
    ActiveProductsValue: db.model(
      "ActiveProductsValue",
      ActiveProductsValueModel
    ),
  };
  const ReportsSalesModel = db.model("ReportsSales", ReportsSalesSchema);

  const financialFundsId = req.body.onefinancialFunds;
  const financialFunds = await models.FinancialFunds.findById(financialFundsId);
  const orderId = req.body.orderId;
  const orders = await models.OrderFishPos.findById(orderId);
  const StockId = req.body.stockId;

  // Helper function to pad zero
  const padZero = (value) => (value < 10 ? `0${value}` : value);

  const currentDateTime = new Date();
  const formattedDate = `${currentDateTime.getFullYear()}-${padZero(
    currentDateTime.getMonth() + 1
  )}-${padZero(currentDateTime.getDate())} ${padZero(
    currentDateTime.getHours()
  )}:${padZero(currentDateTime.getMinutes())}:${padZero(
    currentDateTime.getSeconds()
  )}`;

  req.body.paidAt = formattedDate;
  req.body.employee = req.user._id;
  const nextCounterReports = (await ReportsSalesModel.countDocuments()) + 1;
  try {
    const order = await models.ReturnOrder.create(req.body);

    const bulkUpdateOptions = req.body.cartItems.map((item) => ({
      updateOne: {
        filter: { _id: item._id },
        update: { $inc: { quantity: +item.quantity } },
      },
    }));

    await models.Product.bulkWrite(bulkUpdateOptions);
    await models.ReturnOrder.bulkWrite(bulkUpdateOptions);

    await Promise.all(
      req.body.cartItems.map(async (item) => {
        const product = await models.Product.findOne({ qr: item.qr });
        if (product) {
          const { currency: itemCurrency } = product;
          const existingRecord = await models.ActiveProductsValue.findOne({
            currency: itemCurrency,
          });

          const itemValue = item.buyingPrice * item.quantity;

          if (existingRecord) {
            existingRecord.activeProductsCount += item.quantity;
            existingRecord.activeProductsValue += itemValue;
            await existingRecord.save();
          } else {
            await createActiveProductsValue(
              item.quantity,
              itemValue,
              itemCurrency,
              dbName
            );
          }
        }
      })
    );

    financialFunds.fundBalance -= req.body.priceExchangeRate;
    await financialFunds.save();

    await models.ReportsFinancialFunds.create({
      date: currentDateTime.toISOString(),
      amount: req.body.totalOrderPrice,
      order: order._id,
      type: "refund-sales",
      financialFundId: financialFundsId,
      financialFundRest: financialFunds.fundBalance,
      exchangeRate: req.body.priceExchangeRate,
    });

    const returnCartItemUpdates = req.body.cartItems
      .map((incomingItem) => {
        const matchingIndex = orders.returnCartItem.findIndex(
          (item) => item.qr === incomingItem.qr
        );

        if (matchingIndex !== -1) {
          const newQuantity =
            orders.returnCartItem[matchingIndex].quantity -
            incomingItem.quantity;

          return {
            updateOne: {
              filter: { _id: orderId },
              update: {
                $set: {
                  [`returnCartItem.${matchingIndex}.quantity`]: newQuantity,
                },
              },
            },
          };
        }

        return null;
      })
      .filter(Boolean);

    await models.OrderFishPos.bulkWrite(returnCartItemUpdates);

    await Promise.all(
      req.body.cartItems.map(async (item) => {
        const product = await models.Product.findOne({ qr: item.qr });
        if (product && product.type !== "Service") {
          const stockEntry = product.stocks.find(
            (stock) => stock.stockId.toString() === StockId.toString()
          );
          if (stockEntry) {
            stockEntry.productQuantity += item.quantity;
            await product.save();
            createProductMovement(
              item._id,
              stockEntry.productQuantity,
              item.quantity,
              "in",
              "returnSales",
              dbName
            );
          }
        }
      })
    );

    const history = createInvoiceHistory(
      dbName,
      orderId,
      "return",
      req.user._id
    );

    await ReportsSalesModel.create({
      customer: req.body.customarName,
      orderId: order._id,
      date: new Date().toISOString(),
      fund: financialFundsId,
      amount: req.body.totalOrderPrice,
      cartItems: req.body.cartItems,
      type: "refund-pos",
      counter: nextCounterReports,
      paymentType: "Single Fund",
      employee: req.user._id,
    });
    res.status(200).json({
      status: "success",
      message: "The product has been returned",
      data: order,
      history,
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.counter) {
      const counterPrefix = req.body.counter.slice(0, 7);

      const nextCounter =
        (await models.ReturnOrder.countDocuments({
          counter: new RegExp(`^${counterPrefix}-`),
        })) + 1;

      console.log(nextCounter);
      req.body.counter = `${req.body.counter}-${nextCounter}`;
      const order = await models.ReturnOrder.create(req.body);

      const bulkUpdateOptions = req.body.cartItems.map((item) => ({
        updateOne: {
          filter: { _id: item._id },
          update: { $inc: { quantity: +item.quantity } },
        },
      }));

      await models.Product.bulkWrite(bulkUpdateOptions);
      await models.ReturnOrder.bulkWrite(bulkUpdateOptions);

      await Promise.all(
        req.body.cartItems.map(async (item) => {
          const product = await models.Product.findOne({ qr: item.qr });
          if (product) {
            const { currency: itemCurrency } = product;
            const existingRecord = await models.ActiveProductsValue.findOne({
              currency: itemCurrency,
            });

            const itemValue = item.buyingPrice * item.quantity;

            if (existingRecord) {
              existingRecord.activeProductsCount += item.quantity;
              existingRecord.activeProductsValue += itemValue;
              await existingRecord.save();
            } else {
              await createActiveProductsValue(
                item.quantity,
                itemValue,
                itemCurrency,
                dbName
              );
            }
          }
        })
      );

      financialFunds.fundBalance -= req.body.priceExchangeRate;
      await financialFunds.save();

      await models.ReportsFinancialFunds.create({
        date: currentDateTime.toISOString(),
        amount: req.body.totalOrderPrice,
        order: order._id,
        type: "refund-sales",
        financialFundId: financialFundsId,
        financialFundRest: financialFunds.fundBalance,
        exchangeRate: req.body.priceExchangeRate,
      });

      const returnCartItemUpdates = req.body.cartItems
        .map((incomingItem) => {
          const matchingIndex = orders.returnCartItem.findIndex(
            (item) => item.qr === incomingItem.qr
          );

          if (matchingIndex !== -1) {
            const newQuantity =
              orders.returnCartItem[matchingIndex].quantity -
              incomingItem.quantity;

            return {
              updateOne: {
                filter: { _id: orderId },
                update: {
                  $set: {
                    [`returnCartItem.${matchingIndex}.quantity`]: newQuantity,
                  },
                },
              },
            };
          }

          return null;
        })
        .filter(Boolean);

      await models.OrderFishPos.bulkWrite(returnCartItemUpdates);

      await Promise.all(
        req.body.cartItems.map(async (item) => {
          const product = await models.Product.findOne({ qr: item.qr });
          if (product && product.type !== "Service") {
            const stockEntry = product.stocks.find(
              (stock) => stock.stockId.toString() === StockId.toString()
            );
            if (stockEntry) {
              stockEntry.productQuantity += item.quantity;
              await product.save();
              createProductMovement(
                item._id,
                stockEntry.productQuantity,
                item.quantity,
                "in",
                "returnSales",
                dbName
              );
            }
          }
        })
      );

      const history = createInvoiceHistory(
        dbName,
        orderId,
        "return",
        req.user._id
      );
      await ReportsSalesModel.create({
        customer: req.body.customarName,
        orderId: order._id,
        date: new Date().toISOString(),
        fund: financialFundsId,
        amount: req.body.totalOrderPrice,
        cartItems: req.body.cartItems,
        type: "refund-pos",
        counter: nextCounterReports,
        paymentType: "Single Fund",
        employee: req.user._id,
      });
      res.status(200).json({
        status: "success",
        message: "The product has been returned",
        data: order,
        history,
      });
    } else {
      // Other errors, pass them to the error handler middleware
      next(error);
    }
  }
});

// @desc    Get All order
// @route   GET /api/getReturnOrder
// @access  privet
exports.getReturnPosSales = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  db.model("Employee", emoloyeeShcema);
  db.model("FinancialFunds", financialFundsSchema);
  db.model("ReportsFinancialFunds", reportsFinancialFundsSchema);
  db.model("Product", productSchema);
  const returnOrderModel = db.model("RefundPosSales", refundPosSalesSchema);
  db.model("ReportsSales", ReportsSalesSchema);

  const { totalPages, mongooseQuery } = await Search(returnOrderModel, req);

  const test = await mongooseQuery;
  res.status(200).json({
    status: "success",
    results: test.length,
    Pages: totalPages,
    data: test,
  });
});

// @desc    Get one order
// @route   GET /api/getReturnOrder/:id
// @access  privet
exports.getOneReturnPosSales = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  db.model("Employee", emoloyeeShcema);
  db.model("FinancialFunds", financialFundsSchema);
  db.model("ReportsFinancialFunds", reportsFinancialFundsSchema);
  db.model("Product", productSchema);
  const returnOrderModel = db.model("RefundPosSales", refundPosSalesSchema);
  db.model("ReportsSales", ReportsSalesSchema);

  const { id } = req.params;
  const order = await returnOrderModel.findById(id);
  if (!order) {
    return next(new ApiError(`No order for this id ${id}`, 404));
  }
  res.status(200).json({ status: "true", data: order });
});

exports.canceledPosSales = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const orderFishModel = db.model("orderFishPos", orderFishSchema);
  const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
  const ReportsFinancialFundsModel = db.model(
    "ReportsFinancialFunds",
    reportsFinancialFundsSchema
  );
  const ReportsSalesModel = db.model("ReportsSales", ReportsSalesSchema);
  db.model("Employee", emoloyeeShcema);
  const productModel = db.model("Product", productSchema);

  const padZero = (value) => (value < 10 ? `0${value}` : value);

  const currentDateTime = new Date();
  const formattedDate = `${currentDateTime.getFullYear()}-${padZero(
    currentDateTime.getMonth() + 1
  )}-${padZero(currentDateTime.getDate())} ${padZero(
    currentDateTime.getHours()
  )}:${padZero(currentDateTime.getMinutes())}:${padZero(
    currentDateTime.getSeconds()
  )}`;

  const { id } = req.params;
  const { stockId } = req.body;
  const canceled = await orderFishModel.findById(id);

  if (canceled.type !== "cancel") {
    if (canceled.financialFunds && canceled.financialFunds.length > 0) {
      for (const fundId of canceled.financialFunds) {
        const financialFund = await FinancialFundsModel.findById({
          _id: fundId.fundId,
        });
        console.log(fundId.allocatedAmount);
        financialFund.fundBalance -= fundId.allocatedAmount;
        await financialFund.save();

        await ReportsFinancialFundsModel.create({
          date: currentDateTime.toISOString(),
          amount: fundId.allocatedAmount,
          order: canceled._id,
          type: "cancel",
          financialFundId: financialFund._id,
          financialFundRest: financialFund.fundBalance,
          exchangeRate: fundId.allocatedAmount,
        });
      }
    } else {
      const financialFund = await FinancialFundsModel.findById({
        _id: canceled.onefinancialFunds,
      });
      financialFund.fundBalance -= canceled.priceExchangeRate;
      await financialFund.save();
      await ReportsFinancialFundsModel.create({
        date: currentDateTime.toISOString(),
        amount: canceled.totalOrderPrice,
        order: canceled._id,
        type: "cancel",
        financialFundId: financialFund._id,
        financialFundRest: financialFund.fundBalance,
        exchangeRate: canceled.priceExchangeRate,
      });
    }

    const productMovementPromises = canceled.cartItems.map(async (item) => {
      const product = await productModel.findOne({ qr: item.qr });
      if (product && product.type !== "Service") {
        const stockEntry = product.stocks.find(
          (stock) => stock.stockId.toString() === stockId.toString()
        );
        if (stockEntry) {
          stockEntry.productQuantity += item.quantity;
          product.sold -= item.quantity;
          await product.save();
          createProductMovement(
            item.product,
            stockEntry.productQuantity,
            item.quantity,
            "in",
            "cancel",
            dbName
          );
        }
      }
    });

    const order = await orderFishModel.updateOne(
      { _id: id },
      {
        type: "cancel",
        paidAt: currentDateTime.toISOString(),
        counter: "cancel " + canceled.counter,
      },
      { new: true }
    );
    await ReportsSalesModel.findOneAndUpdate(
      { orderId: id },
      {
        counter: "Cancel " + canceled.counter,
        type: "cancel",
      },
      { new: true }
    );
    createInvoiceHistory(dbName, id, "cancel", req.user._id);
    res.status(200).json({
      status: "success",
      message: "The order has been canceled",
      data: order,
    });
  } else {
    res.status(400).json({
      status: "faild",
      message: "The type is cancel",
    });
  }
});
