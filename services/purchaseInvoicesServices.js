const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const PurchaseInvoicesSchema = require("../models/purchaseinvoicesModel");
const mongoose = require("mongoose");
const supplierSchema = require("../models/suppliersModel");
const emoloyeeShcema = require("../models/employeeModel");
const currencySchema = require("../models/currencyModel");
const financialFundsSchema = require("../models/financialFundsModel");
const productSchema = require("../models/productModel");

const TaxSchema = require("../models/taxModel");
const reportsFinancialFundsSchema = require("../models/reportsFinancialFunds");
const refundPurchaseInviceModel = require("../models/refundPurchaseInviceModel");
const { Search } = require("../utils/search");
const { createProductMovement } = require("../utils/productMovement");
const { createInvoiceHistory } = require("./invoiceHistoryService");
const ActiveProductsValueModel = require("../models/activeProductsValueModel");
const { createActiveProductsValue } = require("../utils/activeProductsValue");
const { createPaymentHistory } = require("./paymentHistoryService");
const stockSchema = require("../models/stockModel");
const PaymentSchema = require("../models/paymentModel");
const PaymentHistorySchema = require("../models/paymentHistoryModel");
const invoiceHistorySchema = require("../models/invoiceHistoryModel");
const UnTracedproductLogSchema = require("../models/unTracedproductLogModel");

//Fixed Ourchse invoice

exports.findAllProductInvoices = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  db.model("Employee", emoloyeeShcema);
  db.model("Tax", TaxSchema);
  db.model("Currency", currencySchema);
  db.model("Supplier", supplierSchema);
  db.model("Employee", emoloyeeShcema);
  db.model("FinancialFunds", financialFundsSchema);

  const PurchaseInvoicesModel = db.model(
    "PurchaseInvoices",
    PurchaseInvoicesSchema
  );
  const pageSize = req.query.limit || 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  let query = { type: { $ne: "openingBalance" } };

  if (req.query.keyword) {
    query.$or = [
      {
        supplierName: { $regex: req.query.keyword, $options: "i" },
      },
      {
        expenseName: { $regex: req.query.keyword, $options: "i" },
      },
      {
        invoiceNumber: { $regex: req.query.keyword, $options: "i" },
      },
    ];
  }

  const totalItems = await PurchaseInvoicesModel.countDocuments(query);

  const totalPages = Math.ceil(totalItems / pageSize);
  const purchaseInvoices = await PurchaseInvoicesModel.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize)
    .populate({
      path: "employee",
      select: "name profileImg email phone",
    });

  res.status(200).json({
    status: "true",
    Pages: totalPages,
    results: purchaseInvoices.length,
    data: purchaseInvoices,
  });
});

exports.findOneProductInvoices = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  db.model("Supplier", supplierSchema);
  db.model("Employee", emoloyeeShcema);
  db.model("Currency", currencySchema);
  db.model("Tax", TaxSchema);
  db.model("Product", productSchema);
  db.model("FinancialFunds", financialFundsSchema);
  const PurchaseInvoicesModel = db.model(
    "PurchaseInvoices",
    PurchaseInvoicesSchema
  );
  const invoiceHistoryModel = db.model("invoiceHistory", invoiceHistorySchema);

  const { id } = req.params;
  const ProductInvoices = await PurchaseInvoicesModel.findById(id).populate({
    path: "employee",
    select: "name profileImg email phone",
  });

  if (!ProductInvoices) {
    return next(new ApiError(`No ProductInvoices for this id ${id}`, 404));
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
    Pages: totalPages,
    data: ProductInvoices,
    history: invoiceHistory,
  });
});

exports.createPurchaseInvoice = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  // Model definitions
  const ProductModel = db.model("Product", productSchema);
  const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
  const ReportsFinancialFundsModel = db.model(
    "ReportsFinancialFunds",
    reportsFinancialFundsSchema
  );
  const SupplierModel = db.model("Supplier", supplierSchema);
  const PurchaseInvoicesModel = db.model(
    "PurchaseInvoices",
    PurchaseInvoicesSchema
  );
  const PaymentModel = db.model("Payment", PaymentSchema);
  const ActiveProductsValue = db.model(
    "ActiveProductsValue",
    ActiveProductsValueModel
  );
  const UnTracedproductLogModel = db.model(
    "unTracedproductLog",
    UnTracedproductLogSchema
  );

  const nextCounterPayment = (await PaymentModel.countDocuments()) + 1;
  const nextCounterPurchaseInvoices =
    (await PurchaseInvoicesModel.countDocuments()) + 1;

  const formattedDate = new Date().toISOString().replace("T", " ").slice(0, 19);
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
  const {
    supllierObject,
    paid,
    date,
    financailFund,
    exchangeRate,
    totalInMainCurrency: totalPurchasePriceMainCurrency,
    currency,
    invoiceNumber,
    invoiceSubTotal,
    invoiceDiscount,
    invoiceGrandTotal,
    ManualInvoiceDiscount,
    ManualInvoiceDiscountValue,
    taxDetails,
    invoiceName,
    paymentInFundCurrency,
    InvoiceDiscountType,
    subtotalWithDiscount,
    paymentDate,
    invoiceTax,
  } = req.body;

  let supplier, invoicesItem, newPurchaseInvoice;

  try {
    invoicesItem = JSON.parse(req.body.invoicesItems);
    supplier = await SupplierModel.findById(supllierObject.id);
    if (!supplier) throw new Error("Supplier not found");
  } catch (error) {
    return res.status(400).json({ status: "error", message: error.message });
  }

  const productQRCodes = invoicesItem.map((item) => item.qr);
  const products = await ProductModel.find({
    qr: { $in: productQRCodes },
  });

  // Create a map for quick product lookups by QR code
  const productMap = new Map(products.map((prod) => [prod.qr, prod]));

  // Prepare and update invoice items with product data
  const invoiceItems = invoicesItem.map((item) => {
    if (item.type !== "unTracedproduct") {
      const productDoc = productMap.get(item.qr);
      if (!productDoc)
        throw new Error(`Product not found for QR code: ${item.qr}`);
      return {
        ...item,
        name: productDoc.name,
        profitRatio: item.profitRatio || 0,
      };
    }
  });

  // Handle invoice creation based on 'paid' status
  if (paid === "paid") {
    // Handle paid invoice logic
    const financialFund = await FinancialFundsModel.findById(
      financailFund.value
    );
    if (!financialFund) throw new Error("Financial fund not found");

    financialFund.fundBalance -= paymentInFundCurrency;

    newPurchaseInvoice = await PurchaseInvoicesModel.create({
      employee: req.user._id,
      invoicesItems: invoicesItem,
      date: date || formattedDate,
      supllier: supllierObject,
      currency,
      exchangeRate,
      financailFund,
      invoiceNumber,
      paid,
      totalPurchasePriceMainCurrency,
      invoiceSubTotal,
      invoiceDiscount,
      invoiceGrandTotal,
      taxDetails,
      invoiceName,
      paymentInFundCurrency: paymentInFundCurrency,
      ManualInvoiceDiscount,
      ManualInvoiceDiscountValue,
      InvoiceDiscountType,
      subtotalWithDiscount,
      paymentDate,
      invoiceTax,
      counter: nextCounterPurchaseInvoices,
    });
    // Use Promise.all for parallel database operations
    const [reports, payment] = await Promise.all([
      ReportsFinancialFundsModel.create({
        date: date + " " + formatteTime || formattedDate,
        invoice: newPurchaseInvoice._id,
        amount: paymentInFundCurrency,
        type: "purchase",
        exchangeRate,
        financialFundId: financailFund.value,
        financialFundRest: financialFund.fundBalance,
      }),
      PaymentModel.create({
        supplierId: supplier.value,
        supplierName: supplier.label,
        total: invoiceGrandTotal,
        totalMainCurrency: totalPurchasePriceMainCurrency,
        exchangeRate: financialFund.fundCurrency.exchangeRate,
        currencyCode: financialFund.fundCurrency.currencyCode,
        date: date + " " + formatteTime || formattedDate,
        financialFundsName: financialFund.fundName,
        financialFundsID: financailFund.value,
        invoiceNumber: invoiceNumber,
        counter: nextCounterPayment,
        payid: {
          id: newPurchaseInvoice._id,
          status: "paid",
          paymentInFundCurrency: paymentInFundCurrency,
          paymentMainCurrency: req.body.totalInMainCurrency,
        },
      }),
    ]);

    newPurchaseInvoice.payments.push({
      payment: paymentInFundCurrency,
      paymentMainCurrency: totalPurchasePriceMainCurrency,
      financialFunds: financialFund.fundName,
      financialFundsCurrencyCode: financialFund.label,
      date: date + " " + formatteTime || formattedDate,
      paymentID: payment._id,
    });

    // Assign reports balance ID after the report is created
    newPurchaseInvoice.reportsBalanceId = reports.id;
    await newPurchaseInvoice.save();

    // Update supplier and financial fund balances
    supplier.total += totalPurchasePriceMainCurrency || 0;
    await financialFund.save();
  } else {
    // Handle unpaid invoice logic
    let total = totalPurchasePriceMainCurrency;
    if (supplier.TotalUnpaid <= -1) {
      const t = total + supplier.TotalUnpaid;
      if (t > 0) {
        total = t;
        supplier.TotalUnpaid = t;
      } else if (t < 0) {
        supplier.TotalUnpaid = t;
        req.body.paid = "paid";
      } else {
        total = 0;
        supplier.TotalUnpaid = 0;
        req.body.paid = "paid";
      }
    } else {
      supplier.TotalUnpaid += total;
    }
    supplier.total += total || 0;

    newPurchaseInvoice = await PurchaseInvoicesModel.create({
      employee: req.user._id,
      date: date || formattedDate,
      invoicesItems: invoicesItem,
      supllier: supllierObject,
      currency,
      exchangeRate,
      financailFund,
      invoiceNumber,
      paid: "unpaid",
      totalPurchasePriceMainCurrency,
      invoiceSubTotal,
      invoiceDiscount,
      totalRemainderMainCurrency: total,
      totalRemainder: invoiceGrandTotal,
      invoiceGrandTotal,
      taxDetails,
      invoiceName,
      ManualInvoiceDiscount,
      ManualInvoiceDiscountValue,
      InvoiceDiscountType,
      subtotalWithDiscount,
      paymentDate,
      invoiceTax,
    });
  }

  const bulkProductUpdates = invoicesItem
    .filter((item) => item.type !== "unTracedproduct")
    .map((item) => ({
      updateOne: {
        filter: { qr: item.qr, "stocks.stockId": item.stock._id },
        update: {
          $inc: {
            quantity: +item.quantity,
            "stocks.$.productQuantity": +item.quantity,
          },
          $set: { buyingprice: item.orginalBuyingPrice },
        },
      },
    }));

  await ProductModel.bulkWrite(bulkProductUpdates);

  const bulkSupplierPromises = invoicesItem.map(async (item) => {
    const product = productMap.get(item.qr);
    const updates = [];

    if (product) {
      if (!product.suppliers.includes(supllierObject.id)) {
        product.suppliers.push(supllierObject.id);
        updates.push(product.save());
      }

      if (product.type !== "Service" || item.type !== "unTracedproduct") {
        const updateResult = await ActiveProductsValue.findOneAndUpdate(
          { currency: product.currency._id },
          {
            $inc: {
              activeProductsCount: item.quantity,
              activeProductsValue: item.orginalBuyingPrice * item.quantity,
            },
          },
          { new: true, upsert: true }
        );

        const totalStockQuantity = product.stocks.reduce(
          (total, stock) => total + stock.productQuantity,
          0
        );

        updates.push(
          createProductMovement(
            product._id,
            newPurchaseInvoice._id,
            totalStockQuantity,
            item.quantity,
            0,
            0,
            "movement",
            "in",
            "purchase",
            dbName
          )
        );
        if (item.orginalBuyingPrice !== product.buyingprice) {
          createProductMovement(
            product._id,
            newPurchaseInvoice._id,
            0,
            0,
            item.orginalBuyingPrice,
            product.buyingprice,
            "price",
            "in",
            "purchase",
            dbName
          );
        }
      }
    } else if (item.type === "unTracedproduct") {
      await UnTracedproductLogModel.create({
        name: item.name,
        buyingPrice: item.convertedBuyingPrice || item.orginalBuyingPrice,
        type: "purchase",
        quantity: item.quantity,
        tax: item.tax,
        totalWithoutTax: item.totalWithoutTax,
        total: item.total,
      });
    }

    return Promise.all(updates);
  });

  await Promise.all(bulkSupplierPromises);

  await supplier.save();
  await createPaymentHistory(
    "invoice",
    date + " " + formatteTime || formattedDate,
    totalPurchasePriceMainCurrency,
    supplier.TotalUnpaid,
    "supplier",
    supllierObject.id,
    invoiceNumber,
    dbName
  );
  if (paid === "paid") {
    await createPaymentHistory(
      "payment",
      date + " " + formatteTime || formattedDate,
      totalPurchasePriceMainCurrency,
      supplier.TotalUnpaid,
      "supplier",
      supllierObject.id,
      invoiceNumber,
      dbName,
      nextCounterPayment
    );
  }
  createInvoiceHistory(dbName, newPurchaseInvoice._id, "create", req.user._id);
  res.status(201).json({
    status: "success",
    message: "Invoice created successfully",
    data: newPurchaseInvoice,
  });
});

