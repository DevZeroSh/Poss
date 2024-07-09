const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const paymentSchma = require("../models/paymentModel");
const mongoose = require("mongoose");
const supplierSchema = require("../models/suppliersModel");
const customarSchema = require("../models/customarModel");
const reportsFinancialFundsSchema = require("../models/reportsFinancialFunds");
const financialFundsSchema = require("../models/financialFundsModel");
const PurchaseInvoicesSchema = require("../models/purchaseinvoicesModel");
const emoloyeeShcema = require("../models/employeeModel");
const TaxSchema = require("../models/taxModel");
const currencySchema = require("../models/currencyModel");
const orderSchema = require("../models/orderModel");
const { createPaymentHistory } = require("./paymentHistoryService");

async function recalculateBalances(startDate, dbName) {
  const db = mongoose.connection.useDb(dbName);
  const PurchaseInvoicesModel = db.model("PurchaseInvoices", PurchaseInvoicesSchema);
  const salesrModel = db.model("Orders", orderSchema);

  // Fetch transactions (purchases and sales) that are affected
  const affectedPurchases = await PurchaseInvoicesModel.find({
    date: { $gte: startDate }
  }).sort({ date: 1 });

  const affectedSales = await salesrModel.find({
    date: { $gte: startDate }
  }).sort({ date: 1 });

  // Recalculate balances
  recalculatePurchaseBalances(affectedPurchases);
  recalculateSalesBalances(affectedSales);
}

// Helper function to recalculate purchase balances
function recalculatePurchaseBalances(purchases) {
  let cumulativeBalance = 0;
  for (const purchase of purchases) {
    purchase.totalRemainderMainCurrency = purchase.totalAmount - cumulativeBalance;
    cumulativeBalance += purchase.totalRemainderMainCurrency;
  }
}

// Helper function to recalculate sales balances
function recalculateSalesBalances(sales) {
  let cumulativeBalance = 0;
  for (const sale of sales) {
    sale.totalRemainderMainCurrency = sale.totalAmount - cumulativeBalance;
    cumulativeBalance += sale.totalRemainderMainCurrency;
  }
}


