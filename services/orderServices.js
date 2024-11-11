const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const mongoose = require("mongoose");
const { default: slugify } = require("slugify");
const cron = require("node-cron");

const productSchema = require("../models/productModel");
const orderSchema = require("../models/orderModel");
const roleModel = require("../models/roleModel");
const { getDashboardRoles } = require("./roleDashboardServices");
const financialFundsSchema = require("../models/financialFundsModel");
const reportsFinancialFundsSchema = require("../models/reportsFinancialFunds");
const emoloyeeShcema = require("../models/employeeModel");
const ReportsSalesSchema = require("../models/reportsSalesModel");
const returnOrderSchema = require("../models/returnOrderModel");
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
const { createPaymentHistory } = require("./paymentHistoryService");
const paymentTypesSchema = require("../models/paymentTypesModel");
const expensesSchema = require("../models/expensesModel");
const orderFishSchema = require("../models/orderModelFish");
const { default: axios } = require("axios");
const stockSchema = require("../models/stockModel");
const refundPosSalesSchema = require("../models/refundPosSales");
const PaymentSchema = require("../models/paymentModel");
const PaymentHistorySchema = require("../models/paymentHistoryModel");

// @desc    Create cash order from the dashboard
// @route   POST /api/salesDashbord
// @access  privet
exports.DashBordSalseOld = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const orderModel = db.model("Orders", orderSchema);
  const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
  const ReportsFinancialFundsModel = db.model(
    "ReportsFinancialFunds",
    reportsFinancialFundsSchema
  );
  const ReportsSalesModel = db.model("ReportsSales", ReportsSalesSchema);
  const productModel = db.model("Product", productSchema);
  const customersModel = db.model("Customar", customarSchema);
  const ActiveProductsValue = db.model(
    "ActiveProductsValue",
    ActiveProductsValueModel
  );
  const expensesModel = db.model("Expenses", expensesSchema);
  db.model("PaymentType", paymentTypesSchema);
  db.model("Stock", stockSchema);
  db.model("Currency", currencySchema);
  const paymentModel = db.model("Payment", PaymentSchema);

  const nextCounterPayment = (await paymentModel.countDocuments()) + 1;
  const cartItems = req.body.cartItems;
  const stocks = req.body.stocks;

  function padZero(value) {
    return value < 10 ? `0${value}` : value;
  }

  const ts = Date.now();
  const date_ob = new Date(ts);
  const formattedDate = `${date_ob.getFullYear()}-${padZero(
    date_ob.getMonth() + 1
  )}-${padZero(date_ob.getDate())} ${padZero(date_ob.getHours())}:${padZero(
    date_ob.getMinutes()
  )}:${padZero(date_ob.getSeconds())}:${padZero(date_ob.getMilliseconds())}`;

  if (!cartItems || cartItems.length === 0) {
    return next(new ApiError("The cart is empty", 400));
  }

  const {
    paid,
    totalOrderPrice,
    financialFunds: financialFundsId,
    exchangeRate,
    customarId,
    description,
    date,
    shippingPrice,
  } = req.body;
  const timeIsoString = new Date().toISOString();

  const customarsPromise = customersModel.findById(customarId);
  const nextCounterOrder = orderModel
    .countDocuments()
    .then((count) => count + 1);
  const nextCounterReports = ReportsSalesModel.countDocuments().then(
    (count) => count + 1
  );

  let financialFunds;
  if (paid === "paid") {
    financialFunds = await FinancialFundsModel.findById(
      financialFundsId
    ).populate({ path: "fundPaymentType fundCurrency" });
    if (!financialFunds) {
      return next(
        new ApiError(
          `There is no such financial funds with id ${financialFundsId}`,
          404
        )
      );
    }
    financialFunds.fundBalance += req.body.totalPriceExchangeRate;
  }
  const [customars, nextCounter, reportCounter] = await Promise.all([
    customarsPromise,
    nextCounterOrder,
    nextCounterReports,
  ]);

  let order;
  if (paid === "paid") {
    order = await orderModel.create({
      employee: req.user._id,
      totalPriceExchangeRate: req.body.priceExchangeRate,
      cartItems,
      returnCartItem: cartItems,
      currencyCode: req.body.currency,
      totalOrderPrice,
      totalPriceAfterDiscount: req.body.totalPriceAfterDiscount,
      taxs: req.body.taxs,
      price: req.body.price,
      taxRate: req.body.taxRate,
      customarId: customarId,
      customarName: req.body.customarName,
      customarEmail: req.body.customarEmail,
      customarPhone: req.body.customarPhone,
      customarAddress: req.body.customarAddress,
      coupon: req.body.coupon,
      couponCount: req.body.couponCount,
      couponType: req.body.couponType,
      type: req.body.type,
      onefinancialFunds: financialFundsId,
      date: formattedDate,
      counter: "in-" + nextCounter,
      exchangeRate: exchangeRate,
      paid: paid,
      description,
      shippingPrice,
      date: date || formattedDate,
      currencyId: req.body.currencyId,
    });

    const reportsFinancialFundsPromise = ReportsFinancialFundsModel.create({
      date: timeIsoString,
      amount: req.body.totalPriceExchangeRate,
      exchangeAmount: totalOrderPrice,
      order: order._id,
      type: "sales",
      financialFundId: financialFundsId,
      financialFundRest: financialFunds.fundBalance,
      exchangeRate: exchangeRate,
    });

    const financialFundsSavePromise = financialFunds.save();
    const createExpensePromise =
      financialFunds.fundPaymentType.haveRatio === "true"
        ? (async () => {
            const nextExpenseCounter =
              (await expensesModel.countDocuments()) + 1;
            const expenseQuantityAfterKdv =
              (totalOrderPrice / exchangeRate) *
                (financialFunds.bankRatio / 100) ||
              req.body.priceExchangeRate * (financialFunds.bankRatio / 100);
            const updatedFundBalance =
              financialFunds.fundBalance - expenseQuantityAfterKdv;
            financialFunds.fundBalance = updatedFundBalance;
            const expensee = await expensesModel.create({
              ...req.body,
              expenseQuantityAfterKdv,
              expenseQuantityBeforeKdv: expenseQuantityAfterKdv,
              expenseCategory: financialFunds.fundPaymentType.expenseCategory,
              counter: nextExpenseCounter,
              expenseDate: formattedDate,
              expenseFinancialFund: financialFunds.fundName,
              expenseTax: "0",
              type: "paid",
            });
            await ReportsFinancialFundsModel.create({
              date: formattedDate,
              amount: expenseQuantityAfterKdv,

              order: expensee._id,
              type: "expense",
              financialFundId: financialFundsId,
              financialFundRest: updatedFundBalance,
              exchangeRate: expenseQuantityAfterKdv,
            });
          })()
        : Promise.resolve();
    await Promise.all([
      reportsFinancialFundsPromise,
      financialFundsSavePromise,
      createExpensePromise,
    ]);
    order.payments.push({
      payment: req.body.totalPriceExchangeRate,
      paymentMainCurrency: totalOrderPrice,
      financialFunds: financialFunds.fundName,
      financialFundsCurrencyCode: req.body.invoiceFinancialFundCurrencyCode,
      date: date || formattedDate,
    });
    await paymentModel.create({
      customarId: customarId,
      customarName: req.body.customarName,
      total: req.body.totalPriceExchangeRate,
      totalMainCurrency: totalOrderPrice,
      exchangeRate: financialFunds.fundCurrency.exchangeRate,
      currencyCode: financialFunds.fundCurrency.currencyCode,
      date: date || formattedDate,
      invoiceNumber: "in-" + nextCounter,
      counter: nextCounterPayment,
    });
    customars.total += totalOrderPrice;
    await order.save();
  } else {
    customars.total += totalOrderPrice;

    let total = totalOrderPrice;
    if (customars.TotalUnpaid <= -1) {
      const t = total + customars.TotalUnpaid;
      if (t > 0) {
        total = t;
        customars.TotalUnpaid = t;
      } else if (t < 0) {
        customars.TotalUnpaid = t;
        req.body.paid = "paid";
      } else {
        total = 0;
        customars.TotalUnpaid = 0;
        req.body.paid = "paid";
      }
    } else {
      customars.TotalUnpaid += total;
    }

    order = await orderModel.create({
      employee: req.user._id,
      totalPriceExchangeRate: req.body.priceExchangeRate,
      cartItems,
      returnCartItem: cartItems,
      stocks: stocks,
      currencyCode: req.body.currency,
      totalOrderPrice,
      totalPriceAfterDiscount: req.body.totalPriceAfterDiscount,
      price: req.body.price,
      taxRate: req.body.taxRate,
      customarId: customarId,
      customarName: req.body.customarName,
      customarEmail: req.body.customarEmail,
      customarPhone: req.body.customarPhone,
      customarAddress: req.body.customarAddress,
      coupon: req.body.coupon,
      couponCount: req.body.couponCount,
      couponType: req.body.couponType,
      type: req.body.type,
      onefinancialFunds: financialFundsId,
      date: formattedDate,
      counter: "in-" + nextCounter,
      exchangeRate: exchangeRate,
      paid: req.body.paid,
      totalRemainder: req.body.priceExchangeRate,
      totalRemainderMainCurrency: total,
      currencyId: req.body.currencyId,
      date: date || formattedDate,
    });
  }

  const bulkOption = cartItems
    .filter((item) => item.type !== "Service")
    .map((item) => ({
      updateOne: {
        filter: { _id: item._id || item.product },
        update: {
          $inc: {
            quantity: -item.quantity,
            sold: +item.quantity,
            activeCount: -item.quantity,
          },
        },
      },
    }));

  const bulkWritePromise = await productModel.bulkWrite(bulkOption);

  const bulkOptionst2 = await Promise.all(
    cartItems
      .filter((item) => item.product && item.quantity)
      .map(async (item) => {
        const product = await productModel.findById(item.product);
        if (product) {
          return stocks
            .filter((stock) => stock.product === item.product)
            .map((stock) => ({
              updateOne: {
                filter: { _id: product._id, "stocks.stockId": stock.stockId },
                update: {
                  $inc: {
                    "stocks.$.productQuantity": -item.quantity,
                  },
                },
              },
            }));
        }
      })
  );

  // Flatten the array of arrays and filter out any undefined values
  const bulkOptionst2Flat = bulkOptionst2.flat().filter(Boolean);

  if (bulkOptionst2Flat.length > 0) {
    await productModel.bulkWrite(bulkOptionst2Flat);
  }

  const reportsSalesPromise = ReportsSalesModel.create({
    customer: req.body.customarName,
    orderId: order._id,
    date: timeIsoString,
    fund: financialFundsId,
    amount: totalOrderPrice,
    cartItems: cartItems,
    counter: reportCounter,
    paymentType: "Single Fund",
    employee: req.user._id,
  });

  const productMovementPromises = cartItems.map(async (item) => {
    const product = await productModel.findOne({ qr: item.qr });

    if (product && product.type !== "Service") {
      await createProductMovement(
        item.product,
        product.quantity,
        item.quantity,
        "out",
        "sales",
        dbName
      );
    }
  });

  const activeProductsValueUpdates = cartItems.map(async (item) => {
    const product = await productModel.findOne({ qr: item.qr });
    if (product && product.type !== "Service") {
      const existingRecord = await ActiveProductsValue.findOne({
        currency: product.currency._id,
      });
      if (existingRecord) {
        existingRecord.activeProductsCount -= item.quantity;
        existingRecord.activeProductsValue -= item.buyingPrice * item.quantity;
        await existingRecord.save();
      } else {
        await createActiveProductsValue(0, 0, product.currency._id, dbName);
      }
    }
  });

  await Promise.all([
    bulkWritePromise,
    reportsSalesPromise,
    ...productMovementPromises,
    ...activeProductsValueUpdates,
  ]);
  await customars.save();

  const history = createInvoiceHistory(
    dbName,
    order._id,
    "create",
    req.user._id,
    formattedDate
  );
  await createPaymentHistory(
    "invoice",
    date || formattedDate,
    totalOrderPrice,
    customars.TotalUnpaid,
    "customer",
    customarId,
    "in-" + nextCounter,
    dbName
  );
  if (paid === "paid") {
    await createPaymentHistory(
      "payment",
      date || formattedDate,
      totalOrderPrice,
      customars.TotalUnpaid,
      "customer",
      customarId,
      order.counter,
      dbName,
      description,
      nextCounterPayment
    );
  }
  res.status(201).json({ status: "success", data: order, history });
});

