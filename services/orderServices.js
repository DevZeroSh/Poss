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

// @desc    Create cash order from the POS page
// @route   POST /api/orders/cartId
// @access  privet/Pos Sales
exports.createCashOrder = asyncHandler(async (req, res, next) => {
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
  db.model("Currency", currencySchema);
  db.model("Category", categorySchema);
  db.model("brand", brandSchema);
  db.model("Labels", labelsSchema);
  db.model("Variant", variantSchema);
  db.model("Tax", TaxSchema);
  db.model("Unit", UnitSchema);
  const cartItems = req.body.cartItems;
  // app settings
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

  // Retrieve cart data from localStorage
  // const cartItems = JSON.parse(localStorage.getItem('cart'));
  if (!cartItems || cartItems.length === 0) {
    return next(new ApiError("The cart is empty", 400));
  }

  const totalOrderPrice = req.body.totalOrderPrice;

  // use totalOrderPrice as an array
  const financialFundsId = req.body.financialFunds;

  // 1) Find the financial funds document based on the provided ID
  const financialFunds = await FinancialFundsModel.findById(financialFundsId);

  if (!financialFunds) {
    return next(
      new ApiError(
        `There is no such financial funds with id ${financialFundsId}`,
        404
      )
    );
  }

  const exchangeRate = req.body.exchangeRate;

  const nextCounter = (await orderModel.countDocuments()) + 1;

  if (req.body.couponCount > 0) {
    financialFunds.fundBalance +=
      req.body.totalPriceAfterDiscount / exchangeRate;
  } else {
    financialFunds.fundBalance += req.body.priceExchangeRate;
  }

  // 3) Create order with default paymentMethodType cash
  const order = await orderModel.create({
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
    counter: nextCounter,
    exchangeRate: exchangeRate,
    customarId: req.body.customarId,
    paid: "paid",
  });
  const data = new Date();
  const timeIsoString = data.toISOString();
  await ReportsFinancialFundsModel.create({
    date: timeIsoString,
    amount:
      req.body.totalPriceAfterDiscount > 0
        ? req.body.totalPriceAfterDiscount
        : totalOrderPrice,
    totalPriceAfterDiscount: req.body.totalPriceAfterDiscount / exchangeRate,
    order: order._id,
    type: "sales",
    financialFundId: financialFundsId,
    financialFundRest: financialFunds.fundBalance,
    exchangeRate: exchangeRate,
  });
  await financialFunds.save();

  // 4) After creating order, decrement product quantity, increment product sold
  const bulkOption = cartItems
    .map((item) => {
      if (item.type !== "Service") {
        return {
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
        };
      } else {
        return null;
      }
    })
    .filter(Boolean);

  await productModel.bulkWrite(bulkOption, {});

  // 5) Create sales report
  await ReportsSalesModel.create({
    customer: req.body.customarName,
    orderId: order._id,
    date: timeIsoString,
    fund: financialFundsId,
    amount: totalOrderPrice,
    cartItems: cartItems,
    counter: nextCounter,
    paymentType: "Single Fund",
    employee: req.user._id,
  });
  try {
    // Process cartItems
    await Promise.all(
      cartItems.map(async (item) => {
        const { quantity, type } = await productModel.findOne({ qr: item.qr });
        if (type !== "Service") {
          // If the product is not a service, create product movement
          createProductMovement(
            item.product,
            quantity,
            item.quantity,
            "out",
            "sales",
            dbName
          );
        }
      })
    );

    // Update ActiveProductsValue
    const ActiveProductsValue = db.model(
      "ActiveProductsValue",
      ActiveProductsValueModel
    );
    let totalCount = 0;
    let totalValue = 0;
    let currency;

    await Promise.all(
      cartItems.map(async (item) => {
        const { type, currency: itemCurrency } = await productModel.findOne({
          qr: item.qr,
        });
        // Set item currency
        currency = itemCurrency._id;
        // Calculate total value and count excluding service products
        if (type !== "Service") {
          const existingRecord = await ActiveProductsValue.findOne({
            currency,
          });

          if (existingRecord) {
            // Update existing record
            existingRecord.activeProductsValue -=
              item.buyingPrice * item.quantity;
            existingRecord.activeProductsCount -= item.quantity;
            await existingRecord.save();
          } else {
            // Create new record if none exists
            await createActiveProductsValue(
              totalCount,
              totalValue,
              currency,
              dbName
            );
          }
        }
      })
    );
  } catch (err) {
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

// @desc    Create cash order from the dashboard
// @route   POST /api/salesDashbord
// @access  privet
exports.DashBordSalse = asyncHandler(async (req, res, next) => {
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

  db.model("Currency", currencySchema);
  db.model("Category", categorySchema);
  db.model("brand", brandSchema);
  db.model("Labels", labelsSchema);
  db.model("Tax", TaxSchema);
  db.model("Unit", UnitSchema);
  db.model("Variant", variantSchema);
  const cartItems = req.body.cartItems;
  // app settings
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

  // Retrieve cart data from localStorage
  // const cartItems = JSON.parse(localStorage.getItem('cart'));
  if (!cartItems || cartItems.length === 0) {
    return next(new ApiError("The cart is empty", 400));
  }

  // 2) Get order price depend on cart price "Check if coupon applies"
  // const cartPrice = cartItems.reduce((total, item) => {
  //     return total + item.taxPrice * item.quantity;
  // }, 0);
  const paid = req.body.paid;
  const totalOrderPrice = req.body.totalOrderPrice;

  // use totalOrderPrice as an array
  const financialFundsId = req.body.financialFunds;

  const exchangeRate = req.body.exchangeRate;

  const nextCounter = (await orderModel.countDocuments()) + 1;

  // 3) Create order with default paymentMethodType cash
  let order;
  const data = new Date();
  const timeIsoString = data.toISOString();
  const customars = await customersModel.findById(req.body.customarId);

  if (paid === "paid") {
    const financialFunds = await FinancialFundsModel.findById(financialFundsId);

    if (!financialFunds) {
      return next(
        new ApiError(
          `There is no such financial funds with id ${financialFundsId}`,
          404
        )
      );
    }
    financialFunds.fundBalance += req.body.totalPriceExchangeRate;

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
      counter: nextCounter,
      exchangeRate: exchangeRate,
      customarId: req.body.customarId,
      paid: paid,
    });

    await ReportsFinancialFundsModel.create({
      date: timeIsoString,
      amount: totalOrderPrice,
      totalPriceAfterDiscount: req.body.totalPriceAfterDiscount,
      order: order._id,
      type: "sales",
      financialFundId: financialFundsId,
      financialFundRest: financialFunds.fundBalance,
      exchangeRate: exchangeRate,
    });
    await financialFunds.save();
  } else {
    customars.total += totalOrderPrice;
    customars.TotalUnpaid += totalOrderPrice;
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
      counter: nextCounter,
      exchangeRate: exchangeRate,
      customarId: req.body.customarId,
      paid: paid,
      totalRemainder: req.body.priceExchangeRate,
      totalRemainderMainCurrency: totalOrderPrice,
    });
  }
  // 4) After creating order, decrement product quantity, increment product sold
  const bulkOption = cartItems
    .map((item) => {
      if (item.type !== "Service") {
        return {
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
        };
      } else {
        return null;
      }
    })
    .filter(Boolean);

  await productModel.bulkWrite(bulkOption, {});

  // 5) Create sales report
  await ReportsSalesModel.create({
    customer: req.body.customarName,
    orderId: order._id,
    date: timeIsoString,
    fund: financialFundsId,
    amount: totalOrderPrice,
    cartItems: cartItems,
    counter: nextCounter,
    paymentType: "Single Fund",
    employee: req.user._id,
  });

  cartItems.map(async (item) => {
    const { quantity } = await productModel.findOne({ qr: item.qr });
    createProductMovement(
      item.product,
      quantity,
      item.quantity,
      "out",
      "sales",
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

    for (const item of cartItems) {
      const { type, currency: itemCurrency } = await productModel.findOne({
        qr: item.qr,
      });

      if (type !== "Service") {
        totalValue += item.buyingPrice * item.quantity;
        totalCount += item.quantity;

        const existingRecord = await ActiveProductsValue.findOne({
          currency: itemCurrency,
        });

        if (existingRecord) {
          existingRecord.activeProductsCount -= item.quantity;
          existingRecord.activeProductsValue -=
            item.buyingPrice * item.quantity;
          await existingRecord.save();
        } else {
          await createActiveProductsValue(
            item.quantity,
            item.buyingPrice * item.quantity,
            itemCurrency,
            dbName
          );
        }
      }
    }
  } catch (err) {
    console.log("OrderServices 519");
    console.log(err.message);
  }

  const history = createInvoiceHistory(
    dbName,
    order._id,
    "create",
    req.user._id
  );
  await createPaymentHistory(
    "invoice",
    formattedDate,
    totalOrderPrice,
    customars.TotalUnpaid,
    "customer",
    req.body.customarId,
    nextCounter,
    dbName
  );
  res.status(201).json({ status: "success", data: order, history });
});

// @desc    create cash order for multiple funds
// @route   POST /api/orders/cartId
// @access  privet/User
exports.createCashOrderMultipelFunds = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  db.model("Currency", currencySchema);
  db.model("Category", categorySchema);
  db.model("brand", brandSchema);
  db.model("Labels", labelsSchema);
  db.model("Tax", TaxSchema);
  db.model("Unit", UnitSchema);
  db.model("Variant", variantSchema);
  const orderModel = db.model("Orders", orderSchema);
  const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
  const ReportsFinancialFundsModel = db.model(
    "ReportsFinancialFunds",
    reportsFinancialFundsSchema
  );
  const ReportsSalesModel = db.model("ReportsSales", ReportsSalesSchema);
  db.model("Employee", emoloyeeShcema);
  const productModel = db.model("Product", productSchema);
  function padZero(value) {
    return value < 10 ? `0${value}` : value;
  }
  const nextCounter = (await orderModel.countDocuments()) + 1;

  let ts = Date.now();
  let date_ob = new Date(ts);
  let date = padZero(date_ob.getDate());
  let month = padZero(date_ob.getMonth() + 1);
  let year = date_ob.getFullYear();
  let hours = padZero(date_ob.getHours());
  let minutes = padZero(date_ob.getMinutes());
  let seconds = padZero(date_ob.getSeconds());
  const dates =
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
  const data = new Date();
  const timeIsoString = data.toISOString();
  const cartItems = req.body.cartItems;
  const financialFunds = req.body.financialFunds;

  // Validate cart and get cart price
  if (!cartItems || cartItems.length === 0) {
    return next(new ApiError("The cart is empty", 400));
  }
  let totalAllocatedAmount = 0;

  // Create order and update product stock
  const order = await orderModel.create({
    priceExchangeRate: req.body.priceExchangeRate,
    employee: req.user._id,
    cartItems: cartItems,
    returnCartItem: cartItems,
    totalOrderPrice: 0,
    paymentMethodType: req.body.paymentMethodType,
    taxs: req.body.taxs,
    price: req.body.price,
    taxRate: req.body.taxRate,
    customarId: req.body.customarId,
    customarName: req.body.customarName,
    customarEmail: req.body.customarEmail,
    customarPhone: req.body.customarPhone,
    customaraddres: req.body.customaraddres,
    totalPriceAfterDiscount: req.body.totalPriceAfterDiscount,
    paidAt: dates,
    coupon: req.body.coupon,
    couponCount: req.body.couponCount,
    couponType: req.body.couponType,
    type: req.body.type,
    paid: "paid",
    counter: (await orderModel.countDocuments()) + 1,
    financialFunds: financialFunds
      .filter((allocation) => allocation.amount !== 0)
      .map((allocation) => ({
        fundId: allocation.fundId,
        allocatedAmount: parseFloat(allocation.amount),
        exchangeRateIcon: allocation.exchangeRateIcon
      })),
  });
  // Validate financial funds and calculate total allocated amount
  if (!financialFunds || financialFunds.length === 0) {
    return res.status(400).json({
      status: "error",
      message: "Please provide allocations for financial funds.",
    });
  }

  const bulkUpdates = [];
  for (const allocation of financialFunds) {
    const { fundId, amount, exchangeRate } = allocation;

    if (amount === 0) {
      // Skip if amount is 0
      continue;
    }
    // Validate financial fund and update fund balance
    const financialFund = await FinancialFundsModel.findById(fundId);
    if (!financialFund) {
      return next(new ApiError(`Financial fund ${fundId} not found`, 404));
    }

    financialFund.fundBalance += amount / exchangeRate;
    await ReportsFinancialFundsModel.create({
      date: timeIsoString,
      amount: parseFloat(amount),
      order: order._id,
      type: "sales",
      financialFundId: fundId,
      financialFundRest: financialFund.fundBalance,
      exchangeRate,
    });
    bulkUpdates.push({
      updateOne: {
        filter: { _id: fundId },
        update: { $inc: { fundBalance: amount / exchangeRate } },
      },
    });

    totalAllocatedAmount += parseFloat(amount * exchangeRate);
  }

  // Update the order with the correct totalAllocatedAmount
  await orderModel.findByIdAndUpdate(order._id, {
    taxPrice: parseFloat(totalAllocatedAmount),
    totalOrderPrice: parseFloat(totalAllocatedAmount),
  });

  // Check if total allocated amount is zero
  if (totalAllocatedAmount === 0) {
    return res.status(400).json({
      status: "error",
      message:
        "Total allocated amount is zero. Please review your allocations.",
    });
  }

  // Update product stock
  const bulkOption = cartItems
    .map((item) => {
      if (item.type !== "Service") {
        return {
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
        };
      } else {
        return null;
      }
    })
    .filter(Boolean);

  await FinancialFundsModel.bulkWrite(bulkUpdates);
  await productModel.bulkWrite(bulkOption, {});
  // await Cart.findByIdAndDelete(cartId);

  // Create sales report
  await ReportsSalesModel.create({
    customer: req.body.customarName,
    orderId: order._id,
    date: timeIsoString,
    financialFunds: financialFunds
      .filter((allocation) => allocation.amount !== 0)
      .map((allocation) => ({
        fundId: allocation.fundId,
        allocatedAmount: allocation.amount,
      })),
    amount: parseFloat(totalAllocatedAmount),
    cartItems: cartItems,
    paymentType: "Multiple Funds",
    employee: req.user._id,
    counter: nextCounter,
  });

  cartItems.map(async (item) => {
    const { quantity, type } = await productModel.findOne({ qr: item.qr });
    if (type != "Service") {
      createProductMovement(
        item.product,
        quantity,
        item.quantity,
        "out",
        "sales",
        dbName
      );
    }
  });

  try {
    const ActiveProductsValue = db.model(
      "ActiveProductsValue",
      ActiveProductsValueModel
    );

    let totalCount = 0;
    let totalValue = 0;

    for (const item of cartItems) {
      const { type, currency: itemCurrency } = await productModel.findOne({
        qr: item.qr,
      });

      if (type !== "Service") {
        totalValue += item.buyingPrice * item.quantity;
        totalCount += item.quantity;

        const existingRecord = await ActiveProductsValue.findOne({
          currency: itemCurrency,
        });

        if (existingRecord) {
          existingRecord.activeProductsCount -= item.quantity;
          existingRecord.activeProductsValue -=
            item.buyingPrice * item.quantity;
          await existingRecord.save();
        } else {
          await createActiveProductsValue(
            item.quantity,
            item.buyingPrice * item.quantity,
            itemCurrency,
            dbName
          );
        }
      }
    }
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
  // Search for product or qr
  let mongooseQuery = orderModel.find();

  if (req.query.keyword) {
    const query = {
      $and: [
        {
          $or: [{ counter: { $regex: req.query.keyword, $options: "i" } }],
        },
        { archives: { $ne: true } },
      ],
    };
    mongooseQuery = mongooseQuery.find(query);
  }
  mongooseQuery = mongooseQuery.sort({ createdAt: -1 });

  // Count total items without pagination
  const totalItems = await orderModel.countDocuments();

  // Calculate total pages
  const totalPages = Math.ceil(totalItems / pageSize);

  // Apply pagination
  mongooseQuery = mongooseQuery.skip(skip).limit(pageSize);

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
  const order = await orderModel.findById(id);
  if (!order) {
    return next(new ApiError(`No order for this id ${id}`, 404));
  }
  res.status(200).json({ status: "true", data: order });
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
  db.model("Category", categorySchema);
  db.model("brand", brandSchema);
  db.model("Labels", labelsSchema);
  db.model("Tax", TaxSchema);
  db.model("Unit", UnitSchema);
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

    const customars = await customersModel.findById(req.body.customerId);
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
    customars.total -= originalOrder.totalOrderPrice;
    customars.TotalUnpaid -= originalOrder.totalOrderPrice;

    order.totalRemainderMainCurrency -= originalOrder.totalOrderPrice;
    order.totalRemainder -= originalOrder.totalOrderPrice;

    await customars.save();
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