exports.updatePurchaseInvoices = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const productModel = db.model("Product", productSchema);
  const PurchaseInvoicesModel = db.model(
    "PurchaseInvoices",
    PurchaseInvoicesSchema
  );
  const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
  const SupplierModel = db.model("Supplier", supplierSchema);
  const paymentModel = db.model("Payment", PaymentSchema);
  const PaymentHistoryModel = db.model("PaymentHistory", PaymentHistorySchema);
  const ActiveProductsValue = db.model(
    "ActiveProductsValue",
    ActiveProductsValueModel
  );
  const unTracedproductLogModel = db.model(
    "unTracedproductLog",
    UnTracedproductLogSchema
  );

  const nextCounterPayment = (await paymentModel.countDocuments()) + 1;
  const { id } = req.params;
  const purchase = await PurchaseInvoicesModel.findById(id);
  if (!purchase) {
    return res.status(404).json({ message: "Purchase invoice not found" });
  }

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

  const {
    supllierObject,
    paid,
    date,
    financailFund,
    exchangeRate,
    totalInMainCurrency: totalPurchasePriceMainCurrency,
    currency,
    invoiceNumber,
    invoiceSubTotal,
    invoiceDiscount,
    invoiceGrandTotal,
    ManualInvoiceDiscount,
    ManualInvoiceDiscountValue,
    taxDetails,
    invoiceName,
    paymentInFundCurrency,
    InvoiceDiscountType,
    subtotalWithDiscount,
    paymentDate,
    invoiceTax,
    invoicesItems,
  } = req.body;

  const originalItems = purchase.invoicesItems;
  const updatedItems = req.body.invoicesItems;
  const bulkProductUpdatesOriginal = [];
  const bulkProductUpdatesNew = [];
  const ReportsFinancialFundsModel = db.model(
    "ReportsFinancialFunds",
    reportsFinancialFundsSchema
  );

  if (purchase.payments.length <= 0) {
    // Reverting the quantities of original items
    originalItems
      .filter((item) => item.type !== "unTracedproduct")
      .forEach((item) => {
        bulkProductUpdatesOriginal.push({
          updateOne: {
            filter: { qr: item.qr, "stocks.stockId": item.stock._id },
            update: {
              $inc: {
                quantity: -item.quantity,
                "stocks.$.productQuantity": -item.quantity,
              },
            },
          },
        });
      });

    // Applying the quantities of updated items
    updatedItems
      .filter((item) => item.type !== "unTracedproduct")
      .forEach((item) => {
        bulkProductUpdatesNew.push({
          updateOne: {
            filter: { qr: item.qr, "stocks.stockId": item.stock._id },
            update: {
              $inc: {
                quantity: +item.quantity,
                "stocks.$.productQuantity": +item.quantity,
              },
              $set: { buyingprice: item.orginalBuyingPrice },
            },
          },
        });
      });

    try {
      await productModel.bulkWrite(bulkProductUpdatesOriginal);
      await productModel.bulkWrite(bulkProductUpdatesNew);
    } catch (error) {
      console.error("Error during bulk updates:", error);
      return next(new ApiError("Bulk update failed" + error, 500));
    }

    const purchaseSupplier = await SupplierModel.findById(purchase.supllier.id);
    const supplier = await SupplierModel.findById(supllierObject.id);
    let newPurchaseInvoice;
    if (paid === "paid") {
      const financialFund = await FinancialFundsModel.findById(
        financailFund.value
      );
      financialFund.fundBalance -= fundPricePurchaseInvocie;

      newPurchaseInvoice = await PurchaseInvoicesModel.create({
        employee: req.user._id,
        invoicesItems: invoicesItems,
        date: date || formattedDate,
        supllier: supllierObject,
        currency,
        exchangeRate,
        financailFund,
        invoiceNumber,
        paid,
        totalPurchasePriceMainCurrency,
        invoiceSubTotal,
        invoiceDiscount,
        invoiceGrandTotal,
        taxDetails,
        invoiceName,
        paymentInFundCurrency: paymentInFundCurrency,
        ManualInvoiceDiscount,
        ManualInvoiceDiscountValue,
        InvoiceDiscountType,
        subtotalWithDiscount,
        paymentDate,
        invoiceTax,
      });
      newPurchaseInvoice = await PurchaseInvoicesModel.updateOne(
        { _id: id },
        newInvoiceData
      );
      const reports = await ReportsFinancialFundsModel.create({
        date: date || formattedDate,
        invoice: newPurchaseInvoice._id,
        amount: paymentInFundCurrency,
        type: "purchase",
        exchangeRate: exchangeRate,
        exchangeAmount: totalPurchasePriceMainCurrency,
        financialFundId: financailFund.value,
        financialFundRest: financialFund.fundBalance,
      });
      purchase.payments.push({
        payment: paymentInFundCurrency,
        paymentMainCurrency: totalPurchasePriceMainCurrency,
        financialFunds: financialFund.fundName,
        date: date || formattedDate,
      });
      purchase.reportsBalanceId = reports.id;
      await purchase.save();
      await financialFund.save();

      await paymentModel.create({
        supplierId: supllierObject.id,
        supplierName: supllierObject.name,
        total: paymentInFundCurrency,
        totalMainCurrency: totalPurchasePriceMainCurrency,
        exchangeRate: financialFund.fundCurrency.exchangeRate,
        currencyCode: financialFund.fundCurrency.currencyCode,
        date: date,
        invoiceNumber: invoiceNumber,
        counter: nextCounterPayment,
        payid: {
          id: newPurchaseInvoice._id,
          status: "paid",
          paymentInFundCurrency: paymentInFundCurrency,
          paymentMainCurrency: totalPurchasePriceMainCurrency,
        },
      });

      if (supllierObject.id === purchase.supllier.id) {
        supplier.total +=
          totalPurchasePriceMainCurrency -
          purchase.totalPurchasePriceMainCurrency;
      } else {
        purchaseSupplier.total -= purchase.totalPurchasePriceMainCurrency;
        await purchaseSupplier.save();
        supplier.total += totalPurchasePriceMainCurrency;
      }
      await supplier.save();
    } else {
      if (supllierObject.id === purchase.supllier.id) {
        supplier.TotalUnpaid +=
          totalPurchasePriceMainCurrency -
          purchase.totalPurchasePriceMainCurrency;
        supplier.total +=
          totalPurchasePriceMainCurrency -
          purchase.totalPurchasePriceMainCurrency;
      } else {
        purchaseSupplier.total -= purchase.totalPurchasePriceMainCurrency;
        purchaseSupplier.TotalUnpaid -= purchase.totalPurchasePriceMainCurrency;
        await purchaseSupplier.save();
        supplier.total += totalPurchasePriceMainCurrency;
        supplier.TotalUnpaid += totalPurchasePriceMainCurrency;
      }
      await supplier.save();
      const newInvoiceData = {
        employee: req.user._id,
        date: date || formattedDate,
        invoicesItems: invoicesItems,
        supllier: supllierObject,
        currency,
        exchangeRate,
        financailFund,
        invoiceNumber,
        paid: "unpaid",
        totalPurchasePriceMainCurrency,
        invoiceSubTotal,
        invoiceDiscount,
        totalRemainderMainCurrency: totalPurchasePriceMainCurrency,
        totalRemainder: invoiceGrandTotal,
        invoiceGrandTotal,
        taxDetails,
        invoiceName,
        ManualInvoiceDiscount,
        ManualInvoiceDiscountValue,
        InvoiceDiscountType,
        subtotalWithDiscount,
        paymentDate,
        invoiceTax,
      };
      newPurchaseInvoice = await PurchaseInvoicesModel.updateOne(
        { _id: id },
        newInvoiceData
      );
    }

    await PaymentHistoryModel.deleteMany({
      invoiceNumber: invoiceNumber,
    });

    await createPaymentHistory(
      "invoice",
      date || formattedDate,
      totalPurchasePriceMainCurrency,
      supplier.TotalUnpaid,
      "supplier",
      supllierObject.id,
      invoiceNumber,
      dbName
    );

    invoicesItems.map(async (item, index) => {
      const product = await productModel.findOne({ qr: item.qr });

      if (
        (product && product.type !== "Service") ||
        item.type !== "unTracedproduct"
      ) {
        const existingRecord = await ActiveProductsValue.findOne({
          currency: product.currency._id,
        });
        if (existingRecord) {
          const quantity = item.quantity || 0;
          const quantityBefor = purchase.invoicesItems[index].quantity || 0;
          const buyingPriceOriginal = item.orginalBuyingPrice || 0;
          const buyingPriceOriginalBefor =
            purchase.invoicesItems[index].orginalBuyingPrice || 0;
          existingRecord.activeProductsCount += quantity - quantityBefor;

          const currentValue =
            buyingPriceOriginal * quantity -
            buyingPriceOriginalBefor * quantityBefor;

          existingRecord.activeProductsValue += currentValue;

          await existingRecord.save();
        } else {
          await createActiveProductsValue(0, 0, product.currency._id, dbName);
        }
        const totalStockQuantity = product.stocks.reduce(
          (total, stock) => total + stock.productQuantity,
          0
        );
        createProductMovement(
          product._id,
          totalStockQuantity,
          item.quantity,
          0,
          0,
          "movement",
          "out",
          "Purchase Invoice",
          dbName
        );
      } else if (item.type === "unTracedproduct") {
        await unTracedproductLogModel.create({
          name: item.name,
          buyingPrice: item.convertedBuyingPrice || item.orginalBuyingPrice,
          type: "purchase",
          quantity: item.quantity,
          tax: item.tax,
          totalWithoutTax: item.totalWithoutTax,
          total: item.total,
        });
      }
    });

    if (paid === "paid") {
      await createPaymentHistory(
        "payment",
        date || formattedDate,
        totalPurchasePriceMainCurrency,
        supplier.TotalUnpaid,
        "supplier",
        supllierObject.id,
        invoiceNumber,
        dbName,
        description,
        nextCounterPayment
      );
    }
    const history = await createInvoiceHistory(
      dbName,
      id,
      "edit",
      req.user._id,
      date
    );
    res.status(200).json({
      status: "success",
      message: "Purchase invoice updated successfully",
      data: newPurchaseInvoice,
    });
  } else {
    return next(new ApiError("You Have a payment for this Invicoe", 500));
  }
});