exports.filterOrderForLoggedUser = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  db.model("Employee", emoloyeeShcema);
  db.model("Product", productSchema);
  db.model("FinancialFunds", financialFundsSchema);
  db.model("ReportsFinancialFunds", reportsFinancialFundsSchema);
  const roles = await roleModel.findById(req.user.selectedRoles[0]);
  const dashboardRolesIds = roles.rolesDashboard;
  let dashRoleName = await getDashboardRoles(dashboardRolesIds);

  let allUserRoles = [...dashRoleName];

  if (req.user.role === "discount") {
    req.filterObj = { user: req.user._id };
  }
  next();
});

exports.DashBordSalse = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const orderModel = db.model("Sales", orderSchema);
  const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
  const ReportsFinancialFundsModel = db.model(
    "ReportsFinancialFunds",
    reportsFinancialFundsSchema
  );
  const ReportsSalesModel = db.model("ReportsSales", ReportsSalesSchema);
  const productModel = db.model("Product", productSchema);
  const customersModel = db.model("Customar", customarSchema);
  const ActiveProductsValue = db.model(
    "ActiveProductsValue",
    ActiveProductsValueModel
  );
  const expensesModel = db.model("Expenses", expensesSchema);
  db.model("PaymentType", paymentTypesSchema);
  db.model("Stock", stockSchema);
  db.model("Currency", currencySchema);
  const paymentModel = db.model("Payment", PaymentSchema);

  const nextCounterPayment = (await paymentModel.countDocuments()) + 1;
  const cartItems = req.body.invoicesItems;

  function padZero(value) {
    return value < 10 ? `0${value}` : value;
  }

  const ts = Date.now();
  const date_ob = new Date(ts);
  const formattedDate = `${date_ob.getFullYear()}-${padZero(
    date_ob.getMonth() + 1
  )}-${padZero(date_ob.getDate())} ${padZero(date_ob.getHours())}:${padZero(
    date_ob.getMinutes()
  )}:${padZero(date_ob.getSeconds())}:${padZero(date_ob.getMilliseconds())}`;

  if (!cartItems || cartItems.length === 0) {
    return next(new ApiError("The cart is empty", 400));
  }

  const timeIsoString = new Date().toISOString();

  const customarsPromise = customersModel.findById(req.body.customer.id);
  const nextCounterOrder = orderModel
    .countDocuments()
    .then((count) => count + 1);
  const nextCounterReports = ReportsSalesModel.countDocuments().then(
    (count) => count + 1
  );
  req.body.counter = nextCounterReports;
  let financialFunds;
  if (req.body.paymentsStatus === "paid") {
    financialFunds = await FinancialFundsModel.findById(
      req.body.financailFund.value
    ).populate({ path: "fundPaymentType fundCurrency" });
    if (!financialFunds) {
      return next(
        new ApiError(
          `There is no such financial funds with id ${req.body.financailFund.value}`,
          404
        )
      );
    }
    financialFunds.fundBalance += req.body.paymentInFundCurrency;
  }
  const [customars, nextCounter, reportCounter] = await Promise.all([
    customarsPromise,
    nextCounterOrder,
    nextCounterReports,
  ]);

  let order;
  if (req.body.paymentsStatus === "paid") {
    order = await orderModel.create(req.body);

    const reportsFinancialFundsPromise = ReportsFinancialFundsModel.create({
      date: timeIsoString,
      amount: req.body.paymentInFundCurrency,
      exchangeAmount: req.body.totalInMainCurrency,
      order: order._id,
      type: "sales",
      financialFundId: req.body.financailFund.value,
      financialFundRest: financialFunds.fundBalance,
      exchangeRate: req.body.exchangeRate,
    });

    const financialFundsSavePromise = financialFunds.save();
    const createExpensePromise =
      financialFunds.fundPaymentType.haveRatio === "true"
        ? (async () => {
            const nextExpenseCounter =
              (await expensesModel.countDocuments()) + 1;
            const expenseQuantityAfterKdv =
              (totalOrderPrice / exchangeRate) *
                (financialFunds.bankRatio / 100) ||
              req.body.priceExchangeRate * (financialFunds.bankRatio / 100);
            const updatedFundBalance =
              financialFunds.fundBalance - expenseQuantityAfterKdv;
            financialFunds.fundBalance = updatedFundBalance;
            const expensee = await expensesModel.create({
              ...req.body,
              expenseQuantityAfterKdv,
              expenseQuantityBeforeKdv: expenseQuantityAfterKdv,
              expenseCategory: financialFunds.fundPaymentType.expenseCategory,
              counter: nextExpenseCounter,
              expenseDate: formattedDate,
              expenseFinancialFund: financialFunds.fundName,
              expenseTax: "0",
              type: "paid",
            });
            await ReportsFinancialFundsModel.create({
              date: formattedDate,
              amount: expenseQuantityAfterKdv,

              order: expensee._id,
              type: "expense",
              financialFundId: req.body.financailFund.value,
              financialFundRest: updatedFundBalance,
              exchangeRate: expenseQuantityAfterKdv,
            });
          })()
        : Promise.resolve();
    await Promise.all([
      reportsFinancialFundsPromise,
      financialFundsSavePromise,
      createExpensePromise,
    ]);
    order.payments.push({
      payment: req.body.totalPriceExchangeRate,
      paymentMainCurrency: req.body.totalInMainCurrency,
      financialFunds: financialFunds.fundName,
      financialFundsCurrencyCode: financialFunds.fundCurrency.currencyCode,
      date: req.body.date || formattedDate,
    });
    await paymentModel.create({
      customarId: req.body.customer.id,
      customarName: req.body.customer.name,
      total: req.body.totalPriceExchangeRate,
      totalMainCurrency: req.body.totalInMainCurrency,
      exchangeRate: financialFunds.fundCurrency.exchangeRate,
      currencyCode: financialFunds.fundCurrency.currencyCode,
      date: req.body.date || formattedDate,
      invoiceNumber: "in-" + nextCounter,
      counter: nextCounterPayment,
    });
    customars.total += Number(req.body.totalInMainCurrency);
    await order.save();
  } else {
    let total = Number(req.body.totalInMainCurrency);
    customars.total += total;
    if (customars.TotalUnpaid <= -1) {
      const t = Number(total) + Number(customars.TotalUnpaid);
      if (t > 0) {
        total = t;
        customars.TotalUnpaid = Number(t);
      } else if (t < 0) {
        customars.TotalUnpaid = t;
        req.body.paid = "paid";
      } else {
        total = 0;
        customars.TotalUnpaid = 0;
        req.body.paid = "paid";
      }
    } else {
      customars.TotalUnpaid += total;
    }

    order = await orderModel.create(req.body);
  }
  const productQRCodes = cartItems.map((item) => item.qr);
  const products = await productModel.find({
    qr: { $in: productQRCodes },
  });
  const productMap = new Map(products.map((prod) => [prod.qr, prod]));

  const bulkOption = cartItems
    .filter((item) => item.type !== "Service")
    .map((item) => {
      const product = productMap.get(item.qr);
      const totalStockQuantity = product.stocks.reduce(
        (total, stock) => total + stock.productQuantity,
        0
      );
      createProductMovement(
        item.product,
        totalStockQuantity,
        item.soldQuantity,
        "out",
        "sales",
        dbName
      );

      return {
        updateOne: {
          filter: {
            qr: item.qr,
            "stocks.stockId": item.stock._id,
          },
          update: {
            $inc: {
              quantity: -item.soldQuantity,
              "stocks.$.productQuantity": -item.soldQuantity,
            },
          },
        },
      };
    });

  await productModel.bulkWrite(bulkOption);

  // Flatten the array of arrays and filter out any undefined values
  // const bulkOptionst2Flat = bulkOptionst2.flat().filter(Boolean);

  // if (bulkOptionst2Flat.length > 0) {
  //   await productModel.bulkWrite(bulkOptionst2Flat);
  // }

  const reportsSalesPromise = ReportsSalesModel.create({
    customer: req.body.customer.name,
    orderId: order._id,
    date: timeIsoString,
    amount: req.body.totalInMainCurrency,
    cartItems: cartItems,
    counter: reportCounter,
    paymentType: "Single Fund",
    employee: req.user._id,
  });

  const productMovementPromises = cartItems.map(async (item) => {
    const product = await productModel.findOne({ qr: item.qr });

    if (product && product.type !== "Service") {
      await createProductMovement(
        item.product,
        product.quantity,
        item.quantity,
        "out",
        "sales",
        dbName
      );
    }
  });

  const activeProductsValueUpdates = cartItems.map(async (item) => {
    const product = await productModel.findOne({ qr: item.qr });
    if (product && product.type !== "Service") {
      const existingRecord = await ActiveProductsValue.findOne({
        currency: product.currency._id,
      });
      if (existingRecord) {
        existingRecord.activeProductsCount -= item.soldQuantity;
        existingRecord.activeProductsValue -=
          item.orginalBuyingPrice * item.soldQuantity;
        await existingRecord.save();
      } else {
        await createActiveProductsValue(0, 0, product.currency._id, dbName);
      }
    }
  });

  await Promise.all([
    reportsSalesPromise,
    ...productMovementPromises,
    ...activeProductsValueUpdates,
  ]);
  await customars.save();

  const history = createInvoiceHistory(
    dbName,
    order._id,
    "create",
    req.user._id,
    formattedDate
  );
  await createPaymentHistory(
    "invoice",
    req.body.date || formattedDate,
    req.body.totalInMainCurrency,
    customars.TotalUnpaid,
    "customer",
    req.body.customer.id,
    "in-" + nextCounter,
    dbName
  );
  if (req.body.paymentsStatus === "paid") {
    await createPaymentHistory(
      "payment",
      req.body.date || formattedDate,
      req.body.totalInMainCurrency,
      customars.TotalUnpaid,
      "customer",
      req.body.customer.namide,
      order.counter,
      dbName,
      req.body.paymentDescription,
      nextCounterPayment
    );
  }
  res.status(201).json({ status: "success", data: order, history });
});