exports.createPayment = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const paymentModel = db.model("Payment", paymentSchma);
  const supplerModel = db.model("Supplier", supplierSchema);
  const customerModel = db.model("Customar", customarSchema);
  const ReportsFinancialFundsModel = db.model(
    "ReportsFinancialFunds",
    reportsFinancialFundsSchema
  );
  const PurchaseInvoicesModel = db.model(
    "PurchaseInvoices",
    PurchaseInvoicesSchema
  );
  const salesrModel = db.model("Orders", orderSchema);
  const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
  db.model("Tax", TaxSchema);
  db.model("Currency", currencySchema);
  db.model("Employee", emoloyeeShcema);

  function padZero(value) {
    return value < 10 ? `0${value}` : value;
  }

  const currentDate = new Date();
  const formattedDate = req.body.date + ` ${padZero(currentDate.getHours())}:${padZero(currentDate.getMinutes())}:${padZero(currentDate.getSeconds())}`
    || `${currentDate.getFullYear()}-${padZero(currentDate.getMonth() + 1)} 
   -${padZero(currentDate.getDate())}`;
  const timeIsoString = currentDate.toISOString();

  const financialFundsId = req.body.financialFundsId;
  const financialFunds = await FinancialFundsModel.findById(financialFundsId);

  let paymentText = "";
  const nextCounter = (await paymentModel.countDocuments()) + 1;
  req.body.counter = nextCounter;
  const description = req.body.description
  if (req.body.taker === "supplier") {
    const suppler = await supplerModel.findById(req.body.supplierId);
    const totalMainCurrency = req.body.totalMainCurrency;
    suppler.TotalUnpaid -= totalMainCurrency;
    let remainingPayment = totalMainCurrency;

    const purchases = await PurchaseInvoicesModel.find({
      paid: "unpaid",
      suppliers: req.body.supplierId,
    });

    const bulkUpdateOperations = purchases.map((purchase) => {
      const paymentAmount = Math.min(
        purchase.totalRemainderMainCurrency,
        remainingPayment
      );
      const updateObj = {
        $set: {
          totalRemainderMainCurrency:
            purchase.totalRemainderMainCurrency - paymentAmount,
          totalRemainder:
            purchase.totalRemainder -
            paymentAmount / purchase.invoiceCurrencyExchangeRate,
        },
        $push: {
          payments: {
            payment: paymentAmount / purchase.invoiceCurrencyExchangeRate,
            paymentMainCurrency: paymentAmount,
            financialFunds: req.body.financialFundsName,
            date: formattedDate,
          },
        },
      };

      if (purchase.totalRemainderMainCurrency <= paymentAmount) {
        updateObj.$set.paid = "paid";
      }

      remainingPayment -= paymentAmount;

      return {
        updateOne: {
          filter: { _id: purchase._id },
          update: updateObj,
        },
      };
    });

    await PurchaseInvoicesModel.bulkWrite(bulkUpdateOperations);
    await suppler.save();
    paymentText = "payment-sup";
    financialFunds.fundBalance -= req.body.total;
    await createPaymentHistory(
      "payment",
      formattedDate,
      req.body.totalMainCurrency,
      suppler.TotalUnpaid,
      "supplier",
      req.body.supplierId,
      purchases.counter,
      dbName,
      description,
      nextCounter
    );
  } else if (req.body.taker === "customer") {
    const customer = await customerModel.findById(req.body.customerId);
    const totalMainCurrency = req.body.totalMainCurrency;
    const test = customer.TotalUnpaid;
    customer.TotalUnpaid -= totalMainCurrency;

    let remainingPayment = totalMainCurrency;

    const sales = await salesrModel.find({
      paid: "unpaid",
      customarId: req.body.customerId,
    });
    const bulkUpdateOperations = sales.map((sale) => {
      const paymentAmount = Math.min(
        sale.totalRemainderMainCurrency,
        remainingPayment
      );
      const updateObj = {
        $set: {
          totalRemainderMainCurrency: parseFloat(
            (sale.totalRemainderMainCurrency - paymentAmount).toFixed(2)
          ),

          totalRemainder: parseFloat(
            (sale.totalRemainder - paymentAmount / sale.exchangeRate).toFixed(2)
          ),
        },
        $push: {
          payments: {
            payment: parseFloat((paymentAmount / sale.exchangeRate).toFixed(2)),
            paymentMainCurrency: paymentAmount,
            financialFunds: req.body.financialFundsName,
            date: formattedDate,
          },
        },
      };

      if (sale.totalRemainderMainCurrency <= paymentAmount) {
        updateObj.$set.paid = "paid";
      }

      remainingPayment -= paymentAmount;

      return {
        updateOne: {
          filter: { _id: sale._id },
          update: updateObj,
        },
      };
    });

    await salesrModel.bulkWrite(bulkUpdateOperations);

    financialFunds.fundBalance += parseFloat(req.body.total);
    paymentText = "payment-cut";
    await customer.save();

    await createPaymentHistory(
      "payment",
      formattedDate,
      totalMainCurrency,
      test,
      "customer",
      req.body.customerId,
      salesrModel.counter,
      dbName,
      description,
      nextCounter
    );
  } else if (req.body.taker === "purchase") {
    const suppler = await supplerModel.findById(req.body.supplierId);
    const purchase = await PurchaseInvoicesModel.findById(req.body.purchaseId);

    purchase.totalRemainderMainCurrency -= req.body.totalMainCurrency;
    purchase.totalRemainder -=
      req.body.totalMainCurrency / req.body.invoiceExchangeRate;

    purchase.payments.push({
      payment: req.body.totalMainCurrency / req.body.invoiceExchangeRate,
      paymentMainCurrency: req.body.totalMainCurrency,
      financialFunds: req.body.financialFundsName,
      date: formattedDate,
    });

    if (purchase.totalRemainderMainCurrency <= 0) {
      purchase.paid = "paid";
    }

    suppler.TotalUnpaid -= req.body.totalMainCurrency;
    financialFunds.fundBalance -= req.body.total;

    await purchase.save();
    await suppler.save();
    paymentText = "payment-sup";
    await createPaymentHistory(
      "payment",
      formattedDate,
      req.body.totalMainCurrency,
      suppler.TotalUnpaid,
      "supplier",
      req.body.supplierId,
      purchase.counter,
      dbName,
      description,
      nextCounter
    );
  } else if (req.body.taker === "sales") {
    const sales = await salesrModel.findById(req.body.salesId);
    const customer = await customerModel.findById(req.body.customerId);
    paymentText = "payment-cut";
    customer.TotalUnpaid -= req.body.totalMainCurrency;
    await customer.save();
    sales.totalRemainderMainCurrency -= req.body.totalMainCurrency;
    sales.totalRemainder -=
      req.body.totalMainCurrency / req.body.invoiceExchangeRate;

    sales.payments.push({
      payment: req.body.totalMainCurrency / req.body.invoiceExchangeRate,
      paymentMainCurrency: req.body.totalMainCurrency,
      financialFunds: req.body.financialFundsName,
      date: formattedDate,
    });

    if (sales.totalRemainderMainCurrency <= 0) {
      sales.paid = "paid";
    }

    financialFunds.fundBalance += req.body.total;
    await sales.save();
    await createPaymentHistory(
      "payment",
      formattedDate,
      req.body.totalMainCurrency,
      customer.TotalUnpaid,
      "customer",
      req.body.customerId,
      salesrModel.counter,
      dbName,
      description,
      nextCounter
    );
  }

  req.body.date = formattedDate;
  await financialFunds.save();
  const payment = await paymentModel.create(req.body);

  await ReportsFinancialFundsModel.create({
    date: timeIsoString,
    amount: req.body.total,
    payment: payment._id,
    type: paymentText,
    financialFundId: financialFundsId,
    financialFundRest: financialFunds.fundBalance,
    exchangeRate: req.body.totalMainCurrency,
  });

  if (!payment) {
    return next(new ApiError("Payment not created", 404));
  }

  res.status(200).json({ status: "success", data: payment });

  // Ensure this runs after sending the response
  setImmediate(async () => {
    await recalculateBalances(formattedDate, dbName);
  });
});


exports.getPayment = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const paymentModel = db.model("Payment", paymentSchma);

  const payment = await paymentModel.find().sort({ createdAt: -1 });
  if (!payment) {
    return next(new ApiError("Not found any Payment here", 404));
  }
  res.status(200).json({ status: "success", data: payment });
});


exports.getOnePayment = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const paymentModel = db.model("Payment", paymentSchma);
  const { id } = req.params;

  let query = {};

  const isObjectId = mongoose.Types.ObjectId.isValid(id);

  if (isObjectId) {
    query = { _id: id };
  } else if (!isNaN(id)) {
    query = { counter: Number(id) };
  } else {
    query = { stringId: id };
  }

  const payment = await paymentModel.findOne(query);

  if (!payment) {
    return res.status(404).json({ status: "fail", message: "Payment not found" });
  }

  res.status(200).json({ status: "success", data: payment });
});