exports.returnPurchaseInvoiceOld = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  const productModel = db.model("Product", productSchema);
  const returnModel = db.model(
    "ReturenPurchaseInvoice",
    refundPurchaseInviceModel
  );
  const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
  const ReportsFinancialFundsModel = db.model(
    "ReportsFinancialFunds",
    reportsFinancialFundsSchema
  );
  const SupplierModel = db.model("Supplier", supplierSchema);

  // Helper function to format date
  const formatDate = (date) => {
    const padZero = (value) => (value < 10 ? `0${value}` : value);
    return `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(
      date.getDate()
    )} ${padZero(date.getHours())}:${padZero(date.getMinutes())}:${padZero(
      date.getSeconds()
    )}`;
  };
  const formattedDate = formatDate(new Date());

  // Destructure body properties
  const {
    invoices,
    suppliersId,
    sup,
    supplierPhone,
    supplierEmail,
    supplierAddress,
    supplierCompany,
    totalProductTax,
    totalPriceWitheOutTax,
    finalPrice,
    priceExchangeRate,
    totalQuantity,
    totalbuyingprice,
    invoiceCurrencyId,
    invoiceCurrency,
    paid,
    finalPriceMainCurrency,
    totalPurchasePrice,
    invoiceFinancialFund,
  } = req.body;

  const invoiceItems = [];
  const nextCounter = (await returnModel.countDocuments()) + 1;

  for (const item of invoices) {
    const { qr, quantity, buyingprice, taxRate, exchangeRate, stockId } = item;
    const productDoc = await productModel.findOne({ qr });
    if (!productDoc)
      return res.status(400).json({
        status: "error",
        message: `Product not found or insufficient quantity for QR: ${qr}`,
      });

    invoiceItems.push({
      product: productDoc._id,
      name: productDoc.name,
      quantity,
      qr,
      taxRate,
      buyingprice,
      exchangeRate,
      stockId,
    });
  }

  const newPurchaseInvoice = new returnModel({
    invoices: invoiceItems,
    paidAt: formattedDate,
    suppliers: suppliersId,
    supplier: sup,
    supplierPhone,
    supplierEmail,
    supplierAddress,
    supplierCompany,
    finalPriceMainCurrency,
    priceExchangeRate,
    totalPriceWitheOutTax,
    totalbuyingprice,
    finalPrice,
    totalQuantity,
    employee: req.user._id,
    invoiceCurrencyId,
    invoiceCurrency,
    totalPurchasePrice,
    counter: nextCounter,
  });

  // Bulk product updates
  const bulkUpdates = invoiceItems.map((item) => ({
    updateOne: {
      filter: { qr: item.qr, "stocks.stockId": item.stockId },
      update: {
        $inc: {
          quantity: -item.quantity,
          activeCount: -item.quantity,
          "stocks.$.productQuantity": -item.quantity,
        },
      },
    },
  }));

  await productModel.bulkWrite(bulkUpdates);

  // Supplier updates
  const supplier = await SupplierModel.findById(suppliersId);
  invoiceItems.forEach(({ qr, quantity }) => {
    const existingProduct = supplier.products.find((p) => p.qr === qr);
    if (existingProduct) existingProduct.quantity -= quantity;
  });
  await supplier.save();

  // Save the invoice
  const savedInvoice = await newPurchaseInvoice.save();

  // Handle financial fund updates
  if (paid !== "unpaid") {
    const financialFund = await FinancialFundsModel.findById(
      invoiceFinancialFund
    );
    financialFund.fundBalance += priceExchangeRate;
    await ReportsFinancialFundsModel.create({
      date: new Date().toISOString(),
      invoice: savedInvoice._id,
      amount: priceExchangeRate,
      type: "refund-purchase",
      exchangeRate: priceExchangeRate * req.body.financailFundExchangeRate,
      finalPriceMainCurrency,
      financialFundId: invoiceFinancialFund,
      financialFundRest: financialFund.fundBalance,
    });
    await financialFund.save();
  }

  // Update active product values and movement
  const ActiveProductsValue = db.model(
    "ActiveProductsValue",
    ActiveProductsValueModel
  );
  const currencyTotals = {};
  for (const item of invoiceItems) {
    const product = await productModel.findOne({ qr: item.qr });
    if (product) {
      const currencyId = product.currency._id;
      currencyTotals[currencyId] = currencyTotals[currencyId] || {
        totalCount: 0,
        totalValue: 0,
      };
      currencyTotals[currencyId].totalValue +=
        (item.buyingprice / item.exchangeRate) * item.quantity;
      currencyTotals[currencyId].totalCount += item.quantity;
    }
  }

  for (const currencyId in currencyTotals) {
    const { totalCount, totalValue } = currencyTotals[currencyId];
    const existingRecord = await ActiveProductsValue.findOne({
      currency: currencyId,
    });
    console.log(totalValue);
    if (existingRecord) {
      existingRecord.activeProductsCount -= totalCount;
      existingRecord.activeProductsValue -= totalValue || 0;
      await existingRecord.save();
    } else {
      await createActiveProductsValue(
        totalCount,
        totalValue,
        currencyId,
        dbName
      );
    }
  }

  // Create invoice history and respond
  const history = createInvoiceHistory(
    dbName,
    savedInvoice._id,
    "return",
    req.user._id
  );
  res.status(201).json({ status: "success", data: savedInvoice, history });
});

