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
const { PaymentService } = require("./paymentService");
const { getIP } = require("../../utils/getIP");
const E_user_Schema = require("../../models/ecommerce/E_user_Modal");
const orderSchema = require("../../models/orderModel");
const reportsFinancialFundsSchema = require("../../models/reportsFinancialFunds");
const financialFundsSchema = require("../../models/financialFundsModel");
const ReportsSalesSchema = require("../../models/reportsSalesModel");
const { createProductMovement } = require("../../utils/productMovement");

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
  const { id } = req.params;
  const cart = await CartModel.findById(id);
  console.log(cart);
  if (!cart) {
    return next(new ApiError(`There is no such cart with id ${id}`, 404));
  }

  // 2) Get order price depend on cart price "Check if coupon apply"
  const cartPrice = cart.totalPriceAfterDiscount
    ? cart.totalPriceAfterDiscount
    : cart.totalCartPrice;

  const totalOrderPrice = cartPrice + taxPrice + shippingPrice;
  const nextCounter = (await orderModel.countDocuments()) + 1;

  // 3) Create order with default paymentMethodType cash
  const order = await orderModel.create({
    customar: req.user._id,
    cartItems: cart.cartItems,
    shippingAddress: req.body.shippingAddress,
    billingAddress: req.body.billingAddress,
    date: formattedDate,
    orderNumber: nextCounter,
    totalOrderPrice,
  });

  try {
    const { body } = req;
    const ipAddress = await getIP();
    body.ipAddress = ipAddress;

    const paymentContext = await PaymentService(order, body);
    console.log(paymentContext);

    // 4) After creating order, decrement product quantity, increment product sold
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
      // 5) Clear cart depending on cartId
      await CartModel.findByIdAndDelete(id);
    }

    res.status(201).json({ status: "success", data: order });
  } catch (error) {
    return next(error);
  }
});

exports.createOrderDashboard = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const productModel = db.model("Product", productSchema);
  const orderModel = db.model("EcommerceOrder", ecommerceOrderSchema);
  // const orderInvoiceModel = db.model("Orders", orderSchema);
  const customersModel = db.model("Customar", customarSchema);

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

  const taxPrice = 0;
  const shippingPrice = 0;

  try {
    const { customerId, shippingAddress, billingAddress, cartItems } = req.body;

    if (!cartItems || !cartItems.length) {
      return next(new ApiError("Cart items are required", 400));
    }

    // Calculate total order price
    const cartPrice = cartItems.reduce(
      (acc, item) => acc + item.taxPrice * item.quantity,
      0
    );
    const totalOrderPrice = cartPrice + taxPrice + shippingPrice;
    const nextCounter = (await orderModel.countDocuments()) + 1;

    // Create order with default paymentMethodType EFT
    const order = await orderModel.create({
      customar: req.user._id,
      cartItems: cartItems,
      shippingAddress: shippingAddress,
      billingAddress: billingAddress,
      paymentMethodType: "transfer",
      date: formattedDate,
      orderNumber: nextCounter,
      totalOrderPrice,
    });

    // const customer = await customersModel.findById(customerId);

    // await orderInvoiceModel.create({
    //   date: formattedDate,
    //   employee: req.user._id,
    //   priceExchangeRate: totalOrderPrice,
    //   cartItems,
    //   returnCartItem: cartItems,
    //   totalOrderPrice,
    //   customarId: customerId,
    //   customarName: customer.name,
    //   customarEmail: customer.email,
    //   customarPhone: customer.phoneNumber,
    //   customarAddress: billingAddress,
    //   type: "ecommerce",
    //   counter: "in-" + nextCounter,
    //   paid: "paid",
    // });

    // After creating order, decrement product quantity, increment product sold
    if (order) {
      const bulkOption = cartItems.map((item) => ({
        updateOne: {
          filter: { _id: item.product },
          update: {
            $inc: { activeCount: -item.quantity, sold: -item.quantity },
          },
        },
      }));
      await productModel.bulkWrite(bulkOption, {});
    }

    res.status(201).json({ status: "success", data: order });
  } catch (error) {
    return next(error);
  }
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
  db.model("Product", productSchema);
  db.model("Users", E_user_Schema);

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
  mongooseQuery = mongooseQuery
    .populate({
      path: "cartItems.product",
    })
    .populate({
      path: "customar",
    });
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
  const productModel = db.model("Product", productSchema);
  db.model("Users", E_user_Schema);
  db.model("Category", categorySchema);
  db.model("brand", brandSchema);
  db.model("Labels", labelsSchema);
  db.model("Tax", TaxSchema);
  db.model("Unit", UnitSchema);
  db.model("Variant", variantSchema);
  db.model("Currency", currencySchema);
  db.model("Review", reviewSchema);
  db.model("Customar", customarSchema);
  const { id } = req.params;

  const order = await orderModel
    .findById(id)
    .populate({ path: "cartItems.product" })
    .populate({
      path: "customar",
      select: "name email phone",
    })
    .lean();

  res.status(200).json({ status: "success", data: order });
});