// @desc    Get All order
// @route   GET /api/orders/cartId
// @access  privet/All
exports.findAllOrder = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const orderModel = db.model("Sales", orderSchema);
  db.model("Employee", emoloyeeShcema);
  db.model("Product", productSchema);
  db.model("FinancialFunds", financialFundsSchema);
  db.model("ReportsFinancialFunds", reportsFinancialFundsSchema);

  const pageSize = 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;

  // Initialize the base query to exclude type "pos"
  let query = {
    type: { $ne: "openBalance" },
  };
  // Add keyword filter if provided
  if (req.query.keyword) {
    query.$or = [{ counter: { $regex: req.query.keyword, $options: "i" } }];
  }

  let mongooseQuery = orderModel.find(query);

  // Apply sorting
  mongooseQuery = mongooseQuery.sort({ createdAt: -1 });

  // Count total items without pagination
  const totalItems = await orderModel.countDocuments(query);

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

exports.findOneOrder = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  db.model("Employee", emoloyeeShcema);
  db.model("Product", productSchema);
  db.model("FinancialFunds", financialFundsSchema);
  db.model("ReportsFinancialFunds", reportsFinancialFundsSchema);
  const orderModel = db.model("Sales", orderSchema);

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

  const order = await orderModel.findOne(query).populate({
    path: "onefinancialFunds",
    select: "fundName",
  });

  if (!order) {
    return next(new ApiError(`No order found for this id ${id}`, 404));
  }

  res.status(200).json({ status: "true", data: order });
});