exports.refundPurchaseInvoice = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  // Model definitions
  const ProductModel = db.model("Product", productSchema);
  const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
  const ReportsFinancialFundsModel = db.model(
    "ReportsFinancialFunds",
    reportsFinancialFundsSchema
  );
  const SupplierModel = db.model("Supplier", supplierSchema);
  const PurchaseInvoicesModel = db.model(
    "RefundPurchaseInvoice",
    refundPurchaseInviceModel
  );
  const PaymentModel = db.model("Payment", PaymentSchema);
  const ActiveProductsValue = db.model(
    "ActiveProductsValue",
    ActiveProductsValueModel
  );
  const nextCounterPayment = (await PaymentModel.countDocuments()) + 1;

  const formattedDate = new Date().toISOString().replace("T", " ").slice(0, 19); // Simplified date formatting
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
  const {
    supllierObject,
    paid,
    date,
    financailFund,
    exchangeRate,
    totalInMainCurrency: totalPurchasePriceMainCurrency,
    currency,
    invoiceNumber,
    invoiceSubTotal,
    invoiceDiscount,
    invoiceGrandTotal,
    ManualInvoiceDiscount,
    taxDetails,
    invoiceName,
    paymentInFundCurrency,
    InvoiceDiscountType,
    subtotalWithDiscount,
    paymentDate,
  } = req.body;

  let supplier, invoicesItem, newPurchaseInvoice;

  try {
    invoicesItem = JSON.parse(req.body.invoicesItems);
    supplier = await SupplierModel.findById(supllierObject.id);
    if (!supplier) throw new Error("Supplier not found");
  } catch (error) {
    return res.status(400).json({ status: "error", message: error.message });
  }

  const productQRCodes = invoicesItem.map((item) => item.qr);
  const products = await ProductModel.find({
    qr: { $in: productQRCodes },
  });

  // Create a map for quick product lookups by QR code
  const productMap = new Map(products.map((prod) => [prod.qr, prod]));

  // Prepare and update invoice items with product data
  const invoiceItems = invoicesItem.map((item) => {
    const productDoc = productMap.get(item.qr);
    if (!productDoc)
      throw new Error(`Product not found for QR code: ${item.qr}`);
    return {
      ...item,
      name: productDoc.name,
      profitRatio: item.profitRatio || 0,
    };
  });

  try {
    // Handle invoice creation based on 'paid' status
    if (paid === "paid") {
      // Handle paid invoice logic
      const financialFund = await FinancialFundsModel.findById(
        financailFund.value
      );
      if (!financialFund) throw new Error("Financial fund not found");

      financialFund.fundBalance -= paymentInFundCurrency;

      newPurchaseInvoice = await PurchaseInvoicesModel.create({
        employee: req.user._id,
        invoicesItems: invoiceItems,
        date: date || formattedDate,
        supllier: supllierObject,
        currency,
        exchangeRate,
        financailFund,
        invoiceNumber,
        paid,
        totalPurchasePriceMainCurrency,
        invoiceSubTotal,
        invoiceDiscount,
        invoiceGrandTotal,
        taxDetails,
        invoiceName,
        paymentInFundCurrency: paymentInFundCurrency,
        ManualInvoiceDiscount,
        InvoiceDiscountType,
        subtotalWithDiscount,
        paymentDate,
      });
      // Use Promise.all for parallel database operations
      const [reports, payment] = await Promise.all([
        ReportsFinancialFundsModel.create({
          date: date || formattedDate,
          invoice: newPurchaseInvoice._id,
          amount: paymentInFundCurrency,
          type: "refund-purchase",
          exchangeRate,
          financialFundId: financailFund.value,
          financialFundRest: financialFund.fundBalance,
        }),
        PaymentModel.create({
          supplierId: supplier.value,
          supplierName: supplier.label,
          total: invoiceGrandTotal,
          totalMainCurrency: totalPurchasePriceMainCurrency,
          exchangeRate: financialFund.fundCurrency.exchangeRate,
          currencyCode: financialFund.fundCurrency.currencyCode,
          date: date + " " + formatteTime || formattedDate,
          invoiceNumber: invoiceNumber,
          counter: nextCounterPayment,
        }),
      ]);

      newPurchaseInvoice.payments.push({
        payment: paymentInFundCurrency,
        paymentMainCurrency: totalPurchasePriceMainCurrency,
        financialFunds: financialFund.fundName,
        financialFundsCurrencyCode: financialFund.label,
        date: date + " " + formatteTime || formattedDate,
        paymentID: payment._id,
      });

      // Assign reports balance ID after the report is created
      newPurchaseInvoice.reportsBalanceId = reports.id;
      await newPurchaseInvoice.save();

      // Update supplier and financial fund balances
      supplier.total +=
        totalPurchasePriceMainCurrency - ManualInvoiceDiscount || 0;
      await financialFund.save();
    } else {
      // Handle unpaid invoice logic
      let total = totalPurchasePriceMainCurrency - ManualInvoiceDiscount;
      if (supplier.TotalUnpaid <= -1) {
        const t = total + supplier.TotalUnpaid;
        if (t > 0) {
          total = t;
          supplier.TotalUnpaid = t;
        } else if (t < 0) {
          supplier.TotalUnpaid = t;
          req.body.paid = "paid";
        } else {
          total = 0;
          supplier.TotalUnpaid = 0;
          req.body.paid = "paid";
        }
      } else {
        supplier.TotalUnpaid += total;
      }
      supplier.total += total || 0;

      newPurchaseInvoice = await PurchaseInvoicesModel.create({
        employee: req.user._id,
        date: date || formattedDate,
        invoicesItems: invoiceItems,
        supllier: supllierObject,
        currency,
        exchangeRate,
        financailFund,
        invoiceNumber,
        paid: "unpaid",
        totalPurchasePriceMainCurrency,
        invoiceSubTotal,
        invoiceDiscount,
        totalRemainderMainCurrency: totalPurchasePriceMainCurrency,
        totalRemainder: invoiceGrandTotal,
        invoiceGrandTotal,
        taxDetails,
        invoiceName,
        ManualInvoiceDiscount,
        InvoiceDiscountType,
        subtotalWithDiscount,
        paymentDate,
      });
    }

    // Bulk update product quantities and stock information
    const bulkProductUpdates = invoicesItem.map((item) => ({
      updateOne: {
        filter: { qr: item.qr, "stocks.stockId": item.stock._id },
        update: {
          $inc: {
            quantity: -item.quantity,
            "stocks.$.productQuantity": -item.quantity,
          },
        },
      },
    }));

    await ProductModel.bulkWrite(bulkProductUpdates);

    const bulkSupplierPromises = invoicesItem.map(async (item) => {
      const product = productMap.get(item.qr);
      const updates = [];

      if (product) {
        if (!product.suppliers.includes(supllierObject.value)) {
          product.suppliers.push(supllierObject.value);
          updates.push(product.save());
        }

        if (product.type !== "Service") {
          const updateResult = await ActiveProductsValue.findOneAndUpdate(
            { currency: product.currency._id },
            {
              $inc: {
                activeProductsCount: -item.quantity,
                activeProductsValue: -item.orginalBuyingPrice * item.quantity,
              },
            },
            { new: true, upsert: true } // Ensures document is created if it doesn't exist
          );

          const totalStockQuantity = product.stocks.reduce(
            (total, stock) => total + stock.productQuantity,
            0
          );

          // Log product movement
          updates.push(
            createProductMovement(
              product._id,
              totalStockQuantity,
              item.quantity,
              0,
              0,
              "movement",
              "out",
              "Purchase Invoice",
              dbName
            )
          );
        }
      }

      return Promise.all(updates); // Await all updates for this item
    });

    // Ensure all mapped promises are awaited
    await Promise.all(bulkSupplierPromises);

    await supplier.save();
    await createPaymentHistory(
      "invoice",
      date + " " + formatteTime || formattedDate,
      totalPurchasePriceMainCurrency,
      supplier.TotalUnpaid,
      "supplier",
      supllierObject.id,
      invoiceNumber,
      dbName
    );
    if (paid === "paid") {
      await createPaymentHistory(
        "payment",
        date + " " + formatteTime || formattedDate,
        totalPurchasePriceMainCurrency,
        supplier.TotalUnpaid,
        "supplier",
        supllierObject.id,
        invoiceNumber,
        dbName,
        nextCounterPayment
      );
    }
    createInvoiceHistory(
      dbName,
      newPurchaseInvoice._id,
      "create",
      req.user._id
    );
    res.status(201).json({
      status: "success",
      message: "Invoice created successfully",
      data: newPurchaseInvoice,
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

exports.getReturnPurchase = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  db.model("Employee", emoloyeeShcema);

  const returnModel = db.model(
    "RefundPurchaseInvoice",
    refundPurchaseInviceModel
  );

  const { totalPages, mongooseQuery } = await Search(returnModel, req);

  const refund = await mongooseQuery;
  res.status(200).json({
    status: "success",
    results: refund.length,
    Pages: totalPages,
    data: refund,
  });
});

exports.getOneReturnPurchase = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  db.model("Employee", emoloyeeShcema);
  db.model("Tax", TaxSchema);
  db.model("Supplier", supplierSchema);
  db.model("FinancialFunds", financialFundsSchema);
  db.model("Currency", currencySchema);
  const returnModel = db.model(
    "RefundPurchaseInvoice",
    refundPurchaseInviceModel
  );

  const { id } = req.params;
  const purchase = await returnModel.findById(id);
  if (!purchase) {
    return next(new ApiError(`No purchase for this id ${id}`, 404));
  }
  res.status(200).json({ status: "true", data: purchase });
});

exports.cancelPurchaseInvoice = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const ProductModel = db.model("Product", productSchema);
  const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
  const ReportsFinancialFundsModel = db.model(
    "ReportsFinancialFunds",
    reportsFinancialFundsSchema
  );
  const SupplierModel = db.model("Supplier", supplierSchema);
  const PurchaseInvoicesModel = db.model(
    "PurchaseInvoices",
    PurchaseInvoicesSchema
  );
  const ActiveProductsValue = db.model(
    "ActiveProductsValue",
    ActiveProductsValueModel
  );
  const PaymentHistoryModel = db.model("PaymentHistory", PaymentHistorySchema);

  db.model("Stock", stockSchema);

  const { id } = req.params;
  // 1) find prucseInvices
  const purchaseInvoices = await PurchaseInvoicesModel.findById(id);
  const supplier = await SupplierModel.findOne({
    _id: purchaseInvoices.supllier.id,
  });

  if (
    purchaseInvoices.payments.length <= 0 &&
    purchaseInvoices.type !== "cancel"
  ) {
    try {
      // 2) Take Out the Quantity
      const bulkProductUpdates = purchaseInvoices.invoicesItems.map((item) => ({
        updateOne: {
          filter: { qr: item.qr, "stocks.stockId": item.stock._id },
          update: {
            $inc: {
              quantity: -item.quantity,
              "stocks.$.productQuantity": -item.quantity,
            },
          },
        },
      }));
      await ProductModel.bulkWrite(bulkProductUpdates);
      // 3) Take out in the Active Quantity
      purchaseInvoices.invoicesItems.map(async (item) => {
        try {
          const product = await ProductModel.findOne({ qr: item.qr });
          const updates = [];
          if (product && product.type !== "Service") {
            // Find or create ActiveProductsValue record
            const existingRecord = await ActiveProductsValue.findOne({
              currency: product.currency._id,
            });
            if (existingRecord) {
              existingRecord.activeProductsCount -= item.quantity;
              existingRecord.activeProductsValue -=
                item.orginalBuyingPrice * item.quantity;
              await existingRecord.save();
            } else {
              await createActiveProductsValue(
                0,
                0,
                product.currency._id,
                dbName
              );
            }

            // Calculate total stock quantity after updates
            const totalStockQuantity = product.stocks.reduce(
              (total, stock) => total + stock.productQuantity,
              0
            );

            updates.push(
              createProductMovement(
                product.id,
                id,
                totalStockQuantity,
                item.quantity,
                0,
                0,
                "movement",
                "out",
                "Purchase Invoice",
                dbName
              )
            );
          }
          await Promise.all(updates);
        } catch (error) {
          console.error(`Error processing item with qr ${item.qr}:`, error);
        }
      });

      // Execute all promises at once

      supplier.total -= purchaseInvoices.totalRemainderMainCurrency;
      supplier.TotalUnpaid -= purchaseInvoices.totalRemainderMainCurrency;
      await supplier.save();

      // 4) minus balance form Fund and delete archives Reports in Supplier
      if (purchaseInvoices.reportsBalanceId) {
        const reportsBalanceId =
          await ReportsFinancialFundsModel.findByIdAndUpdate(
            {
              _id: purchaseInvoices.reportsBalanceId,
            },
            { archives: true },
            { new: true }
          );
        const financialFund = await FinancialFundsModel.findById(
          reportsBalanceId.financialFundId
        );

        // Update the fund balance
        await FinancialFundsModel.findOneAndUpdate(
          { _id: reportsBalanceId.financialFundId },
          { fundBalance: financialFund.fundBalance - reportsBalanceId.amount },
          { new: true }
        );
      }
      await PaymentHistoryModel.deleteMany({
        invoiceNumber: purchaseInvoices.invoiceNumber,
      });
      const history = createInvoiceHistory(dbName, id, "cancel", req.user._id);
      purchaseInvoices.type = "cancel";
      purchaseInvoices.totalRemainderMainCurrency = 0;
      purchaseInvoices.totalRemainder = 0;
      await purchaseInvoices.save();
      res.status(200).json({ message: "cancel is success" });
    } catch (e) {
      return next(new ApiError(`have a problem ${e}`, 500));
    }
  } else {
    return next(
      new ApiError("Have a Payment pless delete the Payment or Canceled ", 500)
    );
  }
});

