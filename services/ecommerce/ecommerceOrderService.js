const { default: mongoose } = require("mongoose");
const cartSchema = require("../../models/ecommerce/cartModel");
const productSchema = require("../../models/productModel");
const asyncHandler = require("express-async-handler");
const ecommerceOrderSchema = require("../../models/ecommerce/ecommerceOrderModel");
const customarSchema = require("../../models/customarModel");
const ApiError = require("../../utils/apiError");

exports.createCashOrder = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const CartModel = db.model("Cart", cartSchema);
  const productModel = db.model("Product", productSchema);
  const orderModel = db.model("EcommerceOrder", ecommerceOrderSchema);
  // app settings
  const taxPrice = 0;
  const shippingPrice = 0;

  // 1) Get cart depend on cartId
  const cart = await CartModel.findById(req.params.cartId);
  if (!cart) {
    return next(
      new ApiError(`There is no such cart with id ${req.params.cartId}`, 404)
    );
  }

  // 2) Get order price depend on cart price "Check if coupon apply"
  const cartPrice = cart.totalPriceAfterDiscount
    ? cart.totalPriceAfterDiscount
    : cart.totalCartPrice;

  const totalOrderPrice = cartPrice + taxPrice + shippingPrice;

  // // 3) Create order with default paymentMethodType cash
  const order = await orderModel.create({
    customar: req.user._id,
    cartItems: cart.cartItems,
    shippingAddress: req.body.shippingAddress,
    totalOrderPrice,
  });

  // // 4) After creating order, decrement product quantity, increment product sold
  if (order) {
    const bulkOption = cart.cartItems.map((item) => ({
      updateOne: {
        filter: { _id: item.product },
        update: {
          $inc: { activeCount: -item.quantity, sold: -item.quantity },
        },
      },
    }));
    await productModel.bulkWrite(bulkOption, {});

    // 5) Clear cart depend on cartId
    await CartModel.findByIdAndDelete(req.params.cartId);
  }

  res.status(201).json({ status: "success", data: order });
});

exports.filterOrderForLoggedUser = asyncHandler(async (req, res, next) => {
  req.filterObj = {
    customar: req.user._id,
  };
  next();
});
exports.findAllOrderforCustomer = asyncHandler(async (req, res, netx) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const orderModel = db.model("EcommerceOrder", ecommerceOrderSchema);
  db.model("customar", customarSchema);
  console.log(req.filterObj);
  const order = await orderModel.find(req.filterObj);
  res
    .status(200)
    .json({ status: "success", results: order.length, data: order });
});

exports.filterOneOrderForLoggedUser = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const orderModel = db.model("EcommerceOrder", ecommerceOrderSchema);
  db.model("customar", customarSchema);

  const { id } = req.params;

  const order = await orderModel.findById(id);
  if (!order) {
    return next(ApiError(`No order found for ${id}`));
  }
  res.status(200).json({ status: "success", data: order });
});

exports.UpdateEcommersOrder = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const orderModel = db.model("EcommerceOrder", ecommerceOrderSchema);
  db.model("customar", customarSchema);

  const { id } = req.params;

  const order = await orderModel.findByIdAndUpdate(id, {
    orderStatus: req.body.orderStatus,
  });
  if (!order) {
    return next(ApiError(`No order found for ${id}`));
  }
  res.status(200).json({ status: "success", data: order });
});