exports.editOrderInvoice = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  db.model("Employee", emoloyeeShcema);
  db.model("Product", productSchema);
  const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
  db.model("ReportsFinancialFunds", reportsFinancialFundsSchema);
  const productModel = db.model("Product", productSchema);
  const orderModel = db.model("Sales", orderSchema);
  const ReportsSalesModel = db.model("ReportsSales", ReportsSalesSchema);
  const ReportsFinancialFundsModel = db.model(
    "ReportsFinancialFunds",
    reportsFinancialFundsSchema
  );
  const paymentModel = db.model("Payment", PaymentSchema);
  const ActiveProductsValue = db.model(
    "ActiveProductsValue",
    ActiveProductsValueModel
  );
  const customersModel = db.model("Customar", customarSchema);
  const PaymentHistoryModel = db.model("PaymentHistory", PaymentHistorySchema);
  const nextCounterPayment = (await paymentModel.countDocuments()) + 1;

  db.model("Currency", currencySchema);
  db.model("Variant", variantSchema);
  const { id } = req.params;

  const {
    cartItems,
    customarName,
    customarEmail,
    customarPhone,
    customarAddress,
    customarId,
    currencyId,
    currencyCode,
    onefinancialFunds,
    exchangeRate,
    priceExchangeRate,
    totalOrderPrice,
    paid,
    description,
    date,
    fundPriceExchangeRate,
    totalPriceBefor,
  } = req.body;

  const orders = await orderModel.findById(id);

  const getFormattedDate = () => {
    const padZero = (num) => String(num).padStart(2, "0");
    const ts = Date.now();
    const dateOb = new Date(ts);
    const date = padZero(dateOb.getDate());
    const month = padZero(dateOb.getMonth() + 1);
    const year = dateOb.getFullYear();
    const hours = padZero(dateOb.getHours());
    const minutes = padZero(dateOb.getMinutes());
    const seconds = padZero(dateOb.getSeconds());
    return `${year}-${month}-${date} ${hours}:${minutes}:${seconds}`;
  };

  const formattedDate = getFormattedDate();
  const originalItems = orders.cartItems;
  const updatedItems = req.body.cartItems;

  //change the items
  cartItems.map(async (item) => {
    const product = await productModel.findOne({ qr: item.qr });
    if (product && product.type !== "Service") {
      const existingRecord = await ActiveProductsValue.findOne({
        currency: product.currency._id,
      });
      if (existingRecord) {
        existingRecord.activeProductsCount -=
          item.quantity - item.quantityBefor;
        existingRecord.activeProductsValue -=
          item.buyingPrice * item.quantity -
          item.buyingPriceBefor * item.quantityBefor;
        await existingRecord.save();
      } else {
        await createActiveProductsValue(0, 0, product.currency._id, dbName);
      }

      // Create product movement for each item
      // createProductMovement(
      //   product._id,
      //   product.quantity,
      //   item.quantity,
      //   "in",
      //   "purchase",
      //   dbName
      // );
    }
  });

  // Prepare bulk updates for products and stocks
  const bulkProductUpdatesOriginal = originalItems.map((item) => ({
    updateOne: {
      filter: { qr: item.qr },
      update: {
        $inc: { quantity: +item.quantity, activeCount: +item.quantity },
      },
    },
  }));

  const bulkProductUpdatesNew = updatedItems.map((item) => ({
    updateOne: {
      filter: { qr: item.qr },
      update: {
        $inc: { quantity: -item.quantity, activeCount: -item.quantity },
      },
    },
  }));

  const bulkStockUpdates = [
    ...originalItems.map((item) => ({
      updateOne: {
        filter: { qr: item.qr, "stocks.stockId": item.stockId },
        update: { $inc: { "stocks.$.productQuantity": +item.quantity } },
      },
    })),
    ...updatedItems.map((item) => ({
      updateOne: {
        filter: { qr: item.qr, "stocks.stockId": item.stockId },
        update: { $inc: { "stocks.$.productQuantity": -item.quantity } },
      },
    })),
  ];

  // Perform bulk writes
  try {
    await Promise.all([
      productModel.bulkWrite(bulkProductUpdatesOriginal),
      productModel.bulkWrite(bulkProductUpdatesNew),
      productModel.bulkWrite(bulkStockUpdates),
    ]);
  } catch (error) {
    console.error("Error during bulk updates:", error);
    return next(new ApiError("Bulk update failed" + error, 500));
  }

  let newOrderInvoice;
  //

  const orderCustomer = await customersModel.findById(orders.customarId);

  const customers = await customersModel.findById(customarId);
  let newInvoiceData;
  if (paid === "paid") {
    const financialFund = await FinancialFundsModel.findById(onefinancialFunds);
    financialFund.fundBalance += fundPriceExchangeRate;
    newInvoiceData = {
      employee: req.user._id,
      cartItems: cartItems,
      returnCartItem: cartItems,
      date: date || formattedDate,
      customarId: customarId,
      customarName: customarName,
      customarEmail: customarEmail,
      customarPhone: customarPhone,
      customarAddress: customarAddress,
      currencyCode,
      exchangeRate,
      totalPriceExchangeRate: priceExchangeRate,
      onefinancialFunds,
      totalOrderPrice: totalOrderPrice,
      paid: "paid",
      description,
      currencyId,
      shippingPrice: req.body.shippingPrice,
      payments: [],
    };
    newOrderInvoice = await orderModel.findByIdAndUpdate(id, newInvoiceData, {
      new: true,
    });
    newInvoiceData.payments.push({
      payment: totalOrderPrice,
      paymentMainCurrency: fundPriceExchangeRate,
      financialFunds: financialFund.fundName,
      financialFundsCurrencyCode: req.body.invoiceFinancialFundCurrencyCode,
      date: date || formattedDate,
    });

    const reports = await ReportsFinancialFundsModel.create({
      date: date || formattedDate,
      invoice: newOrderInvoice._id,
      amount: fundPriceExchangeRate,
      type: "sales",
      exchangeRate: exchangeRate,
      exchangeAmount: priceExchangeRate,
      financialFundId: onefinancialFunds,
      financialFundRest: financialFund.fundBalance,
    });
    newOrderInvoice.reportsBalanceId = reports.id;
    await newOrderInvoice.save();
    if (customarId === orders.customarId) {
      customers.total += totalOrderPrice - totalPriceBefor;
    } else {
      orderCustomer.total -= totalPriceBefor;
      await orderCustomer.save();
      customers.total += totalOrderPrice;
    }
    await customers.save();
  } else {
    if (customarId === orders.customarId) {
      const test = totalOrderPrice - totalPriceBefor;
      console.log(test);
      customers.TotalUnpaid += test;
      customers.total += test;
    } else {
      orderCustomer.total -= totalPriceBefor;
      orderCustomer.TotalUnpaid -= totalPriceBefor;
      await orderCustomer.save();
      customers.total += totalOrderPrice;
      customers.TotalUnpaid += totalOrderPrice;
    }
    await customers.save();

    newInvoiceData = {
      employee: req.user._id,
      cartItems: cartItems,
      returnCartItem: cartItems,
      date: date || formattedDate,
      customarId: customarId,
      customarName: customarName,
      customarEmail: customarEmail,
      customarPhone: customarPhone,
      customarAddress: customarAddress,
      currencyCode,
      exchangeRate,
      totalPriceExchangeRate: priceExchangeRate,
      totalRemainder: priceExchangeRate,
      totalOrderPrice: totalOrderPrice,
      totalRemainderMainCurrency: totalOrderPrice,
      paid: "unpaid",
      description,
      currencyId,
      shippingPrice: req.body.shippingPrice,
    };
  }

  newOrderInvoice = await orderModel.updateOne({ _id: id }, newInvoiceData, {
    new: true,
  });
  const salesReports = await ReportsSalesModel.findOneAndDelete({
    orderId: id,
  });
  await ReportsSalesModel.create({
    customer: customarName,
    orderId: id,
    date: date.toString() || formattedDate.toString(),
    fund: onefinancialFunds,
    amount: totalOrderPrice,
    cartItems: cartItems,
    counter: salesReports.counter.toString(),
    paymentType: "Single Fund",
    employee: req.user._id,
  });
  await PaymentHistoryModel.deleteMany({
    invoiceNumber: orders.counter,
  });
  await createPaymentHistory(
    "invoice",
    date || formattedDate,
    totalOrderPrice,
    customers.TotalUnpaid,
    "customer",
    customarId,
    orders.counter,
    dbName
  );
  if (paid === "paid") {
    await createPaymentHistory(
      "payment",
      date || formattedDate,
      totalOrderPrice,
      customers.TotalUnpaid,
      "customer",
      customarId,
      orders.counter,
      dbName,
      description,
      nextCounterPayment
    );
  }

  const history = createInvoiceHistory(dbName, id, "edit", req.user._id);
  res.status(200).json({
    status: "true",
    message: "Order updated successfully",
    data: orders,
    history,
  });
});