/*
exports.updateInvoicesQuantity = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  db.model("Supplier", supplierSchema);
  db.model("Employee", emoloyeeShcema);
  db.model("Currency", currencySchema);
  const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
  const PurchaseInvoicesModel = db.model(
    "PurchaseInvoices",
    PurchaseInvoicesSchema
  );
  const { quantity } = req.body;
  const cart = await PurchaseInvoicesModel.findOne({ employee: req.user._id });
  if (!cart) {
    return next(
      new ApiError(`there is no cart for user ${req.user._id} `, 404)
    );
  }
  const itemIndex = cart.invoices.findIndex(
    (item) => item._id.toString() === req.params.itemId
  );

  if (itemIndex > -1) {
    const cartItem = cart.invoices[itemIndex];
    cartItem.quantity = quantity;
    cartItem.quantity = quantity;
    cart.invoices[itemIndex] = cartItem;
  } else {
    return next(
      new ApiError(`there is no item for this id: ${req.params.itemId}`, 404)
    );
  }

  await cart.save();
  res.status(200).json({
    status: "success",
    numberinvoices: cart.invoices.length,
    data: cart,
  });
});
*/

// exports.updateInvoices = asyncHandler(async (req, res, next) => {
//   const dbName = req.query.databaseName;
//   const db = mongoose.connection.useDb(dbName);
//   const productModel = db.model("Product", productSchema);
//   db.model("Tax", TaxSchema);
//   db.model("Currency", currencySchema);
//   db.model("Employee", emoloyeeShcema);
//   db.model("Category", categorySchema);
//   db.model("brand", brandSchema);
//   db.model("Labels", labelsSchema);
//   db.model("Unit", UnitSchema);
//   db.model("Variant", variantSchema);

//   const supplier = db.model("Supplier", supplierSchema);
//   const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
//   const ReportsFinancialFundsModel = db.model(
//     "ReportsFinancialFunds",
//     reportsFinancialFundsSchema
//   );
//   const PurchaseInvoicesModel = db.model(
//     "PurchaseInvoices",
//     PurchaseInvoicesSchema
//   );
//   const { id } = req.params;
//   if (req.body.paid == "paid") {
//     const {
//       financialFund,
//       finalPrice,
//       finalPriceExchangeRate,
//       finalPriceMainCurrency,
//     } = req.body;
//     // Find the financial fund
//     const existingFinancialFund = await FinancialFundsModel.findById(
//       financialFund
//     );
//     if (!existingFinancialFund) {
//       return next(new ApiError(`Financial fund not found`, 404));
//     }

//     // Find the purchase invoice
//     const existingInvoice = await PurchaseInvoicesModel.findById(id);
//     const oldInvoice = existingInvoice;
//     if (!existingInvoice) {
//       return next(new ApiError(`Purchase invoice not found`, 404));
//     }

//     const supplierId = await supplier.findById(req.body.suppliers);
//     // Update the financial fund balance
//     existingFinancialFund.fundBalance -= finalPriceExchangeRate;
//     supplierId.TotalUnpaid += req.body.beforTotal;
//     supplierId.total += req.body.beforTotal;
//     await supplierId.save();
//     console.log(req.body.beforTotal);
//     await existingFinancialFund.save();

//     // Update the purchase invoice
//     const updatedInvoice = await PurchaseInvoicesModel.findByIdAndUpdate(
//       id,
//       {
//         ...req.body,
//         paid: req.body.paid,
//       },
//       { new: true }
//     );

//     bulkOption = req.body.invoices.map((item) => ({
//       updateOne: {
//         filter: { _id: item.product },
//         update: {
//           $inc: {
//             quantity: item.beforQuantity
//               ? +item.quantity - item.beforQuantity
//               : +item.quantity,
//             activeCount: item.beforQuantity
//               ? +item.quantity - item.beforQuantity
//               : +item.quantity,
//           },
//           $set: {
//             serialNumber: item.serialNumber,
//             buyingprice: item.buyingpriceOringal,
//             tax: item.taxId,
//             price: item.price,
//             taxPrice: item.taxPrice,
//           },
//         },
//       },
//     }));
//     try {
//       await productModel.bulkWrite(bulkOption, {});
//       // Create a financial record
//       const data = new Date();
//       const isaaaa = data.toISOString();
//       await ReportsFinancialFundsModel.create({
//         date: isaaaa,
//         invoice: updatedInvoice._id,
//         // amount: finalPrice,
//         amount: finalPrice,
//         exchangeRate: req.body.invoiceCurrencyExchangeRate,
//         finalPriceMainCurrency: finalPriceMainCurrency,
//         type: "purchase",
//         financialFundId: existingFinancialFund._id,
//         financialFundRest: existingFinancialFund.fundBalance,
//       });

//       try {
//         const ActiveProductsValue = db.model(
//           "ActiveProductsValue",
//           ActiveProductsValueModel
//         );

//         const currencyDiffs = {};

//         for (const updatedItem of updatedInvoice.invoices) {
//           const existingItem = oldInvoice.invoices.find((item) =>
//             item._id.equals(updatedItem._id)
//           );

//           if (existingItem) {
//             const quantityDiff = updatedItem.quantity - existingItem.quantity;
//             const valueDiff =
//               Number(updatedItem.totalPrice) - Number(existingItem.totalPrice);

//             // Fetch the product to get the currency ID
//             const product = await productModel.findOne({ qr: updatedItem.qr });

//             if (product) {
//               const currencyId = product.currency._id;

//               if (!currencyDiffs[currencyId]) {
//                 currencyDiffs[currencyId] = {
//                   totalCountDiff: 0,
//                   totalValueDiff: 0,
//                 };
//               }

//               currencyDiffs[currencyId].totalCountDiff += quantityDiff;
//               currencyDiffs[currencyId].totalValueDiff += valueDiff;
//             } else {
//               console.warn(`Product with QR ${updatedItem.qr} not found.`);
//             }
//           }
//         }

//         for (const currencyId in currencyDiffs) {
//           if (currencyDiffs.hasOwnProperty(currencyId)) {
//             const { totalCountDiff, totalValueDiff } =
//               currencyDiffs[currencyId];
//             const existingRecord = await ActiveProductsValue.findOne({
//               currency: currencyId,
//             });

//             if (existingRecord) {
//               existingRecord.activeProductsCount += totalCountDiff;
//               existingRecord.activeProductsValue += totalValueDiff;
//               await existingRecord.save();
//             } else {
//               await createActiveProductsValue(
//                 totalCountDiff,
//                 totalValueDiff,
//                 currencyId,
//                 dbName
//               );
//             }
//           }
//         }
//       } catch (err) {
//         console.log("purchaseInvoicesServices 530");
//         console.log(err.message);
//       }

//       req.body.invoices.map(async (item) => {
//         const { quantity } = await productModel.findOne({ qr: item.qr });
//         createProductMovement(
//           item.product,
//           quantity,
//           item.quantity - item.beforQuantity,
//           "edit",
//           "updatepurchase",
//           dbName
//         );
//       });

//       const history = createInvoiceHistory(
//         dbName,
//         updatedInvoice._id,
//         "edit",
//         req.user._id
//       );

//       // Respond with the updated invoice
//       res
//         .status(200)
//         .json({ status: "success", data: updatedInvoice, history });
//     } catch (error) {
//       return new ApiError(
//         `Error updating purchase invoice: ${error.message}`,
//         500
//       );
//     }
//   } else {
//     let bulkOption;
//     // Find the purchase invoice
//     const existingInvoice = await PurchaseInvoicesModel.findById(id);
//     const oldInvoice = existingInvoice;

//     if (!existingInvoice) {
//       return next(new ApiError(`Purchase invoice not found`, 404));
//     }
//     const supplierId = await supplier.findById(req.body.suppliers);
//     supplierId.TotalUnpaid -= req.body.finalPriceBefor;
//     supplierId.TotalUnpaid += req.body.finalPriceAfter;
//     supplierId.total -= req.body.finalPriceBefor;
//     supplierId.total += req.body.finalPriceAfter;
//     existingInvoice.totalRemainderMainCurrency -=
//       req.body.finalPriceMainCurrency;
//     existingInvoice.totalRemainder -= req.body.finalPrice;
//     await supplierId.save();
//     await existingInvoice.save();
//     // Update the purchase invoice
//     const updatedInvoice = await PurchaseInvoicesModel.findByIdAndUpdate(
//       id,
//       {
//         ...req.body,
//         paid: req.body.paid,
//       },
//       { new: true }
//     );

//     bulkOption = req.body.invoices.map((item) => ({
//       updateOne: {
//         filter: { _id: item.product },
//         update: {
//           $inc: {
//             quantity: item.beforQuantity
//               ? +item.quantity - item.beforQuantity
//               : +item.quantity,
//             activeCount: item.beforQuantity
//               ? +item.quantity - item.beforQuantity
//               : +item.quantity,
//           },
//           $set: {
//             serialNumber: item.serialNumber,
//             buyingprice: item.buyingpriceOringal,
//             tax: item.taxId,
//             price: item.price,
//             taxPrice: item.taxPrice,
//           },
//         },
//       },
//     }));
//     try {
//       await productModel.bulkWrite(bulkOption, {});
//       req.body.invoices.map(async (item) => {
//         const { quantity } = await productModel.findOne({ qr: item.qr });
//         createProductMovement(
//           item.product,
//           quantity,
//           item.quantity,
//           "in",
//           "updatepurchase",
//           dbName,
//           next
//         );
//       });