exports.UpdateEcommersOrder = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const orderModel = db.model("EcommerceOrder", ecommerceOrderSchema);
  db.model("Users", E_user_Schema);
  db.model("Customar", customarSchema);
  const { id } = req.params;

  const order = await orderModel.findById(id);
  if (!order) {
    return next(new ApiError(`No order found for ${id}`));
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

exports.customarChangeOrderStatus = asyncHandler(async (req, res, next) => {
  try {
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    const orderModel = db.model("EcommerceOrder", ecommerceOrderSchema);
    db.model("Users", E_user_Schema);
    db.model("Customar", customarSchema);
    const { id } = req.params;
    const updates = req.body; // Array of objects with _id and new orderStatus

    // Find the order by ID
    const order = await orderModel.findById(id);

    // Check if the order exists
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Ensure order has cartItems
    if (!order.cartItems || !Array.isArray(order.cartItems)) {
      return res
        .status(400)
        .json({ error: "Invalid order data: missing cartItems" });
    }

    // Update the orderStatus for each cart item based on the provided updates
    updates.forEach((update) => {
      const itemIndex = order.cartItems.findIndex(
        (item) => item._id.toString() === update._id
      );
      if (itemIndex !== -1) {
        order.cartItems[itemIndex].orderStatus = update.orderStatus;
      }
    });

    // Save the updated order
    await order.save();

    res.status(200).json({ status: "success", data: order });
  } catch (error) {
    next(error);
  }
});

exports.convertEcommersOrderToInvoice = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const EcommerceOrderModel = db.model("EcommerceOrder", ecommerceOrderSchema);
  const orderModel = db.model("Orders", orderSchema);
  const productModel = db.model("Product", productSchema);
  const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
  const ReportsFinancialFundsModel = db.model(
    "ReportsFinancialFunds",
    reportsFinancialFundsSchema
  );
  const UserModel = db.model("Users", E_user_Schema);
  const customersModel = db.model("Customar", customarSchema);

  const ReportsSalesModel = db.model("ReportsSales", ReportsSalesSchema);
  const financialFunds = await FinancialFundsModel.findById({
    _id: req.body.financialFunds,
  });
  const { stocks } = req.body;
  const { id } = req.params;

  function padZero(value) {
    return value < 10 ? `0${value}` : value;
  }
  let createCustomer;
  const user = await UserModel.findById({ _id: req.body.customarId });
  if (user.isCustomer === false) {
    createCustomer = await customersModel.create({
      name: req.body.customarName,
      phoneNumber: req.body.customarPhone,
      email: req.body.customarEmail,
      uesrid: req.body.customarId,
    });
    user.isCustomer = true;
  } else {
    createCustomer = await customersModel.findOne({
      uesrid: req.body.customarId,
    });
  }

  const ts = Date.now();
  const date_ob = new Date(ts);
  const formattedDate = `${date_ob.getFullYear()}-${padZero(
    date_ob.getMonth() + 1
  )}-${padZero(date_ob.getDate())} ${padZero(date_ob.getHours())}:${padZero(
    date_ob.getMinutes()
  )}:${padZero(date_ob.getSeconds())}`;

  const timeIsoString = formattedDate;
  // Fetch the ecommerce order by ID
  const ecommerceOrder = await EcommerceOrderModel.findById(id);
  if (!ecommerceOrder) {
    return next(new Error("Order not found"));
  }

  // Generate the next order number
  const nextCounter = (await orderModel.countDocuments()) + 1;
  const nextCounterReports = (await ReportsSalesModel.countDocuments()) + 1;

  // Create the new order
  const createOrder = await orderModel.create({
    employee: req.user._id,
    priceExchangeRate: req.body.priceExchangeRate,
    cartItems: req.body.cartItems,
    stocks: stocks,
    returnCartItem: req.body.cartItems,
    currencyCode: req.body.currency,
    totalOrderPrice: req.body.totalOrderPrice,
    totalPriceAfterDiscount: req.body.totalPriceAfterDiscount,
    taxs: req.body.taxs,
    price: req.body.price,
    taxRate: req.body.taxRate,
    customarId: createCustomer._id,
    customarName: createCustomer.name,
    customarEmail: createCustomer.email,
    customarPhone: createCustomer.phone,
    coupon: req.body.coupon,
    couponCount: req.body.couponCount,
    couponType: req.body.couponType,
    type: req.body.type,
    onefinancialFunds: req.body.financialFunds,
    paidAt: timeIsoString,
    counter: "in-" + nextCounter,
    exchangeRate: req.body.exchangeRate,
    paid: "paid",
  });

  const bulkOption = req.body.cartItems
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

  await productModel.bulkWrite(bulkOption);

  const reportsSalesPromise = await ReportsSalesModel.create({
    customer: req.body.customarName,
    orderId: createOrder._id,
    date: timeIsoString,
    fund: req.body.financialFunds,
    amount: req.body.totalOrderPrice,
    cartItems: req.body.cartItems,
    counter: nextCounterReports,
    paymentType: "Single Fund",
    employee: req.user._id,
  });

  financialFunds.fundBalance += req.body.totalOrderPrice;
  await financialFunds.save();
  const reportsFinancialFundsPromise = await ReportsFinancialFundsModel.create({
    date: timeIsoString,
    amount: req.body.totalOrderPrice,
    totalPriceAfterDiscount: req.body.totalPriceAfterDiscount,
    order: createOrder._id,
    type: "sales",
    financialFundId: req.body.financialFunds,
    financialFundRest: financialFunds.fundBalance,
    exchangeRate: req.body.exchangeRate,
  });
  // Prepare bulk write operations for updating stock quantities
  const bulkOptionst2 = [];

  for (const item of req.body.cartItems) {
    if (item.product && item.quantity) {
      const product = await productModel.findById(item.product);
      if (product) {
        for (const stock of stocks) {
          if (stock.product === item.product) {
            bulkOptionst2.push({
              updateOne: {
                filter: { _id: product._id, "stocks.stockId": stock.stockId },
                update: {
                  $inc: { "stocks.$.productQuantity": -item.quantity },
                },
              },
            });

            await createProductMovement(
              item.product,
              product.quantity,
              item.quantity,
              "out",
              "sales",
              dbName
            );
          }
        }
      }
    }
  }
  console.log(req.body);

  // Perform bulk update on products
  if (bulkOptionst2.length > 0) {
    await productModel.bulkWrite(bulkOptionst2);
  }

  // Respond with success
  res.status(201).json({ status: "success", data: createOrder });
});