exports.returnOrder = asyncHandler(async (req, res, next) => {
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
    Order: db.model("Sales", orderSchema),
    FinancialFunds: db.model("FinancialFunds", financialFundsSchema),
    ReturnOrder: db.model("returnOrder", returnOrderSchema),
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
  const orders = await models.Order.findById(orderId);

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
        update: {
          $inc: { quantity: +item.quantity, activeCount: +item.quantity },
        },
      },
    }));

    await models.Product.bulkWrite(bulkUpdateOptions);
    await models.ReturnOrder.bulkWrite(bulkUpdateOptions);
    const bulkUpdates = req.body.cartItems.map(
      (item) => (
        console.log(item),
        {
          updateOne: {
            filter: { qr: item.qr, "stocks.stockId": item.stockId },
            update: {
              $inc: {
                "stocks.$.productQuantity": +item.quantity,
              },
            },
          },
        }
      )
    );

    await models.Product.bulkWrite(bulkUpdates);

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

    await models.Order.bulkWrite(returnCartItemUpdates);

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
      const bulkUpdates = req.body.cartItems.map(
        (item) => (
          console.log(item),
          {
            updateOne: {
              filter: { qr: item.qr, "stocks.stockId": item.stockId },
              update: {
                $inc: {
                  "stocks.$.productQuantity": +item.quantity,
                },
              },
            },
          }
        )
      );

      await models.Product.bulkWrite(bulkUpdates);

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

      await models.Order.bulkWrite(returnCartItemUpdates);

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
exports.getReturnOrder = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  db.model("Employee", emoloyeeShcema);
  db.model("FinancialFunds", financialFundsSchema);
  db.model("ReportsFinancialFunds", reportsFinancialFundsSchema);
  db.model("Product", productSchema);
  const returnOrderModel = db.model("returnOrder", returnOrderSchema);
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
exports.getOneReturnOrder = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  db.model("Employee", emoloyeeShcema);
  db.model("FinancialFunds", financialFundsSchema);
  db.model("ReportsFinancialFunds", reportsFinancialFundsSchema);
  db.model("Product", productSchema);
  const returnOrderModel = db.model("returnOrder", returnOrderSchema);
  db.model("ReportsSales", ReportsSalesSchema);

  const { id } = req.params;
  const order = await returnOrderModel.findById(id);
  if (!order) {
    return next(new ApiError(`No order for this id ${id}`, 404));
  }
  res.status(200).json({ status: "true", data: order });
});

exports.canceledOrder = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const orderModel = db.model("Orders", orderSchema);
  const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
  const ReportsFinancialFundsModel = db.model(
    "ReportsFinancialFunds",
    reportsFinancialFundsSchema
  );
  const ReportsSalesModel = db.model("ReportsSales", ReportsSalesSchema);
  db.model("Employee", emoloyeeShcema);
  const productModel = db.model("Product", productSchema);
  const customersModel = db.model("Customar", customarSchema);
  const PaymentHistoryModel = db.model("PaymentHistory", PaymentHistorySchema);
  const ActiveProductsValue = db.model(
    "ActiveProductsValue",
    ActiveProductsValueModel
  );
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

  const canceled = await orderModel.findByIdAndUpdate(id, {
    type: "cancel",
    totalRemainderMainCurrency: 0,
    totalRemainder: 0,
  });
  if (canceled.payments.length <= 0 && canceled.type !== "cancel") {
    const bulkProductCancel = canceled.cartItems.map((item) => ({
      updateOne: {
        filter: { qr: item.qr, "stocks.stockId": item.stockId },
        update: {
          $inc: {
            quantity: +item.quantity,
            activeCount: +item.quantity,
            "stocks.$.productQuantity": +item.quantity,
          },
        },
      },
    }));
    try {
      await productModel.bulkWrite(bulkProductCancel);
    } catch (error) {
      console.error("Error during bulk updates:", error);
      return next(new ApiError("Bulk update failed" + error, 500));
    }

    canceled.cartItems.map(async (item) => {
      const product = await productModel.findOne({ qr: item.qr });
      if (product && product.type !== "Service") {
        const existingRecord = await ActiveProductsValue.findOne({
          currency: product.currency._id,
        });
        if (existingRecord) {
          existingRecord.activeProductsCount += item.quantity;
          existingRecord.activeProductsValue +=
            item.buyingPrice * item.quantity;
          await existingRecord.save();
        } else {
          await createActiveProductsValue(0, 0, product.currency._id, dbName);
        }
      }
    });
    const fundReports = await ReportsFinancialFundsModel.findOneAndDelete({
      order: id,
    });
    let total = 0;
    for (let index = 0; index < canceled.payments.length; index++) {
      const fund = await FinancialFundsModel.findOneAndUpdate(
        {
          fundName: canceled.payments[index].financialFunds,
        },
        { $inc: { fundBalance: +canceled.payments[index].payment } }
      );
      total += canceled.payments[index].paymentMainCurrency;
    }
    await PaymentHistoryModel.deleteMany({
      invoiceNumber: canceled.counter,
    });
    await customersModel.findByIdAndUpdate(canceled.customarId, {
      $inc: {
        TotalUnpaid: -canceled.totalOrderPrice,
        total: -canceled.totalOrderPrice,
      },
    });
    const history = createInvoiceHistory(dbName, id, "cancel", req.user._id);
    res.status(200).json({
      status: "true",
      message: "Order Canceled successfully",
    });
  } else {
    return next(
      new ApiError("Have a Payment pless delete the Payment or Canceled ", 500)
    );
  }
});