//       try {
//         const ActiveProductsValue = db.model(
//           "ActiveProductsValue",
//           ActiveProductsValueModel
//         );
//         const existingRecord = await ActiveProductsValue.findOne();
//         let totalCountDiff = 0;
//         let totalValueDiff = 0;

//         updatedInvoice.invoices.forEach((updatedItem) => {
//           const existingItem = oldInvoice.invoices.find((item) =>
//             item.product.equals(updatedItem.product)
//           );

//           if (existingItem) {
//             const quantityDiff = updatedItem.quantity - existingItem.quantity;
//             const valueDiff =
//               Number(updatedItem.totalPrice) - Number(existingItem.totalPrice);

//             totalCountDiff += quantityDiff;
//             totalValueDiff += valueDiff;
//           }
//         });

//         if (existingRecord) {
//           existingRecord.activeProductsCount += totalCountDiff;
//           existingRecord.activeProductsValue += totalValueDiff;
//           await existingRecord.save();
//         } else {
//           await createActiveProductsValue(
//             totalCountDiff,
//             totalValueDiff,
//             dbName
//           );
//         }
//       } catch (err) {
//         console.log("purchaseInvoicesServices 638");
//         console.log(err.message);
//       }
//       const history = createInvoiceHistory(
//         dbName,
//         updatedInvoice._id,
//         "edit",
//         req.user._id
//       );

//       res
//         .status(200)
//         .json({ status: "success", data: updatedInvoice, history });
//     } catch (error) {
//       return new ApiError(
//         `Error updating purchase invoice: ${error.message}`,
//         500
//       );
//     }
//   }
// });

// exports.createProductInvoices = asyncHandler(async (req, res, next) => {
//   const dbName = req.query.databaseName;
//   const db = mongoose.connection.useDb(dbName);
//   const productModel = db.model("Product", productSchema);
//   const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
//   const ReportsFinancialFundsModel = db.model(
//     "ReportsFinancialFunds",
//     reportsFinancialFundsSchema
//   );
//   const suppl = db.model("Supplier", supplierSchema);
//   db.model("Currency", currencySchema);
//   db.model("Employee", emoloyeeShcema);
//   db.model("Category", categorySchema);
//   db.model("brand", brandSchema);
//   db.model("Labels", labelsSchema);
//   db.model("Tax", TaxSchema);
//   db.model("Unit", UnitSchema);
//   db.model("Variant", variantSchema);
//   db.model("Currency", currencySchema);
//   const PurchaseInvoicesModel = db.model(
//     "PurchaseInvoices",
//     PurchaseInvoicesSchema
//   );
//   db.model("Stock", stockSchema);
//   const stocks = req.body.stocks;
//   function padZero(value) {
//     return value < 10 ? `0${value}` : value;
//   }
//   // app settings
//   let ts = Date.now();
//   let date_ob = new Date(ts);
//   let date = padZero(date_ob.getDate());
//   let month = padZero(date_ob.getMonth() + 1);
//   let year = date_ob.getFullYear();
//   let hours = padZero(date_ob.getHours());
//   let minutes = padZero(date_ob.getMinutes());
//   let seconds = padZero(date_ob.getSeconds());

//   const formattedDate =
//     year +
//     "-" +
//     month +
//     "-" +
//     date +
//     " " +
//     hours +
//     ":" +
//     minutes +
//     ":" +
//     seconds;

//   const {
//     invoices,
//     suppliersId,
//     sup,
//     supplierPhone,
//     supplierEmail,
//     supplierAddress,
//     supplierCompany,
//     totalProductTax,
//     totalPriceWitheOutTax,
//     finalPrice,
//     addedValue,
//     finalPriceExchangeRate,
//     totalQuantity,
//     totalbuyingprice,
//     invoiceCurrencyId,
//     invoiceCurrency,
//     paid,
//     finalPriceMainCurrency,
//     invoiceCurrencyExchangeRate,
//     description,
//   } = req.body;

//   const invoiceFinancialFund = req.body.invoiceFinancialFund;

//   const invoiceItems = [];

//   const nextCounter = (await PurchaseInvoicesModel.countDocuments()) + 1;

//   for (const item of invoices) {
//     const {
//       quantity,
//       qr,
//       serialNumber,
//       buyingprice,
//       totalPrice,
//       taxRate,
//       price,
//       taxPrice,
//       totalTax,
//       currency,
//       taxId,
//       buyingpriceOringal,
//       profitRatio,
//       product,
//     } = item;
//     // Find the product based on the  QR code
//     const productDoc = await productModel.findOne({ qr });
//     if (!productDoc) {
//       console.log(`Product not found for QR code: ${qr}`);
//       continue;
//     }
//     // Create an invoice item
//     const invoiceItem = {
//       product: product,
//       name: productDoc.name,
//       quantity,
//       qr,
//       price: price,
//       serialNumber: serialNumber,
//       buyingprice: buyingprice,
//       taxPrice: taxPrice,
//       taxRate: taxRate,
//       buyingpriceOringal: buyingpriceOringal,
//       taxId: taxId,
//       currency: currency,
//       totalTax: totalTax,
//       totalPrice: totalPrice,
//       profitRatio: profitRatio,
//     };
//     invoiceItems.push(invoiceItem);
//   }

//   if (req.body.paid == "paid") {
//     let bulkOption;
//     const financialFund = await FinancialFundsModel.findById(
//       invoiceFinancialFund
//     );

//     // Create a new purchase invoice with all the invoice items
//     const newPurchaseInvoice = new PurchaseInvoicesModel({
//       invoices: invoiceItems,
//       stocks: stocks,
//       paidAt: formattedDate,
//       suppliers: suppliersId,
//       supplier: sup,
//       supplierPhone,
//       supplierEmail,
//       supplierAddress,
//       supplierCompany,
//       totalProductTax: totalProductTax,
//       totalPriceWitheOutTax: totalPriceWitheOutTax,
//       totalbuyingprice: totalbuyingprice,
//       finalPrice: finalPrice,
//       addedValue,
//       totalQuantity: totalQuantity,
//       finalPriceMainCurrency: finalPriceMainCurrency,
//       employee: req.user._id,
//       invoiceCurrencyId,
//       invoiceCurrency,
//       invoiceNumber: nextCounter,
//       invoiceCurrencyExchangeRate,
//       description,
//       date: req.body.date,
//       paid: paid,
//     });

//     bulkOption = invoiceItems.map((item) => ({
//       updateOne: {
//         filter: { qr: item.qr },
//         update: {
//           $inc: { quantity: +item.quantity, activeCount: +item.quantity },
//           $set: {
//             // serialNumber: item.serialNumber,
//             buyingprice: item.buyingpriceOringal,
//             tax: item.taxId,
//             price: item.price,
//             taxPrice: item.taxPrice,
//           },
//         },
//       },
//     }));
//     await productModel.bulkWrite(bulkOption, {});

//     const invoiceProcessingPromises = invoiceItems.map(async (item) => {
//       const product = await productModel.findOne({ qr: item.qr });

//       if (product) {
//         const updateOperations = stocks
//           .filter((stock) => stock.product === item.product)
//           .map((stock) => ({
//             updateOne: {
//               filter: { _id: product._id, "stocks.stockId": stock.stockId },
//               update: {
//                 $inc: {
//                   "stocks.$.productQuantity": +item.quantity,
//                 },
//               },
//             },
//           }));

//         // Execute the bulk write operation for each product
//         if (updateOperations.length > 0) {
//           await productModel.bulkWrite(updateOperations);
//         }

//         createProductMovement(
//           product._id,
//           product.quantity,
//           item.quantity,
//           "in",
//           "purchase",
//           dbName
//         );
//       }
//     });

//     await Promise.all(invoiceProcessingPromises);
//     const supplier = await suppl.findById(suppliersId);
//     // Loop through each item in the invoiceItems array
//     invoiceItems.forEach((newInvoiceItem) => {
//       const existingProductIndex = supplier.products.findIndex(
//         (existingProduct) => existingProduct.qr === newInvoiceItem.qr
//       );

//       if (existingProductIndex !== -1) {
//         supplier.products[existingProductIndex].quantity +=
//           newInvoiceItem.quantity;
//         supplier.products[existingProductIndex].buyingprice =
//           newInvoiceItem.buyingpriceOringal;
//         supplier.products[existingProductIndex].exchangeRate =
//           newInvoiceItem.buyingprice;
//         supplier.products[existingProductIndex].taxRate =
//           newInvoiceItem.taxRate;
//         supplier.products[existingProductIndex].exchangeRate =
//           newInvoiceItem.currency;
//       } else {
//         // If the product doesn't exist, add it to the prodcuts array
//         supplier.products.push({
//           product: newInvoiceItem.product,
//           qr: newInvoiceItem.qr,
//           name: newInvoiceItem.name,
//           buyingprice: newInvoiceItem.buyingpriceOringal,
//           buyingpriceOriginal: newInvoiceItem.buyingpriceOringal,
//           quantity: newInvoiceItem.quantity,
//           exchangeRate: newInvoiceItem.currency,
//           taxRate: newInvoiceItem.taxRate,
//         });
//       }
//     });
//     await supplier.save();
//     const data = new Date();
//     const isaaaa = data.toISOString();
//     financialFund.fundBalance -= finalPriceExchangeRate;

//     // Save the new purchase invoice to the database
//     const savedInvoice = await newPurchaseInvoice.save();
//     const ReportsFinancialFunds = await ReportsFinancialFundsModel.create({
//       date: isaaaa,
//       invoice: savedInvoice._id,
//       amount: finalPrice,
//       type: "purchase",
//       exchangeRate: req.body.invoiceCurrencyExchangeRate,
//       finalPriceMainCurrency: finalPriceMainCurrency,
//       financialFundId: invoiceFinancialFund,
//       financialFundRest: financialFund.fundBalance,
//     });
//     // Respond with the created invoice
//     await financialFund.save();
//     newPurchaseInvoice.reportsBalanceId = ReportsFinancialFunds._id;
//     PurchaseInvoicesModel.save();
//     try {
//       const ActiveProductsValue = db.model(
//         "ActiveProductsValue",
//         ActiveProductsValueModel
//       );

//       const currencyTotals = {};

