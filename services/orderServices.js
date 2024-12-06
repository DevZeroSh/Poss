const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const mongoose = require("mongoose");
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
const invoiceHistorySchema = require("../models/invoiceHistoryModel");
const UnTracedproductLogSchema = require("../models/unTracedproductLogModel");

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
  const unTracedproductLogModel = db.model(
    "unTracedproductLog",
    UnTracedproductLogSchema
  );
  const nextCounterPayment = (await paymentModel.countDocuments()) + 1;
  const cartItems = req.body.invoicesItems;
  console.log(req.body);

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
  const nextCounterOrder = await orderModel
    .countDocuments()
    .then((count) => count + 1);

  const nextCounterReports = ReportsSalesModel.countDocuments().then(
    (count) => count + 1
  );
  req.body.type = "sales";
  req.body.counter = nextCounterOrder;
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
    financialFunds.fundBalance += Number(req.body.paymentInFundCurrency);
  }
  const [customars, nextCounter, reportCounter] = await Promise.all([
    customarsPromise,
    nextCounterOrder,
    nextCounterReports,
  ]);
  req.body.returnCartItem = req.body.invoicesItems;
  let order;
  if (req.body.paymentsStatus === "paid") {
    order = await orderModel.create(req.body);

    const reportsFinancialFundsPromise = ReportsFinancialFundsModel.create({
      date: timeIsoString,
      invoice: order._id,
      amount: req.body.paymentInFundCurrency,
      exchangeAmount: req.body.totalInMainCurrency,
      type: "sales",
      financialFundId: req.body.financailFund.value,
      financialFundRest: financialFunds.fundBalance,
      exchangeRate: req.body.exchangeRate,
    });

    const financialFundsSavePromise = financialFunds.save();
    // const createExpensePromise =
    //   financialFunds.fundPaymentType.haveRatio === "true"
    //     ? (async () => {
    //         const nextExpenseCounter =
    //           (await expensesModel.countDocuments()) + 1;
    //         const expenseQuantityAfterKdv =
    //           (totalOrderPrice / exchangeRate) *
    //             (financialFunds.bankRatio / 100) ||
    //           req.body.priceExchangeRate * (financialFunds.bankRatio / 100);
    //         const updatedFundBalance =
    //           financialFunds.fundBalance - expenseQuantityAfterKdv;
    //         financialFunds.fundBalance = updatedFundBalance;
    //         const expensee = await expensesModel.create({
    //           ...req.body,
    //           expenseQuantityAfterKdv,
    //           expenseQuantityBeforeKdv: expenseQuantityAfterKdv,
    //           expenseCategory: financialFunds.fundPaymentType.expenseCategory,
    //           counter: nextExpenseCounter,
    //           expenseDate: formattedDate,
    //           expenseFinancialFund: financialFunds.fundName,
    //           expenseTax: "0",
    //           type: "paid",
    //         });
    //         await ReportsFinancialFundsModel.create({
    //           date: formattedDate,
    //           amount: expenseQuantityAfterKdv,

    //           order: expensee._id,
    //           type: "expense",
    //           financialFundId: req.body.financailFund.value,
    //           financialFundRest: updatedFundBalance,
    //           exchangeRate: expenseQuantityAfterKdv,
    //         });
    //       })()
    //     : Promise.resolve();
    await Promise.all([
      reportsFinancialFundsPromise,
      financialFundsSavePromise,
      // createExpensePromise,
    ]);

    const payment = await paymentModel.create({
      customarId: req.body.customer.id,
      customarName: req.body.customer.name,
      total: req.body.paymentInFundCurrency,
      totalMainCurrency: req.body.totalInMainCurrency,
      exchangeRate: financialFunds.fundCurrency.exchangeRate,
      currencyCode: financialFunds.fundCurrency.currencyCode,
      financialFundsName: financialFunds.fundName,
      financialFundsID: req.body.financailFund.value,
      date: req.body.date || formattedDate,
      invoiceNumber: "in-" + nextCounter,
      counter: nextCounterPayment,
      payid: {
        id: order._id,
        status: "paid",
        paymentInFundCurrency: req.body.paymentInFundCurrency,
        paymentMainCurrency: req.body.totalInMainCurrency,
      },
    });
    order.payments.push({
      payment: req.body.paymentInFundCurrency,
      paymentMainCurrency: req.body.totalInMainCurrency,
      financialFunds: financialFunds.fundName,
      financialFundsCurrencyCode: financialFunds.fundCurrency.currencyCode,
      date: req.body.date || formattedDate,
      paymentID: payment._id,
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
        req.body.paymentsStatus = "paid";
      } else {
        total = 0;
        customars.TotalUnpaid = 0;
        req.body.paymentsStatus = "paid";
      }
    } else {
      customars.TotalUnpaid += total;
    }
    req.body.totalRemainderMainCurrency = total;
    req.body.totalRemainder = req.body.invoiceGrandTotal;
    if (total === 0) {
      req.body.totalRemainder = 0;
    }

    order = await orderModel.create(req.body);
  }
  const productQRCodes = cartItems
    .filter((item) => item.type !== "unTracedproduct")
    .map((item) => item.qr);

  const products = await productModel.find({
    qr: { $in: productQRCodes },
  });

  const productMap = new Map(products.map((prod) => [prod.qr, prod]));

  const bulkOption = await Promise.all(
    cartItems.map(async (item) => {
      if (item.type !== "unTracedproduct") {
        const product = productMap.get(item.qr);

        const totalStockQuantity = product.stocks.reduce(
          (total, stock) => total + stock.productQuantity,
          0
        );

        await createProductMovement(
          product._id,
          order.id,
          totalStockQuantity - item.soldQuantity,
          item.soldQuantity,
          0,
          0,
          "movement",
          "out",
          "Sales Invoice",
          dbName
        );

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
      } else if (item.type === "unTracedproduct") {
        await unTracedproductLogModel.create({
          name: item.name,
          sellingPrice: item.sellingPrice || item.orginalBuyingPrice,
          type: "sales",
          quantity: item.soldQuantity,
          tax: item.tax,
          totalWithoutTax: item.totalWithoutTax,
          total: item.total,
        });

        return null;
      }
    })
  );

  // Filter out any `null` values from `bulkOption`
  const filteredBulkOption = bulkOption.filter(
    (operation) => operation !== null
  );

  // Perform bulkWrite
  await productModel.bulkWrite(filteredBulkOption);

  // Flatten the array of arrays and filter out any undefined values
  // const bulkOptionst2Flat = bulkOptionst2.flat().filter(Boolean);

  // if (bulkOptionst2Flat.length > 0) {
  //   await productModel.bulkWrite(bulkOptionst2Flat);
  // }
  const fundValue = req?.body?.financailFund?.value || null;
  const reportsSalesPromise = await ReportsSalesModel.create({
    customer: req.body?.customer?.name,
    orderId: order._id,
    date: timeIsoString,
    fund: fundValue,
    amount: req.body.totalInMainCurrency,
    cartItems: cartItems,
    counter: reportCounter,
    paymentType: "Single Fund",
    employee: req.user._id,
  });

  // const activeProductsValueUpdates = cartItems.map(async (item) => {
  //   const product = await productModel.findOne({ qr: item.qr });
  //   if (product && product.type !== "Service") {
  //     const existingRecord = await ActiveProductsValue.findOne({
  //       currency: product.currency._id,
  //     });
  //     if (existingRecord) {
  //       existingRecord.activeProductsCount -= item.soldQuantity;
  //       existingRecord.activeProductsValue -=
  //         item.orginalBuyingPrice * item.soldQuantity;
  //       await existingRecord.save();
  //     } else {
  //       await createActiveProductsValue(0, 0, product.currency._id, dbName);
  //     }
  //   }
  // });

  await Promise.all([reportsSalesPromise]);
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
    "SAT-" + nextCounter,
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
    query.$or = [
      { counter: { $regex: req.query.keyword, $options: "i" } },
      { invoiceName: { $regex: req.query.keyword, $options: "i" } },
    ];
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
  const invoiceHistoryModel = db.model("invoiceHistory", invoiceHistorySchema);

  const { id } = req.params;
  let query = {};

  const order = await orderModel.findById(id);

  if (!order) {
    return next(new ApiError(`No order found for this id ${id}`, 404));
  }

  const pageSize = req.query.limit || 20;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  const totalItems = await invoiceHistoryModel.countDocuments({
    invoiceId: id,
  });
  const totalPages = Math.ceil(totalItems / pageSize);
  const invoiceHistory = await invoiceHistoryModel
    .find({
      invoiceId: id,
    })
    .populate({ path: "employeeId", select: "name email" })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize);

  res.status(200).json({
    status: "true",

    data: order,
  });
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
  const UnTracedproductLogModel = db.model(
    "unTracedproductLog",
    UnTracedproductLogSchema
  );
  db.model("Currency", currencySchema);
  db.model("Variant", variantSchema);
  const { id } = req.params;
  const { date } = req.body;
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
  const originalItems = orders.invoicesItems;
  const updatedItems = req.body.invoicesItems;

  //change the items
  req.body.invoicesItems.map(async (item, index) => {
    const product = await productModel.findOne({ qr: item.qr });
    if (
      (product && product.type !== "Service") ||
      item.type !== "unTracedproduct"
    ) {
      const existingRecord = await ActiveProductsValue.findOne({
        currency: product.currency._id,
      });
      if (existingRecord) {
        existingRecord.activeProductsCount -=
          item.soldQuantity - originalItems[index].soldQuantity;
        existingRecord.activeProductsValue -=
          item.buyingpriceMainCurrence * item.soldQuantity -
          originalItems[index].buyingpriceMainCurrence *
            originalItems[index].soldQuantity;
        await existingRecord.save();
      } else {
        await createActiveProductsValue(0, 0, product.currency._id, dbName);
      }

      // Create product movement for each item

      const totalStockQuantity = product.stocks.reduce(
        (total, stock) => total + stock.productQuantity,
        0
      );
      createProductMovement(
        product._id,
        id,
        totalStockQuantity,
        item.soldQuantity,
        0,
        0,
        "movement",
        "out",
        "Sales Invoice",
        dbName
      );
    } else if (item.type === "unTracedproduct") {
      await UnTracedproductLogModel.create({
        name: item.name,
        sellingPrice: item.sellingPrice,
        type: "sales",
        quantity: item.soldQuantity,
        tax: item.tax,
        totalWithoutTax: item.totalWithoutTax,
        total: item.total,
      });
    }
  });

  // Prepare bulk updates for products and stocks
  const bulkProductUpdatesOriginal = originalItems
    .filter((item) => item.type !== "unTracedproduct")
    .map((item) => ({
      updateOne: {
        filter: { qr: item.qr, "stocks.stockId": item.stock._id },
        update: {
          $inc: {
            quantity: +item.soldQuantity,
            "stocks.$.productQuantity": +item.soldQuantity,
          },
        },
      },
    }));

  const bulkProductUpdatesNew = updatedItems
    .filter((item) => item.type !== "unTracedproduct")
    .map((item) => ({
      updateOne: {
        filter: { qr: item.qr, "stocks.stockId": item.stock._id },
        update: {
          $inc: {
            quantity: -item.soldQuantity,
            "stocks.$.productQuantity": -item.soldQuantity,
          },
        },
      },
    }));

  // Perform bulk writes
  try {
    await Promise.all([
      productModel.bulkWrite(bulkProductUpdatesOriginal),
      productModel.bulkWrite(bulkProductUpdatesNew),
    ]);
  } catch (error) {
    console.error("Error during bulk updates:", error);
    return next(new ApiError("Bulk update failed" + error, 500));
  }

  let newOrderInvoice;
  //

  const orderCustomer = await customersModel.findById(orders.customer.id);

  const customers = await customersModel.findById(req.body.customer.id);
  req.body.returnCartItem = req.body.invoicesItems;
  if (req.body.paymentsStatus === "paid") {
    const financialFund = await FinancialFundsModel.findById(
      req.body.financailFund.value
    );
    financialFund.fundBalance += req.body.paymentInFundCurrency;
    // newInvoiceData = {
    //   employee: req.user._id,
    //   cartItems: cartItems,
    //   returnCartItem: cartItems,
    //   date: date || formattedDate,
    //   customarId: customarId,
    //   customarName: customarName,
    //   customarEmail: customarEmail,
    //   customarPhone: customarPhone,
    //   customarAddress: customarAddress,
    //   currencyCode,
    //   exchangeRate,
    //   totalPriceExchangeRate: priceExchangeRate,
    //   onefinancialFunds,
    //   totalOrderPrice: totalOrderPrice,
    //   paid: "paid",
    //   description,
    //   currencyId,
    //   shippingPrice: req.body.shippingPrice,
    //   payments: [],
    // };
    newOrderInvoice = await orderModel.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    newOrderInvoice.payments.push({
      payment: req.body.totalPriceExchangeRate,
      paymentMainCurrency: req.body.totalInMainCurrency,
      financialFunds: financialFund.fundName,
      financialFundsCurrencyCode: financialFund.fundCurrency.currencyCode,
      date: date || formattedDate,
    });
    const fundValue = req?.body?.financailFund?.value || null;

    const reports = await ReportsFinancialFundsModel.create({
      date: date || formattedDate,
      invoice: newOrderInvoice._id,
      amount: req.body.totalInMainCurrency,
      type: "sales",
      exchangeRate: req.body.exchangeRate,
      exchangeAmount: priceExchangeRate,
      financialFundId: fundValue,
      financialFundRest: financialFund.fundBalance,
    });
    newOrderInvoice.reportsBalanceId = reports.id;
    await newOrderInvoice.save();
    if (req.body.customer.id === orders.customer.id) {
      customers.total +=
        req.body.totalInMainCurrency - orders.totalInMainCurrency;
    } else {
      orderCustomer.total -= orders.totalInMainCurrency;
      await orderCustomer.save();
      customers.total += req.body.totalInMainCurrency;
    }
    await customers.save();
  } else {
    if (req.body.customer.id === orders.customer.id) {
      const test = req.body.totalInMainCurrency - orders.totalInMainCurrency;
      customers.TotalUnpaid += test;
      customers.total += test;
    } else {
      orderCustomer.total -= orders.totalInMainCurrency;
      orderCustomer.TotalUnpaid -= orders.totalInMainCurrency;
      await orderCustomer.save();
      customers.total += req.body.totalInMainCurrency;
      customers.TotalUnpaid += req.body.totalInMainCurrency;
    }
    await customers.save();
    req.body.totalRemainder = req.body.invoiceGrandTotal;
    req.body.totalRemainderMainCurrency = req.body.totalInMainCurrency;
    // newInvoiceData = {
    //   employee: req.user._id,
    //   cartItems: cartItems,
    //   returnCartItem: cartItems,
    //   date: date || formattedDate,
    //   customarId: customarId,
    //   customarName: customarName,
    //   customarEmail: customarEmail,
    //   customarPhone: customarPhone,
    //   customarAddress: customarAddress,
    //   currencyCode,
    //   exchangeRate,
    //   totalPriceExchangeRate: priceExchangeRate,
    //   totalRemainder: priceExchangeRate,
    //   totalOrderPrice: totalOrderPrice,
    //   totalRemainderMainCurrency: totalOrderPrice,
    //   paid: "unpaid",
    //   description,
    //   currencyId,
    //   shippingPrice: req.body.shippingPrice,
    // };
  }

  newOrderInvoice = await orderModel.updateOne({ _id: id }, req.body, {
    new: true,
  });
  const salesReports = await ReportsSalesModel.findOneAndDelete({
    orderId: id,
  });

  const nextCounterReportsSales =
    (await ReportsSalesModel.countDocuments()) + 1;
  const fundValue = req?.body?.financailFund?.value || null;

  await ReportsSalesModel.create({
    customer: req.body.customer.name,
    orderId: id,
    date: date || formattedDate,
    fund: fundValue,
    amount: req.body.totalInMainCurrency,
    cartItems: req.body.invoicesItems,
    counter: nextCounterReportsSales,
    paymentType: "Single Fund",
    employee: req.user._id,
  });
  await PaymentHistoryModel.deleteMany({
    invoiceNumber: "SAT-" + orders.counter,
  });

  await createPaymentHistory(
    "invoice",
    date || formattedDate,
    req.body.totalInMainCurrency,
    customers.TotalUnpaid,
    "customer",
    req.body.customer.id,
    "SAT-" + orders.counter,
    dbName
  );
  if (req.body.paymentsStatus === "paid") {
    await createPaymentHistory(
      "payment",
      date || formattedDate,
      req.body.totalInMainCurrency,
      customers.TotalUnpaid,
      "customer",
      req.body.customer.id,
      "SAT-" + orders.counter,
      dbName,
      req.body.description,
      nextCounterPayment
    );
  }

  const history = createInvoiceHistory(dbName, id, "edit", req.user._id);
  res.status(200).json({
    status: "success",
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

  const financialFundsId = req.body.financailFundID;
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
  req.body.counter = orders.counter;
  try {
    const order = await models.ReturnOrder.create(req.body);

    const bulkUpdateOptions = req.body.invoicesItems.map((item) => ({
      updateOne: {
        filter: { qr: item.qr, "stocks.stockId": item.stock._id },
        update: {
          $inc: {
            quantity: +item.soldQuantity,
            "stocks.$.productQuantity": +item.soldQuantity,
          },
        },
      },
    }));

    await models.Product.bulkWrite(bulkUpdateOptions);
    await models.ReturnOrder.bulkWrite(bulkUpdateOptions);

    await Promise.all(
      req.body.invoicesItems.map(async (item) => {
        const product = await models.Product.findOne({ qr: item.qr });
        if (product) {
          const { currency: itemCurrency } = product;
          const existingRecord = await models.ActiveProductsValue.findOne({
            currency: itemCurrency,
          });

          const itemValue = item.buyingpriceMainCurrence * item.soldQuantity;

          if (existingRecord) {
            existingRecord.activeProductsCount += item.soldQuantity;
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
    if (req?.body?.paymentsStatus === "paid") {
      financialFunds.fundBalance -= req.body.paymentInFundCurrency;
      await financialFunds.save();

      await models.ReportsFinancialFunds.create({
        date: currentDateTime.toISOString(),
        order: order._id,
        type: "refund-sales",
        financialFundId: financialFundsId,
        financialFundRest: financialFunds.fundBalance,
        amount: req.body.paymentInFundCurrency,
        exchangeRate: req.body.exchangeRate,
        totalPriceMainCurrence: req.body.totalInMainCurrency,
      });
    }

    const returnCartItemUpdates = req.body.invoicesItems
      .map((incomingItem) => {
        const matchingIndex = orders.returnCartItem.findIndex(
          (item) => item.qr === incomingItem.qr
        );

        if (matchingIndex !== -1) {
          const newQuantity =
            orders.returnCartItem[matchingIndex].soldQuantity -
            incomingItem.soldQuantity;
          const newTotal =
            orders.returnCartItem[matchingIndex].total - incomingItem.total;
          const newTotalWithoutTax =
            orders.returnCartItem[matchingIndex].totalWithoutTax -
            incomingItem.totalWithoutTax;
          return {
            updateOne: {
              filter: { _id: orderId },
              update: {
                $set: {
                  [`returnCartItem.${matchingIndex}.soldQuantity`]: newQuantity,
                  [`returnCartItem.${matchingIndex}.total`]: newTotal,
                  [`returnCartItem.${matchingIndex}.totalWithoutTax`]:
                    newTotalWithoutTax,
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
      totalPriceMainCurrence: req.body.totalInMainCurrency,
    });
    res.status(200).json({
      status: "success",
      message: "The product has been returned",
      data: order,
      history,
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.counter) {
      const counterPrefix = req.body.counter;

      const nextCounter =
        (await models.ReturnOrder.countDocuments({
          counter: new RegExp(`^${counterPrefix}-`),
        })) + 1;

      req.body.counter = nextCounter + 1;
      const order = await models.ReturnOrder.create(req.body);
      const bulkUpdateOptions = req.body.invoicesItems.map((item) => ({
        updateOne: {
          filter: { qr: item.qr, "stocks.stockId": item.stock._id },
          update: {
            $inc: {
              quantity: +item.soldQuantity,
              "stocks.$.productQuantity": +item.soldQuantity,
            },
          },
        },
      }));

      await models.Product.bulkWrite(bulkUpdateOptions);
      await models.ReturnOrder.bulkWrite(bulkUpdateOptions);

      await Promise.all(
        req.body.invoicesItems.map(async (item) => {
          const product = await models.Product.findOne({ qr: item.qr });
          if (product) {
            const { currency: itemCurrency } = product;
            const existingRecord = await models.ActiveProductsValue.findOne({
              currency: itemCurrency,
            });

            const itemValue = item.buyingpriceMainCurrence * item.soldQuantity;

            if (existingRecord) {
              existingRecord.activeProductsCount += item.soldQuantity;
              existingRecord.activeProductsValue += itemValue;
              await existingRecord.save();
            } else {
              await createActiveProductsValue(
                item.soldQuantity,
                itemValue,
                itemCurrency,
                dbName
              );
            }
          }
        })
      );

      if (req.body.paymentsStatus === "paid") {
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
      }
      const returnCartItemUpdates = req.body.invoicesItems
        .map((incomingItem) => {
          const matchingIndex = orders.returnCartItem.findIndex(
            (item) => item.qr === incomingItem.qr
          );

          if (matchingIndex !== -1) {
            const newQuantity =
              orders.returnCartItem[matchingIndex].soldQuantity -
              incomingItem.soldQuantity;
            const newTotal =
              orders.returnCartItem[matchingIndex].total - incomingItem.total;
            const newTotalWithoutTax =
              orders.returnCartItem[matchingIndex].totalWithoutTax -
              incomingItem.totalWithoutTax;
            return {
              updateOne: {
                filter: { _id: orderId },
                update: {
                  $set: {
                    [`returnCartItem.${matchingIndex}.soldQuantity`]:
                      newQuantity,
                    [`returnCartItem.${matchingIndex}.total`]: newTotal,
                    [`returnCartItem.${matchingIndex}.totalWithoutTax`]:
                      newTotalWithoutTax,
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
        cartItems: req.body.invoicesItems,
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

  const returnOrderModel = db.model("returnOrder", returnOrderSchema);

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
  db.model("FinancialFunds", financialFundsSchema);
  db.model("ReportsFinancialFunds", reportsFinancialFundsSchema);
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
  const orderModel = db.model("Sales", orderSchema);
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
    const bulkProductCancel = canceled.invoicesItems.map((item) => ({
      updateOne: {
        filter: { qr: item.qr, "stocks.stockId": item.stock._id },
        update: {
          $inc: {
            quantity: +item.quantity,
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

    canceled.invoicesItems.map(async (item) => {
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
    await customersModel.findByIdAndUpdate(canceled.customer._id, {
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
  const orderModel = db.model("Sales", orderSchema);
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
      cartItems.push({
        qr: item.qr,
        name: item.name,
        sellingPrice: item.taxPrice,
        soldQuantity: item.quantity,
        orginalBuyingPrice: item.buyingPrice,
        convertedBuyingPrice: item.buyingPrice,
        total: item.taxPrice * item.quantity,
        totalWithoutTax: item.price * item.quantity,
        tax: { _id: "", tax: item.taxRate },
      });
      fish.push(order.counter);
      totalOrderPrice += item.taxPrice * item.quantity;
    });
    // await order.financialFunds?.forEach((fund) => {
    //   const fundId = fund.fundId.toString();

    //   if (financialFundsMap.has(fundId)) {
    //     financialFundsMap.get(fundId).allocatedAmount += fund.allocatedAmount;
    //   } else {
    //     financialFundsMap.set(fundId, {
    //       fundId: fund?.fundId,
    //       allocatedAmount: fund?.allocatedAmount || 0,
    //       exchangeRate: fund?.exchangeRate,
    //       exchangeRateIcon: fund?.exchangeRateIcon,
    //       fundName: fund?.fundName,
    //     });
    //   }
    // });

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
    invoicesItems: cartItems,
    invoiceGrandTotal: totalOrderPrice,
    orderDate: formattedDate,
    type: "bills",
    totalInMainCurrency: totalOrderPrice,
    counter: nextCounter,
    paymentsStatus: "paid",
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
    invoicesItems: cartItems,
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