// @desc    Post Marge Salse invoice
// @route   GET /api/margeorder
// @access  privet
const margeOrderFish = asyncHandler(async (databaseName) => {
  const db = mongoose.connection.useDb(databaseName);
  db.model("Employee", emoloyeeShcema);
  db.model("FinancialFunds", financialFundsSchema);
  db.model("ReportsFinancialFunds", reportsFinancialFundsSchema);
  db.model("Product", productSchema);
  db.model("ReportsSales", ReportsSalesSchema);
  const orderModel = db.model("Orders", orderSchema);
  const salsePos = db.model("orderFishPos", orderFishSchema);

  function padZero(value) {
    return value < 10 ? `0${value}` : value;
  }
  let ts = Date.now();
  let date_ob = new Date(ts);
  let date = padZero(date_ob.getDate());
  let month = padZero(date_ob.getMonth() + 1);
  let year = date_ob.getFullYear();
  let hours = padZero(date_ob.getHours());
  let minutes = padZero(date_ob.getMinutes());
  let seconds = padZero(date_ob.getSeconds());

  const formattedDate =
    year +
    "-" +
    month +
    "-" +
    date +
    " " +
    hours +
    ":" +
    minutes +
    ":" +
    seconds;
  const specificDate = new Date();
  const specificDateString = specificDate.toISOString().split("T")[0];

  // Find orders where paidAt matches the specified date and type is 'pos'
  const orders = await salsePos.find({
    paidAt: {
      $gte: specificDateString,
    },
    type: "pos",
  });
  const cartItems = [];
  const fish = [];
  let totalOrderPrice = 0;

  const financialFundsMap = new Map();

  for (const order of orders) {
    order.cartItems.forEach((item) => {
      cartItems.push(item);
      fish.push(order.counter);
      totalOrderPrice += item.taxPrice * item.quantity;
    });
    await order.financialFunds?.forEach((fund) => {
      const fundId = fund.fundId.toString();

      if (financialFundsMap.has(fundId)) {
        financialFundsMap.get(fundId).allocatedAmount += fund.allocatedAmount;
      } else {
        financialFundsMap.set(fundId, {
          fundId: fund?.fundId,
          allocatedAmount: fund?.allocatedAmount || 0,
          exchangeRate: fund?.exchangeRate,
          exchangeRateIcon: fund?.exchangeRateIcon,
          fundName: fund?.fundName,
        });
      }
    });

    if (order.onefinancialFunds) {
      const fundId = order.onefinancialFunds.toString();
      if (financialFundsMap.has(fundId)) {
        financialFundsMap.get(fundId).allocatedAmount +=
          order.priceExchangeRate;
      } else {
        financialFundsMap.set(fundId, {
          fundId: fundId,
          allocatedAmount: order.priceExchangeRate || 0,
        });
      }
    }
  }
  // Convert the map of financial funds to an array
  const aggregatedFunds = Array.from(financialFundsMap.values());

  const nextCounter = (await orderModel.countDocuments()) + 1;

  const newOrderData = {
    cartItems: cartItems,
    totalPriceExchangeRate: totalOrderPrice,
    date: formattedDate,
    type: "bills",
    totalOrderPrice: totalOrderPrice,
    counter: "in " + nextCounter,
    paid: "paid",
    exchangeRate: 1,
    fish: fish,
    financialFunds: aggregatedFunds,
  };

  const newOrders = await orderModel.insertMany(newOrderData);
});

const fetchAllSubscriberDatabases = async () => {
  try {
    console.log("Fetching subscriber databases...");

    // Make a request to get all subscriber databases
    const response = await axios.get(
      "https://api2.smartinb.ai:4001/api/subscribers"
    );

    if (response.data.status === "success") {
      const subscriberDatabases = response.data.data.map((user) => user.dbName);
      return subscriberDatabases;
    } else {
      throw new Error("Failed to fetch subscriber databases.");
    }
  } catch (error) {
    console.error("Error fetching subscriber databases:", error);
    return [];
  }
};

const margeOrderRefundFish = asyncHandler(async (databaseName) => {
  const db = mongoose.connection.useDb(databaseName);
  db.model("Employee", emoloyeeShcema);
  db.model("FinancialFunds", financialFundsSchema);
  db.model("ReportsFinancialFunds", reportsFinancialFundsSchema);
  db.model("Product", productSchema);
  db.model("ReportsSales", ReportsSalesSchema);
  const orderModel = db.model("returnOrder", returnOrderSchema);
  const salsePos = db.model("RefundPosSales", refundPosSalesSchema);

  function padZero(value) {
    return value < 10 ? `0${value}` : value;
  }
  let ts = Date.now();
  let date_ob = new Date(ts);
  let date = padZero(date_ob.getDate());
  let month = padZero(date_ob.getMonth() + 1);
  let year = date_ob.getFullYear();
  let hours = padZero(date_ob.getHours());
  let minutes = padZero(date_ob.getMinutes());
  let seconds = padZero(date_ob.getSeconds());

  const formattedDate =
    year +
    "-" +
    month +
    "-" +
    date +
    " " +
    hours +
    ":" +
    minutes +
    ":" +
    seconds;
  const specificDate = new Date();
  const specificDateString = specificDate.toISOString().split("T")[0];

  // Find orders where paidAt matches the specified date and type is 'pos'
  const orders = await salsePos.find({
    paidAt: {
      $gte: specificDateString,
    },
  });
  console.log(orders);
  const cartItems = [];
  const fish = [];
  let totalOrderPrice = 0;

  const financialFundsMap = new Map();

  for (const order of orders) {
    order.cartItems.forEach((item) => {
      cartItems.push(item);
      fish.push(order.counter);
      totalOrderPrice += item.taxPrice * item.quantity;
    });
    await order.financialFunds?.forEach((fund) => {
      const fundId = fund.fundId.toString();

      if (financialFundsMap.has(fundId)) {
        financialFundsMap.get(fundId).allocatedAmount += fund.allocatedAmount;
      } else {
        financialFundsMap.set(fundId, {
          fundId: fund.fundId,
          allocatedAmount: fund.allocatedAmount || 0,
          exchangeRateIcon: fund.exchangeRateIcon,
        });
      }
    });

    if (order.onefinancialFunds) {
      const fundId = order.onefinancialFunds.toString();
      if (financialFundsMap.has(fundId)) {
        financialFundsMap.get(fundId).allocatedAmount +=
          order.priceExchangeRate;
      } else {
        financialFundsMap.set(fundId, {
          fundId: fundId,
          allocatedAmount: order.priceExchangeRate || 0,
        });
      }
    }
  }
  // Convert the map of financial funds to an array
  const aggregatedFunds = Array.from(financialFundsMap.values());

  const nextCounter = (await orderModel.countDocuments()) + 1;

  const newOrderData = {
    cartItems: cartItems,
    priceExchangeRate: totalOrderPrice,
    date: formattedDate,
    type: "bills",
    totalOrderPrice: totalOrderPrice,
    counter: "ref " + nextCounter,
    paid: "paid",
    exchangeRate: 1,
    fish: fish,
    financialFunds: aggregatedFunds,
  };

  const newOrders = await orderModel.insertMany(newOrderData);
});

cron.schedule("59 23 * * *", async () => {
  console.log("Running Marge order task for all databases...");

  // Fetch all subscriber databases
  const subscriberDatabases = await fetchAllSubscriberDatabases();
  // for (const dbName of subscriberDatabases) {
  margeOrderRefundFish("noontek_gaziantep");
  margeOrderFish("noontek_gaziantep");

  // }
});

/*
// @desc post order
// @route POST /api/orders/order
// @access private
// Closed because it's unused.
exports.createOrder = asyncHandler(async (req, res, next) => {
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    const orderModel = db.model("Orders", orderSchema);
    const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
    db.model("Customar", customarSchema);
    const ReportsFinancialFundsModel = db.model(
        "ReportsFinancialFunds",
        reportsFinancialFundsSchema
    );
    const productModel = db.model("Product", productSchema);
    const cartItems = req.body.cartItems;
    function padZero(value) {
        return value < 10 ? `0${value}` : value;
    }
    // app settings
    let ts = Date.now();
    let date_ob = new Date(ts);
    let date = padZero(date_ob.getDate());
    let month = padZero(date_ob.getMonth() + 1);
    let year = date_ob.getFullYear();
    let hours = padZero(date_ob.getHours());
    let minutes = padZero(date_ob.getMinutes());
    let seconds = padZero(date_ob.getSeconds());

    const formattedDate =
        year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds;
    const exchangeRate = req.body.exchangeRate;
    const nextCounter = (await orderModel.countDocuments()) + 1;

    // use totalOrderPrice as an array
    const financialFundsId = req.body.financialFunds;

    // 1) Find the financial funds document based on the provided ID
    const financialFunds = await FinancialFundsModel.findById(financialFundsId);
    financialFunds.fundBalance += 10 / exchangeRate;
    if (!financialFunds) {
        return next(
            new ApiError(`There is no such financial funds with id ${financialFundsId}`, 404)
        );
    }

    const order = await orderModel.create({
        employee: req.user._id,
        cartItems,
        shippingAddress: req.body.shippingAddress,
        totalOrderPrice: 10,
        taxs: req.body.taxs,
        price: req.body.price,
        taxRate: req.body.taxRate,
        customarName: req.body.customarName,
        customarEmail: req.body.customarEmail,
        customarPhone: req.body.customarPhone,
        customarAddress: req.body.customarAddress,
        onefinancialFunds: financialFundsId,
        paidAt: formattedDate,
        counter: nextCounter,
        exchangeRate: exchangeRate,
    });
    const data = new Date();
    const timeIsoString = data.toISOString();
    await ReportsFinancialFundsModel.create({
        date: timeIsoString,
        amount: 10,
        order: order._id,
        type: "order",
        financialFundId: financialFundsId,
        financialFundRest: financialFunds.fundBalance,
        exchangeRate: exchangeRate,
    });

    // 4) After creating order, decrement product quantity, increment product sold
    if (order) {
        const bulkOption = cartItems.map(
            (item) => (
                console.log(item),
                {
                    updateOne: {
                        filter: { _id: item._id },
                        update: {
                            $inc: { quantity: -item.quantity, sold: +item.quantity },
                        },
                    },
                }
            )
        );

        await productModel.bulkWrite(bulkOption, {});
        await financialFunds.save();
    }
    res.status(201).json({ status: "success", data: order });
});*/

