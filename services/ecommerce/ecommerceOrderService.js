const { default: mongoose } = require("mongoose");
const cartSchema = require("../../models/ecommerce/cartModel");
const productSchema = require("../../models/productModel");
const asyncHandler = require("express-async-handler");
const ecommerceOrderSchema = require("../../models/ecommerce/ecommerceOrderModel");
const customarSchema = require("../../models/customarModel");
const ApiError = require("../../utils/apiError");
const categorySchema = require("../../models/CategoryModel");
const brandSchema = require("../../models/brandModel");
const labelsSchema = require("../../models/labelsModel");
const TaxSchema = require("../../models/taxModel");
const UnitSchema = require("../../models/UnitsModel");
const variantSchema = require("../../models/variantsModel");
const currencySchema = require("../../models/currencyModel");
const reviewSchema = require("../../models/ecommerce/reviewModel");

exports.createCashOrder = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const CartModel = db.model("Cart", cartSchema);
  const productModel = db.model("Product", productSchema);
  const orderModel = db.model("EcommerceOrder", ecommerceOrderSchema);

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

  const formattedDate =
    year + "-" + month + "-" + date + " " + hours + ":" + minutes;

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
  const nextCounter = (await orderModel.countDocuments()) + 1;
  // // 3) Create order with default paymentMethodType cash
  const order = await orderModel.create({
    customar: req.user._id,
    cartItems: cart.cartItems,
    shippingAddress: req.body.shippingAddress,
    date: formattedDate,
    orderNumber: nextCounter,
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
  const pageSize = 20;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  let mongooseQuery = orderModel.find();
  if (req.query.keyword) {
    const query = {
      $and: [
        { archives: { $ne: true } },
        {
          $or: [
            { name: { $regex: req.query.keyword, $options: "i" } },
            { qr: { $regex: req.query.keyword, $options: "i" } },
          ],
        },
      ],
    };
    mongooseQuery = mongooseQuery.find(query);
  }
  sortQuery = { createdAt: -1 };

  mongooseQuery = mongooseQuery.sort(sortQuery);

  const totalItems = await orderModel.countDocuments();

  // Calculate total pages
  const totalPages = Math.ceil(totalItems / pageSize);

  // Apply pagination
  mongooseQuery = mongooseQuery.skip(skip).limit(pageSize);
  const order = await mongooseQuery;
  res.status(200).json({
    status: "success",
    results: order.length,
    Pages: totalPages,

    data: order,
  });
});

exports.filterOneOrderForLoggedUser = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const orderModel = db.model("EcommerceOrder", ecommerceOrderSchema);
  db.model("customar", customarSchema);
  db.model("Product", productSchema)
  db.model("Category", categorySchema);
  db.model("brand", brandSchema);
  db.model("Labels", labelsSchema);
  db.model("Tax", TaxSchema);
  db.model("Unit", UnitSchema);
  db.model("Variant", variantSchema);
  db.model("Currency", currencySchema);
  db.model("Review", reviewSchema);
  const { id } = req.params;

  const order = await orderModel.findById(id).populate({path:"cartItems.product",select:"name qr image"});
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

  const order = await orderModel.findById(id);
  if (!order) {
    return next(ApiError(`No order found for ${id}`));
  }

  // Update orderStatus for each item in cartItems
  req.body.cartItems.forEach(async (item) => {
    const index = order.cartItems.findIndex(
      (i) => i._id.toString() === item._id.toString()
    );
    if (index !== -1) {
      order.cartItems[index].orderStatus = item?.orderStatus[index];
    }
  });

  await order.save();

  res.status(200).json({ status: "success", data: order });
});