//       for (const item of newPurchaseInvoice.invoices) {
//         try {
//           const product = await productModel.findOne({ qr: item.qr });
//           if (product) {
//             const currencyId = product.currency._id;
//             if (!currencyTotals[currencyId]) {
//               currencyTotals[currencyId] = { totalCount: 0, totalValue: 0 };
//             }
//             currencyTotals[currencyId].totalValue +=
//               item.buyingpriceOringal || item.buyingprice * item.quantity;
//             currencyTotals[currencyId].totalCount += item.quantity;
//           } else {
//             console.warn(`Product with QR ${item.qr} not found.`);
//           }
//         } catch (err) {
//           console.error(
//             `Error finding product with QR ${item.qr}:`,
//             err.message
//           );
//         }
//       }

//       for (const currencyId in currencyTotals) {
//         if (currencyTotals.hasOwnProperty(currencyId)) {
//           const { totalCount, totalValue } = currencyTotals[currencyId];
//           const existingRecord = await ActiveProductsValue.findOne({
//             currency: currencyId,
//           });
//           if (existingRecord) {
//             existingRecord.activeProductsCount += totalCount;
//             existingRecord.activeProductsValue += totalValue;
//             await existingRecord.save();
//           } else {
//             await createActiveProductsValue(
//               totalCount,
//               totalValue,
//               currencyId,
//               dbName
//             );
//           }
//         }
//       }
//     } catch (err) {
//       console.log("Error in processing purchase invoices:", err.message);
//     }

//     const history = createInvoiceHistory(
//       dbName,
//       savedInvoice._id,
//       "create",
//       req.user._id
//     );

//     await paymentModel.create({
//       supplierId: suppliersId,
//       supplierName: supplier,
//       total: totalPurchasePrice,
//       totalMainCurrency: totalPurchasePriceMainCurrency,
//       exchangeRate: financialFund.fundCurrency.exchangeRate,
//       currencyCode: currencyCode,
//       date: date,
//       invoiceNumber: invoiceNumber,
//       counter: nextCounter,
//     });
//     res.status(201).json({ status: "success", data: savedInvoice, history });
//   } else {
//     const supplier = await suppl.findById(suppliersId);
//     supplier.total += req.body.finalPricetest;

//     let total = req.body.finalPricetest;
//     if (supplier.TotalUnpaid <= -1) {
//       const t = total + supplier.TotalUnpaid;
//       if (t > 0) {
//         total = t;
//         supplier.TotalUnpaid = t;
//         console.log(">");
//       } else if (t < 0) {
//         supplier.TotalUnpaid = t;
//         req.body.paid = "paid";
//         console.log("<");
//       } else {
//         total = 0;
//         supplier.TotalUnpaid = 0;
//         req.body.paid = "paid";
//         console.log("=");
//       }
//     } else {
//       supplier.TotalUnpaid += total;
//     }

//     const newPurchaseInvoice = new PurchaseInvoicesModel({
//       invoices: invoiceItems,
//       paidAt: formattedDate,
//       suppliers: suppliersId,
//       supplier: sup,
//       supplierPhone,
//       supplierEmail,
//       supplierAddress,
//       supplierCompany,
//       finalPriceMainCurrency: finalPriceMainCurrency,
//       totalProductTax: totalProductTax,
//       totalPriceWitheOutTax: totalPriceWitheOutTax,
//       totalbuyingprice: totalbuyingprice,
//       finalPrice: finalPrice,
//       addedValue,
//       totalQuantity: totalQuantity,
//       employee: req.user._id,
//       invoiceCurrencyId,
//       invoiceCurrency,
//       totalRemainder: finalPrice,
//       totalRemainderMainCurrency: finalPriceMainCurrency,
//       invoiceNumber: nextCounter,
//       invoiceCurrencyExchangeRate,
//       paid: req.body.paid,
//     });
//     bulkOption = invoiceItems.map((item) => ({
//       updateOne: {
//         filter: { qr: item.qr },
//         update: {
//           $inc: { quantity: +item.quantity, activeCount: +item.quantity },
//           $set: {
//             // serialNumber: item.serialNumber,
//             buyingprice: item.buyingpriceOringal,
//             tax: item.taxId,
//             price: item.price,
//             taxPrice: item.taxPrice,
//           },
//         },
//       },
//     }));
//     await productModel.bulkWrite(bulkOption, {});
//     await supplier.save();

//     invoiceItems.forEach((newInvoiceItem) => {
//       const existingProductIndex = supplier.products.findIndex(
//         (existingProduct) => existingProduct.qr === newInvoiceItem.qr
//       );

//       if (existingProductIndex !== -1) {
//         supplier.products[existingProductIndex].quantity +=
//           newInvoiceItem.quantity;
//         supplier.products[existingProductIndex].buyingprice =
//           newInvoiceItem.buyingpriceOringal;
//         supplier.products[existingProductIndex].exchangeRate =
//           newInvoiceItem.buyingprice;
//         supplier.products[existingProductIndex].taxRate =
//           newInvoiceItem.taxRate;
//         supplier.products[existingProductIndex].exchangeRate =
//           newInvoiceItem.currency;
//       } else {
//         // If the product doesn't exist, add it to the prodcuts array
//         supplier.products.push({
//           product: newInvoiceItem.product,
//           qr: newInvoiceItem.qr,
//           name: newInvoiceItem.name,
//           buyingprice: newInvoiceItem.buyingpriceOringal,
//           buyingpriceOriginal: newInvoiceItem.buyingpriceOringal,
//           quantity: newInvoiceItem.quantity,
//           exchangeRate: newInvoiceItem.currency,
//           taxRate: newInvoiceItem.taxRate,
//         });
//       }
//     });

//     try {
//       const invoiceProcessingPromises = invoiceItems.map(async (item) => {
//         const product = await productModel.findOne({ qr: item.qr });

//         if (product) {
//           const updateOperations = stocks
//             .filter((stock) => stock.product === item.product)
//             .map((stock) => ({
//               updateOne: {
//                 filter: { _id: product._id, "stocks.stockId": stock.stockId },
//                 update: {
//                   $inc: {
//                     "stocks.$.productQuantity": +item.quantity,
//                   },
//                 },
//               },
//             }));

//           // Execute the bulk write operation for each product
//           if (updateOperations.length > 0) {
//             await productModel.bulkWrite(updateOperations);
//           }

//           createProductMovement(
//             product._id,
//             product.quantity + item.quantity,
//             item.quantity,
//             "in",
//             "purchase",
//             dbName
//           );
//         }
//       });

//       await Promise.all(invoiceProcessingPromises);
//       const supplier = await suppl.findById(suppliersId);
//       const savedInvoice = await newPurchaseInvoice.save();

//       const ActiveProductsValue = db.model(
//         "ActiveProductsValue",
//         ActiveProductsValueModel
//       );
//       const existingRecord = await ActiveProductsValue.findOne();
//       let totalCount = 0;
//       let totalValue = 0;

//       newPurchaseInvoice.invoices.map((item) => {
//         totalValue +=
//           (Number(item.totalPrice) || item.totalTax) * item.currency;
//         totalCount += item.quantity;
//       });

//       if (existingRecord) {
//         existingRecord.activeProductsCount += totalCount;
//         existingRecord.activeProductsValue += totalValue;
//         await existingRecord.save();
//       } else {
//         await createActiveProductsValue(totalCount, totalValue, dbName);
//       }

//       const history = createInvoiceHistory(
//         dbName,
//         savedInvoice._id,
//         "create",
//         req.user._id
//       );

//       await createPaymentHistory(
//         "invoice",
//         formattedDate,
//         finalPriceMainCurrency,
//         supplier.TotalUnpaid,
//         "supplier",
//         suppliersId,
//         nextCounter,
//         dbName
//       );
//       res.status(201).json({
//         status: "success",
//         data: savedInvoice,
//         history,
//       });
//     } catch (error) {
//       console.log(error.message);
//       return new ApiError(
//         `Error creating unpaid purchase invoice: ${error.message}`,
//         500
//       );
//     }
//   }
// });

// const multerStorage = multer.diskStorage({
//   destination: function (req, file, callback) {
//     // Specify the destination folder for storing the files
//     callback(null, "./uploads/expenses");
//   },
//   filename: function (req, file, callback) {
//     // Specify the filename for the uploaded file
//     const originalname = file.originalname;
//     const lastDotIndex = originalname.lastIndexOf(".");
//     const fileExtension =
//       lastDotIndex !== -1 ? originalname.slice(lastDotIndex + 1) : "";
//     const filename = `ex-${uuidv4()}-${Date.now()}-${
//       Math.floor(Math.random() * (10000000000 - 1 + 1)) + 1
//     }.${fileExtension}`;

//     callback(null, filename);
//   },
// });

// const upload = multer({
//   storage: multerStorage,
//   fileFilter: (req, file, callback) => {
//     const allowedMimes = ["image/jpeg", "image/png", "application/pdf"];
//     if (allowedMimes.includes(file.mimetype)) {
//       callback(null, true);
//     } else {
//       callback(
//         new ApiError("Invalid file type. Only images and PDFs are allowed.")
//       );
//     }
//   },
// });

// exports.uploadFile = upload.single("expenseFile");

// exports.createPurchaseInvoiceOld = asyncHandler(async (req, res, next) => {
//   const dbName = req.query.databaseName;
//   const db = mongoose.connection.useDb(dbName);
//   const ProductModel = db.model("Product", productSchema);
//   const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
//   const ReportsFinancialFundsModel = db.model(
//     "ReportsFinancialFunds",
//     reportsFinancialFundsSchema
//   );
//   const SupplierModel = db.model("Supplier", supplierSchema);
//   const PurchaseInvoicesModel = db.model(
//     "PurchaseInvoices",
//     PurchaseInvoicesSchema
//   );
//   const paymentModel = db.model("Payment", PaymentSchema);

//   const nextCounterPayment = (await paymentModel.countDocuments()) + 1;
//   const ActiveProductsValue = db.model(
//     "ActiveProductsValue",
//     ActiveProductsValueModel
//   );
//   db.model("Stock", stockSchema);
//   const stocks = req.body.stocks;
//   // Helper function to get the current formatted date
//   const getFormattedDate = () => {
//     const padZero = (num) => String(num).padStart(2, "0");
//     const ts = Date.now();
//     const dateOb = new Date(ts);
//     const date = padZero(dateOb.getDate());
//     const month = padZero(dateOb.getMonth() + 1);
//     const year = dateOb.getFullYear();
//     const hours = padZero(dateOb.getHours());
//     const minutes = padZero(dateOb.getMinutes());
//     const seconds = padZero(dateOb.getSeconds());
//     return `${year}-${month}-${date} ${hours}:${minutes}:${seconds}`;
//   };

