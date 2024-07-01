const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const mongoose = require("mongoose");
const { default: slugify } = require("slugify");

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
const orderFishPosSchema = require("../models/orderModelFishPos");

// @desc    Create cash order from the POS page
// @route   POST /api/orders/cartId
// @access  privet/Pos Sales
exports.createCashOrder = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const orderModel = db.model("Orders", orderSchema);
  const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
  const ReportsFinancialFundsModel = db.model("ReportsFinancialFunds", reportsFinancialFundsSchema);
  const ReportsSalesModel = db.model("ReportsSales", ReportsSalesSchema);
  const productModel = db.model("Product", productSchema)
  const expensesModel = db.model("Expenses", expensesSchema);
  const ActiveProductsValue = db.model("ActiveProductsValue", ActiveProductsValueModel);
  const orderFishPosModel = db.model("orderFishPosSchema", orderFishPosSchema);

  db.model("PaymentType", paymentTypesSchema);
  db.model("Currency", currencySchema);
  const cartItems = req.body.cartItems;

  function padZero(value) {
    return value < 10 ? `0${value}` : value;
  }

  const ts = Date.now();
  const date_ob = new Date(ts);
  const formattedDate = `${date_ob.getFullYear()}-${padZero(date_ob.getMonth() + 1)}-${padZero(date_ob.getDate())} ${padZero(date_ob.getHours())}:${padZero(date_ob.getMinutes())}:${padZero(date_ob.getSeconds())}`;

  if (!cartItems || cartItems.length === 0) {
    return next(new ApiError("The cart is empty", 400));
  }

  const { totalOrderPrice, financialFunds: financialFundsId, exchangeRate, couponCount, totalPriceAfterDiscount, priceExchangeRate } = req.body;

  const financialFunds = await FinancialFundsModel.findById(financialFundsId).populate({ path: "fundPaymentType" });
  if (!financialFunds) {
    return next(new ApiError(`There is no such financial funds with id ${financialFundsId}`, 404));
  }


  const nextCounter = (await orderFishPosModel.countDocuments()) + 1;
  const nextCounter2 = (await ReportsSalesModel.countDocuments()) + 1;



  const order = await orderModel.create({
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
    customarAddress: req.body.customarAddress,
    coupon: req.body.coupon,
    couponCount: req.body.couponCount,
    couponType: req.body.couponType,
    type: req.body.type,
    onefinancialFunds: financialFundsId,
    paidAt: formattedDate,
    counter: "pos-" + nextCounter,
    exchangeRate,
    paid: "paid",
  });
  financialFunds.fundBalance += couponCount > 0 ? totalPriceAfterDiscount / exchangeRate : priceExchangeRate;


  const timeIsoString = new Date().toISOString();
  const createReportsFinancialFundsPromise = ReportsFinancialFundsModel.create({
    date: timeIsoString,
    amount: totalPriceAfterDiscount > 0 ? totalPriceAfterDiscount : totalOrderPrice,
    totalPriceAfterDiscount: totalPriceAfterDiscount / exchangeRate,
    order: order._id,
    type: "sales",
    financialFundId: financialFundsId,
    financialFundRest: financialFunds.fundBalance,
    exchangeRate,
  });


  const bulkOption = cartItems
    .filter(item => item.type !== "Service")
    .map(item => ({
      updateOne: {
        filter: { _id: item._id || item.product },
        update: { $inc: { quantity: -item.quantity, sold: +item.quantity, activeCount: -item.quantity } },
      },
    }));

  const bulkWritePromise = productModel.bulkWrite(bulkOption);

  const createReportsSalesPromise = ReportsSalesModel.create({
    customer: req.body.customarName,
    orderId: order._id,
    date: timeIsoString,
    fund: financialFundsId,
    amount: totalOrderPrice,
    cartItems,
    counter: nextCounter2,
    paymentType: "Single Fund",
    employee: req.user._id,
    type: "pos",
  });
  const productMovementPromises = cartItems.map((item) => {
    const product = productModel.findOne({ qr: item.qr });
    if (product && product.type !== "Service") {
      createProductMovement(item.product, item.productQuantity - item.quantity, item.quantity, "out", "sales", dbName);
    }

  });
  const activeProductsValueUpdates = cartItems.map(async (item) => {
    const product = await productModel.findOne({ qr: item.qr });
    if (product && product.type !== "Service") {
      const existingRecord = await ActiveProductsValue.findOne({ currency: product.currency._id });
      if (existingRecord) {
        existingRecord.activeProductsValue -= item.buyingPrice * item.quantity;
        existingRecord.activeProductsCount -= item.quantity;
        existingRecord.save();
      } else {
        createActiveProductsValue(0, 0, product.currency._id, dbName);
      }
    }
  });
  const createExpensePromise = financialFunds.fundPaymentType.haveRatio === "true"
    ? (async () => {
      const nextExpenseCounter = (await expensesModel.countDocuments()) + 1;
      const expenseQuantityAfterKdv = totalPriceAfterDiscount / exchangeRate * (financialFunds.bankRatio / 100)
        || priceExchangeRate * (financialFunds.bankRatio / 100);
      const updatedFundBalance = financialFunds.fundBalance - expenseQuantityAfterKdv;
      financialFunds.fundBalance = updatedFundBalance;
      const expensee = expensesModel.create({
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

      ReportsFinancialFundsModel.create({
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
    createReportsFinancialFundsPromise,
    createReportsSalesPromise,
    bulkWritePromise,
    ...productMovementPromises,
    createExpensePromise,
    ...activeProductsValueUpdates
  ]);

  await financialFunds.save();
  const history = createInvoiceHistory(dbName, order._id, "create", req.user._id);
  orderFishPosModel.create(createReportsFinancialFundsPromise)
  res.status(201).json({ status: "success", data: order, history });
});

// @desc    Create cash order from the dashboard
// @route   POST /api/salesDashbord
// @access  privet
exports.DashBordSalse = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const orderModel = db.model("Orders", orderSchema);
  const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
  const ReportsFinancialFundsModel = db.model("ReportsFinancialFunds", reportsFinancialFundsSchema);
  const ReportsSalesModel = db.model("ReportsSales", ReportsSalesSchema);
  const productModel = db.model("Product", productSchema);
  const customersModel = db.model("Customar", customarSchema);
  const ActiveProductsValue = db.model("ActiveProductsValue", ActiveProductsValueModel);
  const expensesModel = db.model("Expenses", expensesSchema);
  db.model("PaymentType", paymentTypesSchema);
  const orderFishModel = db.model("OrdersNumber", orderFishSchema);

  const cartItems = req.body.cartItems;

  function padZero(value) {
    return value < 10 ? `0${value}` : value;
  }

  const ts = Date.now();
  const date_ob = new Date(ts);
  const formattedDate = `${date_ob.getFullYear()}-${padZero(date_ob.getMonth() + 1)}-${padZero(date_ob.getDate())} ${padZero(date_ob.getHours())}:${padZero(date_ob.getMinutes())}:${padZero(date_ob.getSeconds())}`;

  if (!cartItems || cartItems.length === 0) {
    return next(new ApiError("The cart is empty", 400));
  }

  const { paid, totalOrderPrice, financialFunds: financialFundsId, exchangeRate, customarId, description, date } = req.body;
  const timeIsoString = new Date().toISOString();

  const customarsPromise = customersModel.findById(customarId);
  const nextCounterPromise = orderFishModel.countDocuments().then(count => count + 1);
  const nextCounterReports = ReportsSalesModel.countDocuments().then(count => count + 1);

  let financialFunds;
  if (paid === "paid") {
    financialFunds = await FinancialFundsModel.findById(financialFundsId).populate({ path: "fundPaymentType" });
    if (!financialFunds) {
      return next(new ApiError(`There is no such financial funds with id ${financialFundsId}`, 404));
    }
    financialFunds.fundBalance += req.body.totalPriceExchangeRate;
  }

  const [customars, nextCounter, reportCounter] = await Promise.all([customarsPromise, nextCounterPromise, nextCounterReports]);

  let order;
  if (paid === "paid") {
    order = await orderModel.create({
      employee: req.user._id,
      priceExchangeRate: req.body.priceExchangeRate,
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
      paidAt: formattedDate,
      counter: "in-" + nextCounter,
      exchangeRate: exchangeRate,
      paid: paid,
      description,
      date,
    });

    const reportsFinancialFundsPromise = ReportsFinancialFundsModel.create({
      date: timeIsoString,
      amount: totalOrderPrice,
      totalPriceAfterDiscount: req.body.totalPriceAfterDiscount,
      order: order._id,
      type: "sales",
      financialFundId: financialFundsId,
      financialFundRest: financialFunds.fundBalance,
      exchangeRate: exchangeRate,
    });

    const financialFundsSavePromise = financialFunds.save();
    const createExpensePromise = financialFunds.fundPaymentType.haveRatio === "true"
      ? (async () => {
        const nextExpenseCounter = (await expensesModel.countDocuments()) + 1;
        const expenseQuantityAfterKdv = totalOrderPrice / exchangeRate * (financialFunds.bankRatio / 100)
          || req.body.priceExchangeRate * (financialFunds.bankRatio / 100);
        const updatedFundBalance = financialFunds.fundBalance - expenseQuantityAfterKdv;
        financialFunds.fundBalance = updatedFundBalance;
        const expensee = expensesModel.create({
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
        ReportsFinancialFundsModel.create({
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
    await Promise.all([reportsFinancialFundsPromise, financialFundsSavePromise, createExpensePromise]);

  } else {
    customars.total += totalOrderPrice;

    let total = totalOrderPrice;
    if (customars.TotalUnpaid <= -1) {
      const t = total + customars.TotalUnpaid;
      if (t > 0) {
        total = t;
        customars.TotalUnpaid = t
        console.log(">")
      }
      else if (t < 0) {
        customars.TotalUnpaid = t;
        req.body.paid = "paid"
        console.log("<")
      }
      else {
        total = 0;
        customars.TotalUnpaid = 0;
        req.body.paid = "paid";
        console.log("=");
      }

    }
    else {

      customars.TotalUnpaid += total;
    }
    await customars.save();

    order = await orderModel.create({
      employee: req.user._id,
      priceExchangeRate: req.body.priceExchangeRate,
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
      paidAt: formattedDate,
      counter: "in-" + nextCounter,
      exchangeRate: exchangeRate,
      paid: req.body.paid,
      totalRemainder: req.body.priceExchangeRate,
      totalRemainderMainCurrency: total,
    });
  }

  const bulkOption = cartItems
    .filter(item => item.type !== "Service")
    .map(item => ({
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

  const bulkWritePromise = productModel.bulkWrite(bulkOption);

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
      await createProductMovement(item.product, product.quantity, item.quantity, "out", "sales", dbName);
    }
  });

  const activeProductsValueUpdates = cartItems.map(async (item) => {
    const product = await productModel.findOne({ qr: item.qr });
    if (product && product.type !== "Service") {
      const existingRecord = await ActiveProductsValue.findOne({ currency: product.currency._id });
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
    ...activeProductsValueUpdates
  ]);

  const history = createInvoiceHistory(dbName, order._id, "create", req.user._id);
  await createPaymentHistory("invoice", formattedDate, totalOrderPrice, customars.TotalUnpaid, "customer", customarId, "in-" + nextCounter, dbName);
  orderFishModel.create(reportsSalesPromise);

  res.status(201).json({ status: "success", data: order, history });
});

// @desc    create cash order for multiple funds
// @route   POST /api/orders/cartId
// @access  privet/User
exports.createCashOrderMultipelFunds = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const orderModel = db.model("Orders", orderSchema);
  const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
  const ReportsFinancialFundsModel = db.model("ReportsFinancialFunds", reportsFinancialFundsSchema);
  const expensesModel = db.model("Expenses", expensesSchema);
  const ReportsSalesModel = db.model("ReportsSales", ReportsSalesSchema);
  const productModel = db.model("Product", productSchema);
  db.model("PaymentType", paymentTypesSchema);
  const orderFishPosModel = db.model("orderFishPosSchema", orderFishPosSchema);

  db.model("Currency", currencySchema);
  const padZero = value => value < 10 ? `0${value}` : value;

  const ts = Date.now();
  const date_ob = new Date(ts);
  const date = `${date_ob.getFullYear()}-${padZero(date_ob.getMonth() + 1)}-${padZero(date_ob.getDate())} ${padZero(date_ob.getHours())}:${padZero(date_ob.getMinutes())}:${padZero(date_ob.getSeconds())}`;
  const timeIsoString = new Date().toISOString();

  const { cartItems, financialFunds, ...orderData } = req.body;

  if (!cartItems || cartItems.length === 0) {
    return next(new ApiError("The cart is empty", 400));
  }

  const totalOrderCount = await orderFishPosModel.countDocuments() + 1;
  const reportsOrderCount = await ReportsSalesModel.countDocuments() + 1;
  const order = await orderModel.create({
    ...orderData,
    employee: req.user._id,
    cartItems,
    returnCartItem: cartItems,
    totalOrderPrice: 0,
    paidAt: date,
    counter: "pos " + totalOrderCount,
    financialFunds: financialFunds.filter(fund => fund.amount !== 0).map(fund => ({
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

  const fundsPromises = financialFunds.filter(fund => fund.amount !== 0).map(async ({ fundId, amount, exchangeRate }) => {

    const financialFund = await FinancialFundsModel.findById(fundId).populate({ path: "fundPaymentType" });


    if (!financialFund) {
      return next(new ApiError(`Financial fund ${fundId} not found`, 404));
    }

    const updatedFundBalance = parseFloat(financialFund.fundBalance) + parseFloat(amount);
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

    if (financialFund.fundPaymentType && financialFund.fundPaymentType.haveRatio === "true") {
      const expenseQuantityAfterKdv = parseFloat(amount) * (parseFloat(financialFund.bankRatio) / 100);
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
        type: "paid",
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
    orderModel.findByIdAndUpdate(order._id, {
      taxPrice: parseFloat(totalAllocatedAmount),
      totalOrderPrice: parseFloat(totalAllocatedAmount),
    }),
  ]);

  if (totalAllocatedAmount === 0) {
    return res.status(400).json({
      status: "error",
      message: "Total allocated amount is zero. Please review your allocations.",
    });
  }

  const bulkOption = cartItems
    .filter(item => item.type !== "Service")
    .map(item => ({
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

  await productModel.bulkWrite(bulkOption, {});

  await ReportsSalesModel.create({
    customer: req.body.customarName,
    orderId: order._id,
    date: timeIsoString,
    financialFunds: financialFunds
      .filter(fund => fund.amount !== 0)
      .map(fund => ({
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

  await Promise.all(cartItems.map(async item => {
    const { quantity, type } = await productModel.findOne({ qr: item.qr });
    if (type !== "Service") {
      createProductMovement(
        item.product,
        quantity,
        item.quantity,
        "out",
        "sales",
        dbName
      );
    }
  }));

  try {
    const ActiveProductsValue = db.model("ActiveProductsValue", ActiveProductsValueModel);

    await Promise.all(cartItems.map(async item => {
      const { type, currency: itemCurrency } = await productModel.findOne({ qr: item.qr });

      if (type !== "Service") {
        const totalValue = item.buyingPrice * item.quantity;
        const existingRecord = await ActiveProductsValue.findOne({ currency: itemCurrency });

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
    }));
  } catch (err) {
    console.log("OrderServices 619");
    console.log(err.message);
  }

  const history = createInvoiceHistory(dbName, order._id, "create", req.user._id);
  orderFishPosModel.create(fundsPromises)

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

// @desc    Get All order
// @route   GET /api/orders/cartId
// @access  privet/All
exports.findAllOrder = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const orderModel = db.model("Orders", orderSchema);
  db.model("Employee", emoloyeeShcema);
  db.model("Product", productSchema);
  db.model("FinancialFunds", financialFundsSchema);
  db.model("ReportsFinancialFunds", reportsFinancialFundsSchema);

  const pageSize = 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;

  // Initialize the base query to exclude type "pos"
  let query = { type: { $ne: "pos" } };

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

  let mongooseQuery = orderModel.find(query);

  // Apply sorting
  mongooseQuery = mongooseQuery.sort({ createdAt: -1 });

  // Count total items without pagination
  const totalItems = await orderModel.countDocuments(query);

  // Calculate total pages
  const totalPages = Math.ceil(totalItems / pageSize);

  // Apply pagination
  mongooseQuery = mongooseQuery.skip(skip).limit(pageSize).populate({ path: "employee" });

  const order = await mongooseQuery;

  res.status(200).json({
    status: "true",
    Pages: totalPages,
    results: order.length,
    data: order,
  });
});

// @desc    Get All order
// @route   GET /api/orders/cartId
// @access  privet/All
exports.findAllSalesPos = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const orderModel = db.model("Orders", orderSchema);
  db.model("Employee", emoloyeeShcema);
  db.model("Product", productSchema);
  db.model("FinancialFunds", financialFundsSchema);
  db.model("ReportsFinancialFunds", reportsFinancialFundsSchema);

  const pageSize = 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;

  // Initialize the base query to exclude type "pos"
  let query = { type: "pos" };

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

  let mongooseQuery = orderModel.find(query);

  // Apply sorting
  mongooseQuery = mongooseQuery.sort({ createdAt: -1 });

  // Count total items without pagination
  const totalItems = await orderModel.countDocuments(query);

  // Calculate total pages
  const totalPages = Math.ceil(totalItems / pageSize);

  // Apply pagination
  mongooseQuery = mongooseQuery.skip(skip).limit(pageSize).populate({ path: "employee" });

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
  const orderModel = db.model("Orders", orderSchema);

  const { id } = req.params;
  let query = {};
  // Check if the id is a valid ObjectId
  const isObjectId = mongoose.Types.ObjectId.isValid(id);

  if (isObjectId) {
    query = { _id: id };
  } else  {
    // Check if the id is a number
    query = { counter: id };
  } 
  try {
    const order = await orderModel.findOne(query).populate({
      path: "financialFunds.fundId",
      select: "fundName",
    }).populate({
      path: "onefinancialFunds",
      select: "fundName",
    });

    if (!order) {
      return next(new ApiError(`No order found for this id ${id}`, 404));
    }

    res.status(200).json({ status: "true", data: order });
  } catch (error) {
    return next(new ApiError(`Error retrieving order for id ${id}: ${error.message}`, 500));
  }

});

// @desc put order
// @route PUT /api/orders/:id
// @access private
exports.editOrder = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  db.model("Employee", emoloyeeShcema);
  db.model("Product", productSchema);
  const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
  db.model("ReportsFinancialFunds", reportsFinancialFundsSchema);
  const productModel = db.model("Product", productSchema);
  const orderModel = db.model("Orders", orderSchema);
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
    let customars
    if (req.body.customerId)
      customars = await customersModel.findById(req.body.customerId);
    if (req.body.paid === "paid") {
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
        type: "order",
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
    }
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

// @desc put Return
// @route PUT /api/return
// @access private
exports.returnOrder = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  db.model("Employee", emoloyeeShcema);
  db.model("Product", productSchema);
  db.model("Currency", currencySchema);
  db.model("Category", categorySchema);
  db.model("brand", brandSchema);
  db.model("Labels", labelsSchema);
  db.model("Tax", TaxSchema);
  db.model("Unit", UnitSchema);
  db.model("Variant", variantSchema);
  const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
  const productModel = db.model("Product", productSchema);
  const orderModel = db.model("returnOrder", returnOrderSchema);
  const ReportsFinancialFundsModel = db.model(
    "ReportsFinancialFunds",
    reportsFinancialFundsSchema
  );
  const orderModelO = db.model("Orders", orderSchema);

  let movementCreated = false;
  const financialFundsId = req.body.onefinancialFunds;
  const financialFunds = await FinancialFundsModel.findById(financialFundsId);
  const ActiveProductsValue = db.model(
    "ActiveProductsValue",
    ActiveProductsValueModel
  );

  const orderId = req.body.orderId;
  const orders = await orderModelO.findById(orderId);

  function padZero(value) {
    return value < 10 ? `0${value}` : value;
  }

  let data = Date.now();
  let timeIsoString = new Date(data);
  let date = padZero(timeIsoString.getDate());
  let month = padZero(timeIsoString.getMonth() + 1);
  let year = timeIsoString.getFullYear();
  let hours = padZero(timeIsoString.getHours());
  let minutes = padZero(timeIsoString.getMinutes());
  let seconds = padZero(timeIsoString.getSeconds());
  const formattedDate = `${year}-${month}-${date} ${hours}:${minutes}:${seconds}`;
  req.body.paidAt = formattedDate;
  req.body.employee = req.user._id;
  try {
    const order = await orderModel.create(req.body);
    let bulkOption;

    bulkOption = req.body.cartItems.map((item) => {
      const updateOperation = {
        updateOne: {
          filter: { _id: item._id },
          update: {
            $inc: {
              quantity: +item.quantity,
            },
          },
        },
      };

      if (item.refundLocattion === "Damaged") {
        updateOperation.updateOne.update.$inc.deactivateCount = +item.quantity;
      } else {
        updateOperation.updateOne.update.$inc.activeCount = +item.quantity;
      }

      return updateOperation;
    });

    await productModel.bulkWrite(bulkOption, {});
    await orderModel.bulkWrite(bulkOption, {});
    req.body.cartItems.map(async (item) => {
      if (item.refundLocation !== "Damaged") {
        try {
          const { currency: itemCurrency } = await productModel.findOne({
            qr: item.qr,
          });
          const existingRecord = await ActiveProductsValue.findOne({
            currency: itemCurrency,
          });
          let totalCount = 0;
          let totalValue = 0;

          const itemValue = item.buyingPrice * item.quantity;
          totalValue += itemValue;
          totalCount += item.quantity;

          if (existingRecord) {
            existingRecord.activeProductsCount += totalCount;
            existingRecord.activeProductsValue += totalValue;
            await existingRecord.save();
          } else {
            await createActiveProductsValue(
              totalCount,
              totalValue,
              itemCurrency,
              dbName
            );
          }
        } catch (err) {
          console.log("OrderServices 1190");
          console.log(err.message);
        }
      }
    });

    financialFunds.fundBalance -= req.body.priceExchangeRate;
    await financialFunds.save();

    const timeIsoString1 = new Date().toISOString();
    await ReportsFinancialFundsModel.create({
      date: timeIsoString1,
      amount: req.body.totalOrderPrice,
      order: order._id,
      type: "refund-sales",
      financialFundId: financialFundsId,
      financialFundRest: financialFunds.fundBalance,
      exchangeRate: req.body.priceExchangeRate,
    });
    let test = [];

    for (let i = 0; i < req.body.cartItems.length; i++) {
      const incomingItem = req.body.cartItems[i];
      //find qr for all arrays
      const matchingIndex = orders.returnCartItem.findIndex(
        (item) => item.qr === incomingItem.qr
      );

      if (matchingIndex !== -1) {
        const test1 = orders.returnCartItem[matchingIndex].quantity;
        const t = test1 - incomingItem.quantity;

        const updateOperation = {
          updateOne: {
            filter: { _id: orderId },
            update: {
              $set: { [`returnCartItem.${matchingIndex}.quantity`]: t },
            },
          },
        };

        test.push(updateOperation);
      }
    }
    await orderModelO.bulkWrite(test);
    const history = createInvoiceHistory(
      dbName,
      orderId,
      "return",
      req.user._id
    );

    if (!movementCreated) {
      for (let i = 0; i < req.body.cartItems.length; i++) {
        const incomingItem = req.body.cartItems[i];
        const { quantity } = await productModel.findOne({
          qr: incomingItem.qr,
        });
        createProductMovement(
          incomingItem._id,
          quantity,
          incomingItem.quantity,
          "in",
          "returnSales",
          dbName
        );
        movementCreated = true;
      }
    }

    res.status(200).json({
      status: "success",
      message: "The product has been returned",
      data: order,
      history,
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.counter) {
      const nextCounter =
        (await orderModel.countDocuments({
          counter: new RegExp(`^${req.body.counter}-`),
        })) + 1;

      req.body.counter = `${req.body.counter}-${nextCounter}`;
      const order = await orderModel.create(req.body);
      let bulkOption;

      bulkOption = req.body.cartItems.map((item) => {
        const updateOperation = {
          updateOne: {
            filter: { _id: item._id },
            update: {
              $inc: {
                quantity: +item.quantity,
              },
            },
          },
        };

        if (item.refundLocattion === "Damaged") {
          updateOperation.updateOne.update.$inc.deactivateCount =
            +item.quantity;
        } else {
          updateOperation.updateOne.update.$inc.activeCount = +item.quantity;
        }

        return updateOperation;
      });

      await productModel.bulkWrite(bulkOption, {});
      await orderModel.bulkWrite(bulkOption, {});

      req.body.cartItems.map(async (item) => {
        if (item.refundLocation !== "Damaged") {
          try {
            const { currency: itemCurrency } = await productModel.findOne({
              qr: item.qr,
            });
            const existingRecord = await ActiveProductsValue.findOne({
              currency: itemCurrency,
            });
            let totalCount = 0;
            let totalValue = 0;

            const itemValue = item.buyingPrice * item.quantity;
            totalValue += itemValue;
            totalCount += item.quantity;
            if (existingRecord) {
              existingRecord.activeProductsCount += totalCount;
              existingRecord.activeProductsValue += totalValue;
              await existingRecord.save();
            } else {
              await createActiveProductsValue(
                totalCount,
                totalValue,
                itemCurrency,
                dbName
              );
            }
          } catch (err) {
            console.log("OrderServices 1001");
            console.log(err.message);
          }
        }
      });

      financialFunds.fundBalance -= req.body.priceExchangeRate;
      await financialFunds.save();

      const timeIsoString1 = new Date().toISOString();
      await ReportsFinancialFundsModel.create({
        date: timeIsoString1,
        amount: req.body.totalOrderPrice,
        order: order._id,
        type: "refund-sales",
        financialFundId: financialFundsId,
        financialFundRest: financialFunds.fundBalance,
        exchangeRate: req.body.priceExchangeRate,
      });

      let test = [];

      for (let i = 0; i < req.body.cartItems.length; i++) {
        const incomingItem = req.body.cartItems[i];
        //find qr for all arrays
        const matchingIndex = orders.returnCartItem.findIndex(
          (item) => item.qr === incomingItem.qr
        );

        if (matchingIndex !== -1) {
          const test1 = orders.returnCartItem[matchingIndex].quantity;
          const t = test1 - incomingItem.quantity;

          const updateOperation = {
            updateOne: {
              filter: { _id: orderId },
              update: {
                $set: { [`returnCartItem.${matchingIndex}.quantity`]: t },
              },
            },
          };

          test.push(updateOperation);
        }
      }
      await orderModelO.bulkWrite(test);
      const history = createInvoiceHistory(
        dbName,
        orderId,
        "return",
        req.user._id
      );

      if (!movementCreated) {
        for (let i = 0; i < req.body.cartItems.length; i++) {
          const incomingItem = req.body.cartItems[i];
          const { quantity } = await productModel.findOne({
            qr: incomingItem.qr,
          });
          createProductMovement(
            incomingItem._id,
            quantity,
            incomingItem.quantity,
            "in",
            "returnSales",
            dbName
          );
          movementCreated = true;
        }
      }

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

// @desc    Post Marge Salse invoice
// @route   GET /api/margeorder
// @access  privet
exports.margeOrderFish = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  db.model("Employee", emoloyeeShcema);
  db.model("FinancialFunds", financialFundsSchema);
  db.model("ReportsFinancialFunds", reportsFinancialFundsSchema);
  db.model("Product", productSchema);
  db.model("ReportsSales", ReportsSalesSchema);
  const orderModel = db.model("Orders", orderSchema);
  const orderFishModel = db.model("OrdersNumber", orderFishSchema);
  const ReportsSalesModel = db.model("ReportsSales", ReportsSalesSchema);

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
  const specificDateString = specificDate.toISOString().split('T')[0];


  // Find orders where paidAt matches the specified date and type is 'pos'
  const orders = await orderModel.find({
    paidAt: {
      $gte: specificDateString,

    },
    type: 'pos'
  });

  const cartItems = [];
  const fish = [];
  let totalOrderPrice = 0;


  const financialFundsMap = new Map();

  for (const order of orders) {
    order.cartItems.forEach(item => {
      cartItems.push(item);
      fish.push(order.counter);
      totalOrderPrice += item.taxPrice * item.quantity;

    });
    order.financialFunds?.forEach(fund => {
      const fundId = fund.fundId.toString();

      if (financialFundsMap.has(fundId)) {
        financialFundsMap.get(fundId).allocatedAmount += fund.allocatedAmount;
      } else {
        financialFundsMap.set(fundId, {
          fundId: fund.fundId,
          allocatedAmount: fund.allocatedAmount || 0,
          exchangeRateIcon: fund.exchangeRateIcon
        });
      }
    });

    if (order.onefinancialFunds) {
      const fundId = order.onefinancialFunds.toString();
      if (financialFundsMap.has(fundId)) {
        financialFundsMap.get(fundId).allocatedAmount += order.priceExchangeRate;
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

  const nextCounter = (await orderFishModel.countDocuments()) + 1;


  const newOrderData = {
    cartItems: cartItems,
    priceExchangeRate: totalOrderPrice,
    paidAt: formattedDate,
    type: 'bills',
    totalOrderPrice: totalOrderPrice,
    counter: "in " + nextCounter,
    paid: "paid",
    exchangeRate: 1,
    fish: fish,
    financialFunds: aggregatedFunds,
    employee: req.user._id,
  };


  const newOrders = await orderModel.insertMany(newOrderData);

  orderFishModel.create(newOrderData);

  res.json(newOrders);
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
