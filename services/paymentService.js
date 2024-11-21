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
const PaymentHistorySchema = require("../models/paymentHistoryModel");
const expensesSchema = require("../models/expensesModel");
const { createInvoiceHistory } = require("./invoiceHistoryService");

async function recalculateBalances(startDate, dbName) {
  const db = mongoose.connection.useDb(dbName);
  const PurchaseInvoicesModel = db.model(
    "PurchaseInvoices",
    PurchaseInvoicesSchema
  );
  const salesrModel = db.model("sales", orderSchema);

  // Fetch transactions (purchases and sales) that are affected
  const affectedPurchases = await PurchaseInvoicesModel.find({
    date: { $gte: startDate },
  }).sort({ date: 1 });

  const affectedSales = await salesrModel
    .find({
      date: { $gte: startDate },
    })
    .sort({ date: 1 });

  // Recalculate balances
  recalculatePurchaseBalances(affectedPurchases);
  recalculateSalesBalances(affectedSales);
}

// Helper function to recalculate purchase balances
function recalculatePurchaseBalances(purchases) {
  let cumulativeBalance = 0;
  for (const purchase of purchases) {
    purchase.totalRemainderMainCurrency =
      purchase.totalAmount - cumulativeBalance;
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
  const salesrModel = db.model("sales", orderSchema);
  const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
  const expensesModel = db.model("Expenses", expensesSchema);

  db.model("Tax", TaxSchema);
  db.model("Currency", currencySchema);
  db.model("Employee", emoloyeeShcema);

  function padZero(value) {
    return value < 10 ? `0${value}` : value;
  }

  const currentDate = new Date();
  const formattedDate =
    req.body.date +
      ` ${padZero(currentDate.getHours())}:${padZero(
        currentDate.getMinutes()
      )}:${padZero(currentDate.getSeconds())}` ||
    `${currentDate.getFullYear()}-${padZero(currentDate.getMonth() + 1)} 
   -${padZero(currentDate.getDate())}`;
  const timeIsoString = currentDate.toISOString();
  const time = () => {
    const padZero = (num) => String(num).padStart(2, "0");
    const ts = Date.now();
    const dateOb = new Date(ts);
    const hours = padZero(dateOb.getHours());
    const minutes = padZero(dateOb.getMinutes());
    const seconds = padZero(dateOb.getSeconds());
    return `${hours}:${minutes}:${seconds}`;
  };
  const formatteTime = time();
  const financialFundsId = req.body.financialFundsId;
  const financialFunds = await FinancialFundsModel.findById(financialFundsId);
  const ts = Date.now();
  const milliseconds = ts;
  let paymentText = "";
  let payment;
  req.body.counter = milliseconds;
  const description = req.body.description;
  let tes1t;

  if (req.body.taker === "supplier") {
    const suppler = await supplerModel.findById(req.body.supplierId);

    const totalMainCurrency = req.body.totalMainCurrency;
    suppler.TotalUnpaid -= totalMainCurrency;
    let remainingPayment = totalMainCurrency;
    payment = await paymentModel.create(req.body);
    const purchases = await PurchaseInvoicesModel.find({
      paid: "unpaid",
      suppliersId: req.body.supplierId,
      type: { $ne: "cancel" },
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
            purchase.totalRemainder - paymentAmount / purchase.exchangeRate,
        },
        $push: {
          payments: {
            payment: paymentAmount / purchase.exchangeRate,
            paymentMainCurrency: paymentAmount,
            financialFunds: req.body.financialFundsName,
            paymentID: payment._id,
            date: formattedDate,
          },
        },
      };

      if (purchase.totalRemainderMainCurrency <= paymentAmount) {
        updateObj.$set.paid = "paid";
      }

      remainingPayment -= paymentAmount;
      tes1t = {
        id: purchase._id,
        status: purchase.paid,
        paymentInFundCurrency: paymentAmount / purchase.exchangeRate,
        paymentMainCurrency: paymentAmount,
      };
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
      milliseconds
    );
  } else if (req.body.taker === "customer") {
    const customer = await customerModel.findById(req.body.customerId);
    const totalMainCurrency = req.body.totalMainCurrency;
    const test = customer.TotalUnpaid;
    customer.TotalUnpaid -= totalMainCurrency;

    let remainingPayment = totalMainCurrency;
    payment = await paymentModel.create(req.body);
    const sales = await salesrModel.find({
      paid: "unpaid",
      customarId: req.body.customerId,
      type: { $ne: "cancel" },
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
            paymentID: payment._id,
            date: formattedDate,
          },
        },
      };

      if (sale.totalRemainderMainCurrency <= paymentAmount) {
        updateObj.$set.paymentsStatus = "paid";
      }

      remainingPayment -= paymentAmount;

      tes1t = {
        id: sale._id,
        status: sale.paymentsStatus,
        paymentInFundCurrency: parseFloat(paymentAmount / sale.exchangeRate),
        paymentMainCurrency: paymentAmount,
      };
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
      milliseconds
    );
  } else if (req.body.taker === "purchase") {
    const suppler = await supplerModel.findById({
      _id: req.body.supplierId || req.body.suppliersId,
    });
    const purchase = await PurchaseInvoicesModel.findById({
      _id: req.body.purchaseId,
      type: { $ne: "cancel" },
    });
    payment = await paymentModel.create(req.body);
    let paymentAmount = req.body.totalMainCurrency;
    let paymentInvoiceCurrency = req.body.paymentInInvoiceCurrency;
    let paymentInFundCurrency = req.body.paymentInFundCurrency;
    if (paymentAmount > purchase.totalRemainderMainCurrency) {
      paymentInFundCurrency;
      paymentAmount = purchase.totalRemainderMainCurrency;
      paymentInvoiceCurrency = purchase.totalRemainder;
    }
    purchase.totalRemainderMainCurrency -= req.body.totalMainCurrency;
    purchase.totalRemainder -= req.body.paymentInInvoiceCurrency;

    if (purchase.totalRemainderMainCurrency <= 0.9) {
      purchase.paid = "paid";
      purchase.totalRemainderMainCurrency = 0;
      purchase.totalRemainder = 0;
    }

    tes1t = {
      id: req.body.purchaseId,
      status: purchase.paid,
      paymentInFundCurrency: Number(req.body.paymentInFundCurrency),
      paymentInvoiceCurrency: Number(req.body.paymentInInvoiceCurrency),
      paymentMainCurrency: Number(req.body.totalMainCurrency),
      invoiceTotal: purchase.invoiceGrandTotal,
      invoiceName: purchase.invoiceName,
    };
    suppler.TotalUnpaid -= req.body.totalMainCurrency;

    financialFunds.fundBalance -= Number(req.body.paymentInFundCurrency);
    purchase.payments.push({
      payment: paymentInFundCurrency || paymentAmount,
      paymentMainCurrency: paymentAmount,
      financialFunds: req.body.financialFundsName,
      paymentID: payment._id,
      financialFundsCurrencyCode: req.body.financialFundsCurrencyCode,
      exchangeRate: req.body.exchangeRate,
      date: req.body.date + " " + formatteTime || formattedDate,
      paymentInInvoiceCurrency: paymentInvoiceCurrency,
    });
    await suppler.save();
    const history = createInvoiceHistory(
      dbName,
      req.body.purchaseId,
      "payment",
      req.user._id,
      formattedDate,
      req.body.paymentInFundCurrency +
        " " +
        req.body.financialFundsCurrencyCode,
      "invoice"
    );

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
      milliseconds
    );

    await purchase.save();
  } else if (req.body.taker === "sales") {
    const sales = await salesrModel.findById({
      _id: req.body.salesId,
      type: { $ne: "cancel" },
    });
    payment = await paymentModel.create(req.body);
    const customer = await customerModel.findById(req.body.customerId);
    paymentText = "payment-cut";
    let paymentAmount = req.body.totalMainCurrency;
    let paymentInvoiceCurrency = req.body.paymentInInvoiceCurrency;
    let paymentInFundCurrency = req.body.paymentInFundCurrency;
    customer.TotalUnpaid -= req.body.totalMainCurrency;
    await customer.save();
    if (paymentAmount > sales.totalRemainderMainCurrency) {
      paymentInFundCurrency;
      paymentAmount = sales.totalRemainderMainCurrency;
      paymentInvoiceCurrency = sales.totalRemainder;
    }

    sales.totalRemainderMainCurrency -= paymentAmount;
    sales.totalRemainder -= paymentInvoiceCurrency;

    sales.payments.push({
      payment: paymentInFundCurrency || paymentAmount,
      paymentMainCurrency: paymentAmount,
      financialFunds: req.body.financialFundsName,
      paymentID: payment._id,
      financialFundsCurrencyCode: req.body.financialFundsCurrencyCode,
      exchangeRate: req.body.exchangeRate,
      date: req.body.date + " " + formatteTime || formattedDate,
      paymentInInvoiceCurrency: paymentInvoiceCurrency,
    });

    if (sales.totalRemainderMainCurrency <= 0) {
      sales.paymentsStatus = "paid";
    }

    const history = createInvoiceHistory(
      dbName,
      req.body.salesId,
      "payment",
      req.user._id,
      formattedDate,
      req.body.paymentInFundCurrency +
        " " +
        req.body.financialFundsCurrencyCode,
      "invoice"
    );

    tes1t = {
      id: req.body.salesId,
      status: sales.paymentsStatus,
      paymentInFundCurrency: Number(req.body.paymentInFundCurrency),
      paymentInvoiceCurrency: Number(req.body.paymentInInvoiceCurrency),
      paymentMainCurrency: Number(req.body.totalMainCurrency),
      invoiceTotal: sales.invoiceGrandTotal,
      invoiceName: purchase.invoiceName,
    };
    financialFunds.fundBalance += Number(req.body.paymentInFundCurrency);
    await sales.save();
    await createPaymentHistory(
      "payment",
      formattedDate,
      req.body.totalMainCurrency,
      customer.TotalUnpaid,
      "customer",
      req.body.customerId,
      sales.counter,
      dbName,
      description,
      milliseconds
    );
  }

  req.body.date = formattedDate;
  await financialFunds.save();
  // const payment = await paymentModel.create(req.body);
  payment.payid = tes1t;
  await payment.save();
  await ReportsFinancialFundsModel.create({
    date: timeIsoString,
    amount: req?.body?.total || req?.body?.paymentInFundCurrency,
    finalPriceMainCurrency: req.body.totalMainCurrency,
    payment: payment._id,
    type: paymentText,
    financialFundId: financialFundsId,
    financialFundRest: financialFunds.fundBalance,
    exchangeRate: req.body.exchangeRate || 1,
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
    return res
      .status(404)
      .json({ status: "fail", message: "Payment not found" });
  }

  res.status(200).json({ status: "success", data: payment });
});