// // @desc put order
// // @route PUT /api/orders/:id
// // @access private
// exports.editOrder = asyncHandler(async (req, res, next) => {
//   const dbName = req.query.databaseName;
//   const db = mongoose.connection.useDb(dbName);
//   db.model("Employee", emoloyeeShcema);
//   db.model("Product", productSchema);
//   const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
//   db.model("ReportsFinancialFunds", reportsFinancialFundsSchema);
//   const productModel = db.model("Product", productSchema);
//   const orderModel = db.model("Orders", orderSchema);
//   const ReportsSalesModel = db.model("ReportsSales", ReportsSalesSchema);
//   const customersModel = db.model("Customar", customarSchema);
//   const ReportsFinancialFundsModel = db.model(
//     "ReportsFinancialFunds",
//     reportsFinancialFundsSchema
//   );
//   db.model("Currency", currencySchema);
//   db.model("Variant", variantSchema);

//   const data = new Date();
//   const timeIsoString = data.toISOString();

//   const { id } = req.params;
//   const originalOrders = await orderModel.findById(id);
//   oldQuantity = originalOrders?.cartItems?.quantity;
//   oldValue = originalOrders?.returnCartItem?.buyingPrice;

//   if (req.body.name) {
//     req.body.slug = slugify(req.body.name);
//   }

//   const order = await orderModel.findByIdAndUpdate(id, req.body, {
//     new: true,
//   });

//   if (!order) {
//     return next(new ApiError(`No Order for this id ${req.params.id}`, 404));
//   }
//   const originalOrder = await orderModel.findById(id);

//   if (order) {
//     const bulkOption = req.body.cartItems.map((item) => ({
//       updateOne: {
//         filter: { _id: item._id },
//         update: {
//           $inc: {
//             quantity: -item.quantity,
//             sold: +item.quantity,
//             activeCount: -item.quantity,
//           },
//         },
//       },
//     }));
//     const bulkOption2 = originalOrder.cartItems.map((item) => ({
//       updateOne: {
//         filter: { _id: item._id },
//         update: {
//           $inc: {
//             quantity: +item.quantity,
//             activeCount: +item.quantity,
//           },
//         },
//       },
//     }));

//     await productModel.bulkWrite(bulkOption, {});
//     await productModel.bulkWrite(bulkOption2, {});
//     let customars;
//     if (req.body.customerId)
//       customars = await customersModel.findById(req.body.customerId);
//     if (req.body.paid === "paid") {
//       const originalfinancialFunds = await FinancialFundsModel.findById(
//         originalOrder.onefinancialFunds._id
//       );
//       const financialFunds = await FinancialFundsModel.findById(
//         order.onefinancialFunds._id
//       );
//       originalfinancialFunds.fundBalance -= originalOrder.totalOrderPrice;

//       financialFunds.fundBalance += order.totalOrderPrice;
//       await originalfinancialFunds.save();
//       await ReportsFinancialFundsModel.create({
//         date: timeIsoString,
//         amount: order.totalOrderPrice,
//         order: order._id,
//         type: "order",

//         financialFundId: order.onefinancialFunds._id,
//         financialFundRest: financialFunds.fundBalance,
//         exchangeRate: req.body.exchangeRate,
//       });

//       await financialFunds.save();

//       // Create sales report
//       await ReportsSalesModel.create({
//         date: timeIsoString,
//         orderId: id,
//         fund: financialFunds,
//         amount: order.totalOrderPrice,
//         cartItems: cartItems,
//         paymentType: "Edit Order",
//         employee: req.user._id,
//       });
//     }
//     if (customars) {
//       customars.total -= originalOrder.totalOrderPrice;
//       customars.TotalUnpaid -= originalOrder.totalOrderPrice;

//       order.totalRemainderMainCurrency = originalOrder.totalOrderPrice;
//       order.totalRemainder = originalOrder.totalOrderPrice;

//       await customars.save();
//     }
//     await order.save();
//   }

//   originalOrder.cartItems.map(async (item) => {
//     const { quantity } = await productModel.findOne({ qr: item.qr });
//     createProductMovement(
//       item.product,
//       quantity,
//       item.quantity,
//       "in",
//       "Edit Sales",
//       dbName
//     );
//   });

//   try {
//     const ActiveProductsValue = db.model(
//       "ActiveProductsValue",
//       ActiveProductsValueModel
//     );
//     let totalCount = 0;
//     let totalValue = 0;

//     for (const returnItem of originalOrder.returnCartItem) {
//       const { type, currency: itemCurrency } = await productModel.findOne({
//         qr: returnItem.qr,
//       });

//       if (type != "Service") {
//         const cartItem = originalOrder.cartItems.find(
//           (cartItem) => cartItem.qr === returnItem.qr
//         );

//         if (cartItem) {
//           const oldQty = cartItem.quantity;
//           const newQty = returnItem.quantity;

//           const qtyDifference = newQty - oldQty;
//           const itemValue = returnItem.buyingPrice * qtyDifference;

//           totalValue += itemValue;
//           totalCount += qtyDifference;

//           const existingRecord = await ActiveProductsValue.findOne({
//             currency: itemCurrency,
//           });

//           if (existingRecord) {
//             existingRecord.activeProductsCount -= qtyDifference;
//             existingRecord.activeProductsValue -= itemValue;
//             await existingRecord.save();
//           } else {
//             await createActiveProductsValue(
//               qtyDifference,
//               itemValue,
//               itemCurrency,
//               dbName
//             );
//           }
//         }
//       }
//     }
//   } catch (err) {
//     console.log("OrderServices 858");
//     console.log(err.message);
//   }

//   const history = createInvoiceHistory(dbName, id, "edit", req.user._id);

//   res.status(200).json({
//     status: "true",
//     message: "Order updated successfully",
//     data: order,
//     history,
//   });
// });

// @desc put Return
// @route PUT /api/return
// @access private
// exports.returnOrder = asyncHandler(async (req, res, next) => {
//   const dbName = req.query.databaseName;
//   const db = mongoose.connection.useDb(dbName);
//   db.model("Employee", emoloyeeShcema);
//   const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
//   const productModel = db.model("Product", productSchema);
//   const orderModel = db.model("returnOrder", returnOrderSchema);
//   const ReportsFinancialFundsModel = db.model(
//     "ReportsFinancialFunds",
//     reportsFinancialFundsSchema
//   );
//   const orderModelO = db.model("Orders", orderSchema);

//   let movementCreated = false;
//   const financialFundsId = req.body.onefinancialFunds;
//   const financialFunds = await FinancialFundsModel.findById(financialFundsId);
//   const ActiveProductsValue = db.model(
//     "ActiveProductsValue",
//     ActiveProductsValueModel
//   );

