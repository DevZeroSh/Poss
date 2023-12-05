const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");

const Product = require("../models/productModel");
const Cart = require("../models/cartModel");
const Order = require("../models/orderModel");
const roleModel = require("../models/roleModel");
const { getDashboardRoles } = require("./roleDashboardServices");
const FinancialFunds = require("../models/financialFundsModel");

// @desc    create cash order
// @route   POST /api/orders/cartId
// @access  privet/User
exports.createCashOrder = asyncHandler(async (req, res, next) => {
  // app settings
  let ts = Date.now();
  let date_ob = new Date(ts);
  let date = date_ob.getDate();
  let month = date_ob.getMonth() + 1;
  let year = date_ob.getFullYear();
  let hours = date_ob.getHours();
  let minutes = date_ob.getMinutes();
  let seconds = date_ob.getSeconds();
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
  // 1) Get cart depend on cartId
  const cart = await Cart.findById(req.params.cartId);
  if (!cart) {
    return next(
      new ApiError(`There is no such cart with id ${req.params.cartId}`, 404)
    );
  }

  // 2) Get order price depend on cart price "Check if coupon apply"
  const cartPrice = cart.totalPriceAfterDiscount
    ? cart.totalPriceAfterDiscount
    : cart.totalCartPrice;
  const paymentMethodType = req.body.paymentMethodType;

  const totalOrderPrice = cartPrice; // totalOrderPrice is now an array with one element

  // Now, you can use totalOrderPrice as an array
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

  const nextCounter = (await Order.countDocuments()) + 1;

  // 3) Create order with default paymentMethodType cash
  const order = await Order.create({
    employee: req.user._id,
    cartItems: cart.cartItems,
    shippingAddress: req.body.shippingAddress,
    totalOrderPrice,
    paymentMethodType,
    // quantity: req.body.quantity,
    taxs: req.body.taxs,
    price: req.body.price,
    taxRate: req.body.taxRate,
    customarName: req.body.customarName,
    customarEmail: req.body.customarEmail,
    customarPhone: req.body.customarPhone,
    customaraddres: req.body.customaraddres,
    onefinancialFunds: financialFundsId,
    paidAt: dates,
    coupon: cart.coupon,
    couponCount: cart.couponCount,
    couponType: cart.couponType,
    counter: nextCounter,
  });
  // 4) After creating order, decrement product quantity, increment product sold
  if (order) {
    const bulkOption = cart.cartItems.map((item) => ({
      updateOne: {
        filter: { _id: item.product },
        update: { $inc: { quantity: -item.quantity, sold: +item.quantity } },
      },
    }));
    financialFunds.fundBalance += totalOrderPrice;

    await Product.bulkWrite(bulkOption, {});
    await financialFunds.save();

    // 5) Clear cart depend on cartId
    await Cart.findByIdAndDelete(req.params.cartId);
  }

  res.status(201).json({ status: "success", data: order });
});

exports.createCashOrder2 = asyncHandler(async (req, res, next) => {
  let ts = Date.now();
  let date_ob = new Date(ts);
  let date = date_ob.getDate();
  let month = date_ob.getMonth() + 1;
  let year = date_ob.getFullYear();
  let hours = date_ob.getHours();
  let minutes = date_ob.getMinutes();
  let seconds = date_ob.getSeconds();
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

  const { cartId } = req.params;
  const financialFunds = req.body.financialFunds;

  // Validate cart and get cart price
  const cart = await Cart.findById(cartId);
  if (!cart) {
    return next(new ApiError(`There is no such cart with id ${cartId}`, 404));
  }

  // Validate financial funds and calculate total allocated amount
  let totalAllocatedAmount = 0;
  if (!financialFunds || financialFunds.length === 0) {
    return res.status(400).json({
      status: "error",
      message: "Please provide allocations for financial funds.",
    });
  }

  const bulkUpdates = [];
  for (const allocation of financialFunds) {
    const { fundId, amount } = allocation;

    if (amount === 0) {
      // Skip if amount is 0
      continue;
    }

    // Validate financial fund and update fund balance
    const financialFund = await FinancialFunds.findById(fundId);
    if (!financialFund) {
      return next(new ApiError(`Financial fund ${fundId} not found`, 404));
    }

    financialFund.fundBalance += amount;
    bulkUpdates.push({
      updateOne: {
        filter: { _id: fundId },
        update: { $inc: { fundBalance: amount } },
      },
    });

    totalAllocatedAmount += amount;
  }

  // Check if total allocated amount is zero
  if (totalAllocatedAmount === 0) {
    return res.status(400).json({
      status: "error",
      message:
        "Total allocated amount is zero. Please review your allocations.",
    });
  }

  // Create order and update product stock
  const order = await Order.create({
    taxPrice: totalAllocatedAmount,
    employee: req.user._id,
    cartItems: cart.cartItems,
    totalOrderPrice: totalAllocatedAmount, // Update total order price
    paymentMethodType: req.body.paymentMethodType,
    taxs: req.body.taxs,
    price: req.body.price,
    taxRate: req.body.taxRate,
    customarName: req.body.customarName,
    customarEmail: req.body.customarEmail,
    customarPhone: req.body.customarPhone,
    customaraddres: req.body.customaraddres,
    paidAt: dates,
    coupon: cart.coupon,
    couponCount: cart.couponCount,
    couponType: cart.couponType,
    counter: (await Order.countDocuments()) + 1,
    financialFunds: financialFunds
      .filter((allocation) => allocation.amount !== 0)
      .map((allocation) => ({
        fundId: allocation.fundId,
        allocatedAmount: allocation.amount,
      })),
  });

  const bulkOption = cart.cartItems.map((item) => ({
    updateOne: {
      filter: { _id: item.product },
      update: {
        $inc: { quantity: -item.quantity, sold: +item.quantity },
      },
    },
  }));

  await FinancialFunds.bulkWrite(bulkUpdates);
  await Product.bulkWrite(bulkOption, {});
  await Cart.findByIdAndDelete(cartId);

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
  const order = await Order.find();
  res.status(200).json({ status: "true", results: order.length, data: order });
});

exports.findOneOrder = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const order = await Order.findById(id);
  if (!order) {
    return next(new ApiError(`No order for this id ${id}`, 404));
  }
  res.status(200).json({ status: "true", data: order });
});