exports.deletePayment = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const paymentModel = db.model("Payment", paymentSchma);
  const supplerModel = db.model("Supplier", supplierSchema);
  const PurchaseInvoicesModel = db.model(
    "PurchaseInvoices",
    PurchaseInvoicesSchema
  );
  const salesrModel = db.model("sales", orderSchema);
  const customerModel = db.model("Customar", customarSchema);
  const PaymentHistoryModel = db.model("PaymentHistory", PaymentHistorySchema);

  const { id } = req.params;

  const payment = await paymentModel.findByIdAndDelete(id);

  if (!payment) {
    return next(new ApiError(`No Payment with this id ${id}`));
  }

  if (payment.payid.length > 0 && payment.supplierId) {
    await supplerModel.findByIdAndUpdate(
      payment.supplierId,
      {
        $inc: {
          total: -payment.totalMainCurrency,
          TotalUnpaid: -payment.totalMainCurrency,
        },
      },
      { new: true }
    );

    payment.payid.map(async (purchaseId) => {
      const purchase = await PurchaseInvoicesModel.findById(purchaseId.id);
      if (purchase) {
        purchase.paid = "unpaid";

        const removedPayments = purchase.payments.filter((item) => {
          if (item.paymentID.toString() === id.toString()) {
            purchase.totalRemainderMainCurrency += item.paymentMainCurrency;
            purchase.totalRemainder += item.payment;
            return false;
          }
          return true;
        });
        purchase.payments = removedPayments;

        await purchase.save();
      }
    });
  } else if (payment.payid.length > 0 && payment.customerId) {
    await customerModel.findByIdAndUpdate(
      payment.customerId,
      {
        $inc: {
          total: +payment.totalMainCurrency,
          TotalUnpaid: +payment.totalMainCurrency,
        },
      },
      { new: true }
    );

    payment.payid.map(async (salesId) => {
      const sales = await salesrModel.findById(salesId.id);
      if (sales) {
        sales.paid = "unpaid";
        const removedPayments = sales.payments.filter((item) => {
          if (item.paymentID.toString() === id.toString()) {
            sales.totalRemainderMainCurrency += item.paymentMainCurrency;
            sales.totalRemainder += item.payment;
            return false;
          }
          return true;
        });
        sales.payments = removedPayments;
        await sales.save();
      }
    });
  }
  if (payment) {
    await PaymentHistoryModel.deleteMany({
      idPaymet: payment.counter,
    });
  }
  res.status(200).json({ message: "deleted", data: payment });
});