//   const orderId = req.body.orderId;
//   const orders = await orderModelO.findById(orderId);

//   function padZero(value) {
//     return value < 10 ? `0${value}` : value;
//   }

//   let data = Date.now();
//   let timeIsoString = new Date(data);
//   let date = padZero(timeIsoString.getDate());
//   let month = padZero(timeIsoString.getMonth() + 1);
//   let year = timeIsoString.getFullYear();
//   let hours = padZero(timeIsoString.getHours());
//   let minutes = padZero(timeIsoString.getMinutes());
//   let seconds = padZero(timeIsoString.getSeconds());
//   const formattedDate = `${year}-${month}-${date} ${hours}:${minutes}:${seconds}`;
//   req.body.employee = req.user._id;
//   try {
//     const order = await orderModel.create(req.body);
//     let bulkOption;

//     bulkOption = req.body.cartItems.map((item) => {
//       const updateOperation = {
//         updateOne: {
//           filter: { _id: item._id },
//           update: {
//             $inc: {
//               quantity: +item.quantity,
//             },
//           },
//         },
//       };

//       updateOperation.updateOne.update.$inc.activeCount = +item.quantity;

//       return updateOperation;
//     });

//     await productModel.bulkWrite(bulkOption, {});
//     await orderModel.bulkWrite(bulkOption, {});
//     req.body.cartItems.map(async (item) => {
//       try {
//         const { currency: itemCurrency } = await productModel.findOne({
//           qr: item.qr,
//         });
//         const existingRecord = await ActiveProductsValue.findOne({
//           currency: itemCurrency,
//         });
//         let totalCount = 0;
//         let totalValue = 0;

//         const itemValue = item.buyingPrice * item.quantity;
//         totalValue += itemValue;
//         totalCount += item.quantity;

//         if (existingRecord) {
//           existingRecord.activeProductsCount += totalCount;
//           existingRecord.activeProductsValue += totalValue;
//           await existingRecord.save();
//         } else {
//           await createActiveProductsValue(
//             totalCount,
//             totalValue,
//             itemCurrency,
//             dbName
//           );
//         }
//       } catch (err) {
//         console.log("OrderServices 1190");
//         console.log(err.message);
//       }
//     });

//     financialFunds.fundBalance -= req.body.priceExchangeRate;
//     await financialFunds.save();

//     const timeIsoString1 = new Date().toISOString();
//     await ReportsFinancialFundsModel.create({
//       date: timeIsoString1,
//       amount: req.body.totalOrderPrice,
//       order: order._id,
//       type: "refund-sales",
//       financialFundId: financialFundsId,
//       financialFundRest: financialFunds.fundBalance,
//       exchangeRate: req.body.priceExchangeRate,
//     });
//     let test = [];

//     for (let i = 0; i < req.body.cartItems.length; i++) {
//       const incomingItem = req.body.cartItems[i];
//       //find qr for all arrays
//       const matchingIndex = orders.returnCartItem.findIndex(
//         (item) => item.qr === incomingItem.qr
//       );

//       if (matchingIndex !== -1) {
//         const test1 = orders.returnCartItem[matchingIndex].quantity;
//         const t = test1 - incomingItem.quantity;

//         const updateOperation = {
//           updateOne: {
//             filter: { _id: orderId },
//             update: {
//               $set: { [`returnCartItem.${matchingIndex}.quantity`]: t },
//             },
//           },
//         };

//         test.push(updateOperation);
//       }
//     }
//     await orderModelO.bulkWrite(test);
//     const history = createInvoiceHistory(
//       dbName,
//       orderId,
//       "return",
//       req.user._id
//     );

//     if (!movementCreated) {
//       for (let i = 0; i < req.body.cartItems.length; i++) {
//         const incomingItem = req.body.cartItems[i];
//         const prodcuts = await productModel.findOne({
//           qr: incomingItem.qr,
//         });
//         console.log(incomingItem);
//         createProductMovement(
//           incomingItem._id,
//           prodcuts.quantity,
//           incomingItem.quantity,
//           "in",
//           "returnSales",
//           dbName
//         );
//         movementCreated = true;
//       }
//     }

//     res.status(200).json({
//       status: "success",
//       message: "The product has been returned",
//       data: order,
//       history,
//     });
//   } catch (error) {
//     if (error.code === 11000 && error.keyPattern && error.keyPattern.counter) {
//       const nextCounter =
//         (await orderModel.countDocuments({
//           counter: new RegExp(`^${req.body.counter}-`),
//         })) + 1;

//       req.body.counter = `${req.body.counter}-${nextCounter}`;
//       const order = await orderModel.create(req.body);
//       let bulkOption;

//       bulkOption = req.body.cartItems.map((item) => {
//         const updateOperation = {
//           updateOne: {
//             filter: { _id: item._id },
//             update: {
//               $inc: {
//                 quantity: +item.quantity,
//               },
//             },
//           },
//         };
//         return updateOperation;
//       });

//       await productModel.bulkWrite(bulkOption, {});
//       await orderModel.bulkWrite(bulkOption, {});

//       req.body.cartItems.map(async (item) => {
//         try {
//           const { currency: itemCurrency } = await productModel.findOne({
//             qr: item.qr,
//           });
//           const existingRecord = await ActiveProductsValue.findOne({
//             currency: itemCurrency,
//           });
//           let totalCount = 0;
//           let totalValue = 0;

//           const itemValue = item.buyingPrice * item.quantity;
//           totalValue += itemValue;
//           totalCount += item.quantity;
//           if (existingRecord) {
//             existingRecord.activeProductsCount += totalCount;
//             existingRecord.activeProductsValue += totalValue;
//             await existingRecord.save();
//           } else {
//             await createActiveProductsValue(
//               totalCount,
//               totalValue,
//               itemCurrency,
//               dbName
//             );
//           }
//         } catch (err) {
//           console.log("OrderServices 1001");
//           console.log(err.message);
//         }
//       });

//       financialFunds.fundBalance -= req.body.priceExchangeRate;
//       await financialFunds.save();

//       const timeIsoString1 = new Date().toISOString();
//       await ReportsFinancialFundsModel.create({
//         date: timeIsoString1,
//         amount: req.body.totalOrderPrice,
//         order: order._id,
//         type: "refund-sales",
//         financialFundId: financialFundsId,
//         financialFundRest: financialFunds.fundBalance,
//         exchangeRate: req.body.priceExchangeRate,
//       });

//       let test = [];

//       for (let i = 0; i < req.body.cartItems.length; i++) {
//         const incomingItem = req.body.cartItems[i];
//         //find qr for all arrays
//         const matchingIndex = orders.returnCartItem.findIndex(
//           (item) => item.qr === incomingItem.qr
//         );

//         if (matchingIndex !== -1) {
//           const test1 = orders.returnCartItem[matchingIndex].quantity;
//           const t = test1 - incomingItem.quantity;

//           const updateOperation = {
//             updateOne: {
//               filter: { _id: orderId },
//               update: {
//                 $set: { [`returnCartItem.${matchingIndex}.quantity`]: t },
//               },
//             },
//           };

//           test.push(updateOperation);
//         }
//       }
//       await orderModelO.bulkWrite(test);
//       const history = createInvoiceHistory(
//         dbName,
//         orderId,
//         "return",
//         req.user._id
//       );

//       if (!movementCreated) {
//         for (let i = 0; i < req.body.cartItems.length; i++) {
//           const incomingItem = req.body.cartItems[i];
//           const product = await productModel.findOne({
//             qr: incomingItem.qr,
//           });
//           console.log(product)

//           createProductMovement(
//             incomingItem._id,
//             product.quantity,
//             incomingItem.quantity,
//             "in",
//             "returnSales",
//             dbName
//           );
//           movementCreated = true;
//         }
//       }

//       res.status(200).json({
//         status: "success",
//         message: "The product has been returned",
//         data: order,
//         history,
//       });
//     } else {
//       // Other errors, pass them to the error handler middleware
//       next(error);
//     }
//   }
// });