//   const formattedDate = getFormattedDate();
//   const time = () => {
//     const padZero = (num) => String(num).padStart(2, "0");
//     const ts = Date.now();
//     const dateOb = new Date(ts);
//     const hours = padZero(dateOb.getHours());
//     const minutes = padZero(dateOb.getMinutes());
//     const seconds = padZero(dateOb.getSeconds());
//     return `${hours}:${minutes}:${seconds}`;
//   };
//   const formatteTime = time();
//   const {
//     suppliersId,
//     invoicesItems,
//     priceExchangeRate,
//     onefinancialFunds,
//     totalPurchasePrice,
//     description,
//     paid,
//     currencyCode,
//     exchangeRate,
//     supplierName,
//     supplierPhone,
//     supplierEmail,
//     supplierAddress,
//     supplierCompany,
//     pricePurchaseInvocie,
//     fundPricePurchaseInvocie,
//     totalPurchasePriceMainCurrency,
//     currencyId,
//     invoiceNumber,
//     date,
//   } = req.body;

//   const invoiceItems = [];
//   const supplier = await SupplierModel.findById(suppliersId);
//   // Process each invoice item
//   for (const item of invoicesItems) {
//     const productDoc = await ProductModel.findOne({ qr: item.qr });
//     if (!productDoc) {
//       console.log(`Product not found for QR code: ${item.qr}`);
//       continue;
//     }
//     invoiceItems.push({
//       ...item,
//       name: productDoc.name,
//       profitRatio: item.profitRatio,
//     });
//   }

//   let newPurchaseInvoice;

//   if (paid === "paid") {
//     const financialFund = await FinancialFundsModel.findById(onefinancialFunds);
//     financialFund.fundBalance -= fundPricePurchaseInvocie;

//     const newInvoiceData = {
//       employee: req.user._id,
//       invoicesItems: invoiceItems,
//       date: date !== undefined ? date + " " + formatteTime : formattedDate,
//       suppliersId,
//       supplierName,
//       supplierPhone,
//       supplierEmail,
//       supplierAddress,
//       supplierCompany,
//       addedValue: req.body.addedValue,
//       currencyCode,
//       exchangeRate,
//       priceExchangeRate,
//       onefinancialFunds,
//       invoiceNumber: invoiceNumber,
//       paid: "paid",
//       totalPurchasePrice,
//       description,
//       totalPurchasePriceMainCurrency,
//       currencyId,
//     };
//     newPurchaseInvoice = await PurchaseInvoicesModel.create(newInvoiceData);
//     const reports = await ReportsFinancialFundsModel.create({
//       date: date + " " + formatteTime || formattedDate,
//       invoice: newPurchaseInvoice._id,
//       amount: fundPricePurchaseInvocie,
//       type: "purchase",
//       exchangeRate: exchangeRate,
//       exchangeAmount: totalPurchasePriceMainCurrency,
//       financialFundId: onefinancialFunds,
//       financialFundRest: financialFund.fundBalance,
//     });
//     newPurchaseInvoice.payments.push({
//       payment: fundPricePurchaseInvocie,
//       paymentMainCurrency: totalPurchasePriceMainCurrency,
//       financialFunds: financialFund.fundName,
//       financialFundsCurrencyCode: req.body.invoiceFinancialFundCurrencyCode,
//       date: date + " " + formatteTime || formattedDate,
//     });
//     newPurchaseInvoice.reportsBalanceId = reports.id;
//     await newPurchaseInvoice.save();
//     await financialFund.save();

//     await paymentModel.create({
//       supplierId: suppliersId,
//       supplierName: supplierName,
//       total: fundPricePurchaseInvocie,
//       totalMainCurrency: totalPurchasePriceMainCurrency,
//       exchangeRate: financialFund.fundCurrency.exchangeRate,
//       currencyCode: financialFund.fundCurrency.currencyCode,
//       date: date + " " + formatteTime || formattedDate,
//       invoiceNumber: invoiceNumber,
//       counter: nextCounterPayment,
//     });

//     supplier.total += totalPurchasePriceMainCurrency;
//   } else {
//     supplier.total += totalPurchasePriceMainCurrency;

//     let total = totalPurchasePriceMainCurrency;
//     if (supplier.TotalUnpaid <= -1) {
//       const t = total + supplier.TotalUnpaid;
//       if (t > 0) {
//         total = t;
//         supplier.TotalUnpaid = t;
//         console.log(">");
//       } else if (t < 0) {
//         supplier.TotalUnpaid = t;
//         req.body.paid = "paid";
//         console.log("<");
//       } else {
//         total = 0;
//         supplier.TotalUnpaid = 0;
//         req.body.paid = "paid";
//         console.log("=");
//       }
//     } else {
//       supplier.TotalUnpaid += total;
//     }
//     const newInvoiceData = {
//       employee: req.user._id,
//       date: date + " " + formatteTime || formattedDate,
//       invoicesItems: invoiceItems,
//       suppliersId,
//       supplierName,
//       supplierPhone,
//       supplierEmail,
//       supplierAddress,
//       supplierCompany,
//       addedValue: req.body.addedValue,
//       currencyCode,
//       exchangeRate,
//       priceExchangeRate,
//       onefinancialFunds,
//       invoiceNumber: invoiceNumber,
//       paid: "unpaid",
//       totalPurchasePrice,
//       totalPurchasePriceMainCurrency,
//       description,
//       totalRemainder: totalPurchasePrice,
//       totalRemainderMainCurrency: totalPurchasePriceMainCurrency,
//       currencyId,
//     };
//     newPurchaseInvoice = await PurchaseInvoicesModel.create(newInvoiceData);
//   }

//   // Prepare bulk operations for updating products and stocks
//   const bulkProductUpdates = invoiceItems.map((item) => ({
//     updateOne: {
//       filter: { qr: item.qr },
//       update: {
//         $inc: { quantity: +item.quantity, activeCount: +item.quantity },
//         $set: {
//           buyingprice: item.buyingpriceOringal,
//         },
//       },
//     },
//   }));
//   const bulkStockUpdates = [];
//   // Iterate over each invoice item asynchronously
//   await Promise.all(
//     invoiceItems.map(async (item) => {
//       // Find the product by QR code
//       const product = await ProductModel.findOne({ qr: item.qr });

//       if (product) {
//         // Create arrays to store update and insert operations
//         const updateOperations = [];
//         const insertOperations = [];

//         // Get the existing stocks for the product
//         const existingStocks = product.stocks || [];

//         // Map over stocks related to the invoice item
//         stocks
//           .filter((stock) => stock.product === item.product)
//           .forEach((stock) => {
//             // Check if the stock already exists in the product
//             const existingStock = existingStocks.find(
//               (s) => s.stockId === stock.stockId
//             );

//             if (existingStock) {
//               // If stock exists, create an update operation
//               updateOperations.push({
//                 updateOne: {
//                   filter: { _id: product._id, "stocks.stockId": stock.stockId },
//                   update: {
//                     $inc: { "stocks.$.productQuantity": +item.quantity },
//                   },
//                 },
//               });
//             } else {
//               // If stock does not exist, prepare an insert operation
//               insertOperations.push({
//                 updateOne: {
//                   filter: { _id: product._id },
//                   update: {
//                     $push: {
//                       stocks: {
//                         stockId: stock.stockId,
//                         stockName: stock.stockName,
//                         productQuantity: +item.quantity,
//                       },
//                     },
//                   },
//                   upsert: true,
//                 },
//               });
//             }
//           });

//         // Execute update operations if any
//         if (updateOperations.length > 0) {
//           await ProductModel.bulkWrite(updateOperations);
//         }

//         // Execute insert operations if any
//         if (insertOperations.length > 0) {
//           await ProductModel.bulkWrite(insertOperations);
//         }
//       }
//     })
//   );

//   invoiceItems.map(async (item) => {
//     const product = await ProductModel.findOne({ qr: item.qr });
//     if (product && product.type !== "Service") {
//       const existingRecord = await ActiveProductsValue.findOne({
//         currency: product.currency._id,
//       });
//       if (existingRecord) {
//         existingRecord.activeProductsCount += item.quantity;
//         existingRecord.activeProductsValue +=
//           item.buyingpriceOringal * item.quantity;
//         await existingRecord.save();
//       } else {
//         await createActiveProductsValue(0, 0, product.currency._id, dbName);
//       }

//       // Create product movement for each item
//       createProductMovement(
//         product._id,
//         product.quantity,
//         item.quantity,
//         "in",
//         "purchase",
//         dbName
//       );
//     }
//   });
//   await createPaymentHistory(
//     "invoice",
//     date + " " + formatteTime || formattedDate,
//     totalPurchasePriceMainCurrency,
//     supplier.TotalUnpaid,
//     "supplier",
//     suppliersId,
//     invoiceNumber,
//     dbName
//   );
//   if (paid === "paid") {
//     await createPaymentHistory(
//       "payment",
//       date + " " + formatteTime || formattedDate,
//       totalPurchasePriceMainCurrency,
//       supplier.TotalUnpaid,
//       "supplier",
//       suppliersId,
//       invoiceNumber,
//       dbName,
//       description,
//       nextCounterPayment
//     );
//   }
//   await ProductModel.bulkWrite(bulkProductUpdates);
//   if (bulkStockUpdates.length > 0) {
//     await ProductModel.bulkWrite(bulkStockUpdates);
//   }

//   invoiceItems.forEach((item) => {
//     const existingProduct = supplier.products.find(
//       (prod) => prod.qr === item.qr
//     );

//     if (existingProduct) {
//       Object.assign(existingProduct, {
//         quantity: existingProduct.quantity + item.quantity,
//         buyingprice: item.buyingpriceOringal,
//         exchangeRate: item.currency,
//         taxRate: item.taxRate,
//       });
//     } else {
//       supplier.products.push({
//         product: item.product,
//         qr: item.qr,
//         name: item.name,
//         buyingprice: item.buyingpriceOringal,
//         quantity: item.quantity,
//         exchangeRate: item.currency,
//         taxRate: item.taxRate,
//       });
//     }
//   });

//   await supplier.save();

//   const history = createInvoiceHistory(
//     dbName,
//     newPurchaseInvoice._id,
//     "create",
//     req.user._id
//   );
//   res.status(201).json({
//     status: "success",
//     message: "create sucssess",
//     data: newPurchaseInvoice,
//     history,
//   });
// });
