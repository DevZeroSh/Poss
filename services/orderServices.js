const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");

const Product = require("../models/productModel");
const Cart = require("../models/cartModel");
const orderSchema = require("../models/orderModel");
const roleModel = require("../models/roleModel");
const { getDashboardRoles } = require("./roleDashboardServices");
const FinancialFunds = require("../models/financialFundsModel");
const ReportsFinancialFundsModel = require("../models/reportsFinancialFunds");
const multer = require("multer");
const mongoose = require("mongoose");
const upload = multer();
// @desc    create cash order
// @route   POST /api/orders/cartId
// @access  privet/User
exports.createCashOrder = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const orderModel = db.model("Orders", orderSchema);

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
  const cartPrice = cartItems.reduce((total, item) => {
    return total + item.taxPrice * item.quantity;
  }, 0);

  const paymentMethodType = req.body.paymentMethodType;
  const totalOrderPrice = cartPrice;

  // use totalOrderPrice as an array
  const financialFundsId = req.body.financialFunds;

  // 1) Find the financial funds document based on the provided ID
  const financialFunds = await FinancialFunds.findById(financialFundsId);

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
  financialFunds.fundBalance += totalOrderPrice / exchangeRate;

  // 3) Create order with default paymentMethodType cash
  const order = await orderModel.create({
    employee: req.user._id,
    cartItems,
    shippingAddress: req.body.shippingAddress,
    totalOrderPrice,
    paymentMethodType,
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
  const isaaaa = data.toISOString();
  await ReportsFinancialFundsModel.create({
    date: isaaaa,
    amount: totalOrderPrice,
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
    console.log(cartItems);
    console.log(bulkOption);
    await Product.bulkWrite(bulkOption, {});
    await financialFunds.save();
  }

  res.status(201).json({ status: "success", data: order });
});

exports.createCashOrderMultipelFunds = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const orderModel = db.model("Orders", orderSchema);

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
  const dates =
    date +
    "-" +
    month +
    "-" +
    year +
    "-" +
    hours +
    ":" +
    minutes +
    ":" +
    seconds;

  const cartItems = req.body.cartItems;
  const financialFunds = req.body.financialFunds;

  // Validate cart and get cart price
  if (!cartItems || cartItems.length === 0) {
    return next(new ApiError("The cart is empty", 400));
  }
  let totalAllocatedAmount = 0;
  // Create order and update product stock
  const order = await orderModel.create({
    taxPrice: 0,
    employee: req.user._id,
    cartItems: cartItems,
    totalOrderPrice: 0,
    paymentMethodType: req.body.paymentMethodType,
    taxs: req.body.taxs,
    price: req.body.price,
    taxRate: req.body.taxRate,
    customarName: req.body.customarName,
    customarEmail: req.body.customarEmail,
    customarPhone: req.body.customarPhone,
    customaraddres: req.body.customaraddres,
    paidAt: dates,
    // coupon: coupon,
    // couponCount: couponCount,
    // couponType: couponType,
    counter: (await orderModel.countDocuments()) + 1,
    financialFunds: financialFunds
      .filter((allocation) => allocation.amount !== 0)
      .map((allocation) => ({
        fundId: allocation.fundId,
        allocatedAmount: allocation.amount,
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
    const financialFund = await FinancialFunds.findById(fundId);
    if (!financialFund) {
      return next(new ApiError(`Financial fund ${fundId} not found`, 404));
    }
    const data = new Date();
    const isaaaa = data.toISOString();
    financialFund.fundBalance += amount / exchangeRate;
    await ReportsFinancialFundsModel.create({
      date: isaaaa,
      amount: amount,
      order: order._id,
      type: "order",
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

    totalAllocatedAmount += amount;
  }

  // Update the order with the correct totalAllocatedAmount
  await orderModel.findByIdAndUpdate(order._id, {
    taxPrice: totalAllocatedAmount,
    totalOrderPrice: totalAllocatedAmount,
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
  const bulkOption = cartItems.map((item) => ({
    updateOne: {
      filter: { _id: item._id },
      update: {
        $inc: { quantity: -item.quantity, sold: +item.quantity },
      },
    },
  }));

  await FinancialFunds.bulkWrite(bulkUpdates);
  await Product.bulkWrite(bulkOption, {});
  // await Cart.findByIdAndDelete(cartId);

  res.status(201).json({ status: "success", data: order });
});

exports.filterOrderForLoggedUser = asyncHandler(async (req, res, next) => {
  const roles = await roleModel.findById(req.user.selectedRoles[0]);
  const dashboardRolesIds = roles.rolesDashboard;
  let dashRoleName = await getDashboardRoles(dashboardRolesIds);

  let allUserRoles = [...dashRoleName];

  if (req.user.role === "discount") {
    console.log("test");
    req.filterObj = { user: req.user._id };
  }
  next();
});
// @desc    Get All order
// @route   Get /api/orders/cartId
// @access  privet/All
exports.findAllOrder = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const orderModel = db.model("Orders", orderSchema);

  const order = await orderModel.find();
  res.status(200).json({ status: "true", results: order.length, data: order });
});

exports.findOneOrder = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const orderModel = db.model("Orders", orderSchema);

  const { id } = req.params;
  const order = await orderModel.findById(id);
  if (!order) {
    return next(new ApiError(`No order for this id ${id}`, 404));
  }
  res.status(200).json({ status: "true", data: order });
});
