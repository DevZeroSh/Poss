const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const PurchaseInvoicesSchema = require("../models/purchaseinvoicesModel");
const mongoose = require("mongoose");
const supplierSchema = require("../models/suppliersModel");
const emoloyeeShcema = require("../models/employeeModel");
const currencySchema = require("../models/currencyModel");
const financialFundsSchema = require("../models/financialFundsModel");
const productSchema = require("../models/productModel");

const brandSchema = require("../models/brandModel");
const categorySchema = require("../models/CategoryModel");
const labelsSchema = require("../models/labelsModel");
const variantSchema = require("../models/variantsModel");
const UnitSchema = require("../models/UnitsModel");
const TaxSchema = require("../models/taxModel");
const reportsFinancialFundsSchema = require("../models/reportsFinancialFunds");
const returnPurchaseInvicesSchema = require("../models/returnPurchaseInvice");
const { Search } = require("../utils/search");
const { createProductMovement } = require("../utils/productMovement");
const { createInvoiceHistory } = require("./invoiceHistoryService");
const ActiveProductsValueModel = require("../models/activeProductsValueModel");
const { createActiveProductsValue } = require("../utils/activeProductsValue");
const { createPaymentHistory } = require("./paymentHistoryService");
const stockSchema = require("../models/stockModel");
const PaymentSchema = require("../models/paymentModel");
const PaymentHistorySchema = require("../models/paymentHistoryModel");

exports.createProductInvoices = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const productModel = db.model("Product", productSchema);
  const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
  const ReportsFinancialFundsModel = db.model(
    "ReportsFinancialFunds",
    reportsFinancialFundsSchema
  );
  const suppl = db.model("Supplier", supplierSchema);
  db.model("Currency", currencySchema);
  db.model("Employee", emoloyeeShcema);
  db.model("Category", categorySchema);
  db.model("brand", brandSchema);
  db.model("Labels", labelsSchema);
  db.model("Tax", TaxSchema);
  db.model("Unit", UnitSchema);
  db.model("Variant", variantSchema);
  db.model("Currency", currencySchema);
  const PurchaseInvoicesModel = db.model(
    "PurchaseInvoices",
    PurchaseInvoicesSchema
  );
  db.model("Stock", stockSchema);
  const stocks = req.body.stocks;
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
    addedValue,
    finalPriceExchangeRate,
    totalQuantity,
    totalbuyingprice,
    invoiceCurrencyId,
    invoiceCurrency,
    paid,
    finalPriceMainCurrency,
    invoiceCurrencyExchangeRate,
    description,
  } = req.body;

  const invoiceFinancialFund = req.body.invoiceFinancialFund;

  const invoiceItems = [];

  const nextCounter = (await PurchaseInvoicesModel.countDocuments()) + 1;

  for (const item of invoices) {
    const {
      quantity,
      qr,
      serialNumber,
      buyingprice,
      totalPrice,
      taxRate,
      price,
      taxPrice,
      totalTax,
      currency,
      taxId,
      buyingpriceOringal,
      profitRatio,
      product,
    } = item;
    // Find the product based on the  QR code
    const productDoc = await productModel.findOne({ qr });
    if (!productDoc) {
      console.log(`Product not found for QR code: ${qr}`);
      continue;
    }
    // Create an invoice item
    const invoiceItem = {
      product: product,
      name: productDoc.name,
      quantity,
      qr,
      price: price,
      serialNumber: serialNumber,
      buyingprice: buyingprice,
      taxPrice: taxPrice,
      taxRate: taxRate,
      buyingpriceOringal: buyingpriceOringal,
      taxId: taxId,
      currency: currency,
      totalTax: totalTax,
      totalPrice: totalPrice,
      profitRatio: profitRatio,
    };
    invoiceItems.push(invoiceItem);
  }

  if (req.body.paid == "paid") {
    let bulkOption;
    const financialFund = await FinancialFundsModel.findById(
      invoiceFinancialFund
    );

    // Create a new purchase invoice with all the invoice items
    const newPurchaseInvoice = new PurchaseInvoicesModel({
      invoices: invoiceItems,
      stocks: stocks,
      paidAt: formattedDate,
      suppliers: suppliersId,
      supplier: sup,
      supplierPhone,
      supplierEmail,
      supplierAddress,
      supplierCompany,
      totalProductTax: totalProductTax,
      totalPriceWitheOutTax: totalPriceWitheOutTax,
      totalbuyingprice: totalbuyingprice,
      finalPrice: finalPrice,
      addedValue,
      totalQuantity: totalQuantity,
      finalPriceMainCurrency: finalPriceMainCurrency,
      employee: req.user._id,
      invoiceCurrencyId,
      invoiceCurrency,
      invoiceNumber: nextCounter,
      invoiceCurrencyExchangeRate,
      description,
      date: req.body.date,
      paid: paid,
    });

    bulkOption = invoiceItems.map((item) => ({
      updateOne: {
        filter: { qr: item.qr },
        update: {
          $inc: { quantity: +item.quantity, activeCount: +item.quantity },
          $set: {
            // serialNumber: item.serialNumber,
            buyingprice: item.buyingpriceOringal,
            tax: item.taxId,
            price: item.price,
            taxPrice: item.taxPrice,
          },
        },
      },
    }));
    await productModel.bulkWrite(bulkOption, {});

    const invoiceProcessingPromises = invoiceItems.map(async (item) => {
      const product = await productModel.findOne({ qr: item.qr });

      if (product) {
        const updateOperations = stocks
          .filter((stock) => stock.product === item.product)
          .map((stock) => ({
            updateOne: {
              filter: { _id: product._id, "stocks.stockId": stock.stockId },
              update: {
                $inc: {
                  "stocks.$.productQuantity": +item.quantity,
                },
              },
            },
          }));

        // Execute the bulk write operation for each product
        if (updateOperations.length > 0) {
          await productModel.bulkWrite(updateOperations);
        }

        createProductMovement(
          product._id,
          product.quantity,
          item.quantity,
          "in",
          "purchase",
          dbName
        );
      }
    });

    await Promise.all(invoiceProcessingPromises);
    const supplier = await suppl.findById(suppliersId);
    // Loop through each item in the invoiceItems array
    invoiceItems.forEach((newInvoiceItem) => {
      const existingProductIndex = supplier.products.findIndex(
        (existingProduct) => existingProduct.qr === newInvoiceItem.qr
      );

      if (existingProductIndex !== -1) {
        supplier.products[existingProductIndex].quantity +=
          newInvoiceItem.quantity;
        supplier.products[existingProductIndex].buyingprice =
          newInvoiceItem.buyingpriceOringal;
        supplier.products[existingProductIndex].exchangeRate =
          newInvoiceItem.buyingprice;
        supplier.products[existingProductIndex].taxRate =
          newInvoiceItem.taxRate;
        supplier.products[existingProductIndex].exchangeRate =
          newInvoiceItem.currency;
      } else {
        // If the product doesn't exist, add it to the prodcuts array
        supplier.products.push({
          product: newInvoiceItem.product,
          qr: newInvoiceItem.qr,
          name: newInvoiceItem.name,
          buyingprice: newInvoiceItem.buyingpriceOringal,
          buyingpriceOriginal: newInvoiceItem.buyingpriceOringal,
          quantity: newInvoiceItem.quantity,
          exchangeRate: newInvoiceItem.currency,
          taxRate: newInvoiceItem.taxRate,
        });
      }
    });
    await supplier.save();
    const data = new Date();
    const isaaaa = data.toISOString();
    financialFund.fundBalance -= finalPriceExchangeRate;

    // Save the new purchase invoice to the database
    const savedInvoice = await newPurchaseInvoice.save();
    const ReportsFinancialFunds = await ReportsFinancialFundsModel.create({
      date: isaaaa,
      invoice: savedInvoice._id,
      amount: finalPrice,
      type: "purchase",
      exchangeRate: req.body.invoiceCurrencyExchangeRate,
      finalPriceMainCurrency: finalPriceMainCurrency,
      financialFundId: invoiceFinancialFund,
      financialFundRest: financialFund.fundBalance,
    });
    // Respond with the created invoice
    await financialFund.save();
    newPurchaseInvoice.reportsBalanceId = ReportsFinancialFunds._id;
    PurchaseInvoicesModel.save();
    try {
      const ActiveProductsValue = db.model(
        "ActiveProductsValue",
        ActiveProductsValueModel
      );

      const currencyTotals = {};

      for (const item of newPurchaseInvoice.invoices) {
        try {
          const product = await productModel.findOne({ qr: item.qr });
          if (product) {
            const currencyId = product.currency._id;
            if (!currencyTotals[currencyId]) {
              currencyTotals[currencyId] = { totalCount: 0, totalValue: 0 };
            }
            currencyTotals[currencyId].totalValue +=
              item.buyingpriceOringal || item.buyingprice * item.quantity;
            currencyTotals[currencyId].totalCount += item.quantity;
          } else {
            console.warn(`Product with QR ${item.qr} not found.`);
          }
        } catch (err) {
          console.error(
            `Error finding product with QR ${item.qr}:`,
            err.message
          );
        }
      }

      for (const currencyId in currencyTotals) {
        if (currencyTotals.hasOwnProperty(currencyId)) {
          const { totalCount, totalValue } = currencyTotals[currencyId];
          const existingRecord = await ActiveProductsValue.findOne({
            currency: currencyId,
          });
          if (existingRecord) {
            existingRecord.activeProductsCount += totalCount;
            existingRecord.activeProductsValue += totalValue;
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
      }
    } catch (err) {
      console.log("Error in processing purchase invoices:", err.message);
    }

    const history = createInvoiceHistory(
      dbName,
      savedInvoice._id,
      "create",
      req.user._id
    );

    await paymentModel.create({
      supplierId: suppliersId,
      supplierName: supplier,
      total: totalPurchasePrice,
      totalMainCurrency: totalPurchasePriceMainCurrency,
      exchangeRate: financialFund.fundCurrency.exchangeRate,
      currencyCode: currencyCode,
      date: date,
      invoiceNumber: invoiceNumber,
      counter: nextCounter,
    });
    res.status(201).json({ status: "success", data: savedInvoice, history });
  } else {
    const supplier = await suppl.findById(suppliersId);
    supplier.total += req.body.finalPricetest;

    let total = req.body.finalPricetest;
    if (supplier.TotalUnpaid <= -1) {
      const t = total + supplier.TotalUnpaid;
      if (t > 0) {
        total = t;
        supplier.TotalUnpaid = t;
        console.log(">");
      } else if (t < 0) {
        supplier.TotalUnpaid = t;
        req.body.paid = "paid";
        console.log("<");
      } else {
        total = 0;
        supplier.TotalUnpaid = 0;
        req.body.paid = "paid";
        console.log("=");
      }
    } else {
      supplier.TotalUnpaid += total;
    }

    const newPurchaseInvoice = new PurchaseInvoicesModel({
      invoices: invoiceItems,
      paidAt: formattedDate,
      suppliers: suppliersId,
      supplier: sup,
      supplierPhone,
      supplierEmail,
      supplierAddress,
      supplierCompany,
      finalPriceMainCurrency: finalPriceMainCurrency,
      totalProductTax: totalProductTax,
      totalPriceWitheOutTax: totalPriceWitheOutTax,
      totalbuyingprice: totalbuyingprice,
      finalPrice: finalPrice,
      addedValue,
      totalQuantity: totalQuantity,
      employee: req.user._id,
      invoiceCurrencyId,
      invoiceCurrency,
      totalRemainder: finalPrice,
      totalRemainderMainCurrency: finalPriceMainCurrency,
      invoiceNumber: nextCounter,
      invoiceCurrencyExchangeRate,
      paid: req.body.paid,
    });
    bulkOption = invoiceItems.map((item) => ({
      updateOne: {
        filter: { qr: item.qr },
        update: {
          $inc: { quantity: +item.quantity, activeCount: +item.quantity },
          $set: {
            // serialNumber: item.serialNumber,
            buyingprice: item.buyingpriceOringal,
            tax: item.taxId,
            price: item.price,
            taxPrice: item.taxPrice,
          },
        },
      },
    }));
    await productModel.bulkWrite(bulkOption, {});
    await supplier.save();

    invoiceItems.forEach((newInvoiceItem) => {
      const existingProductIndex = supplier.products.findIndex(
        (existingProduct) => existingProduct.qr === newInvoiceItem.qr
      );

      if (existingProductIndex !== -1) {
        supplier.products[existingProductIndex].quantity +=
          newInvoiceItem.quantity;
        supplier.products[existingProductIndex].buyingprice =
          newInvoiceItem.buyingpriceOringal;
        supplier.products[existingProductIndex].exchangeRate =
          newInvoiceItem.buyingprice;
        supplier.products[existingProductIndex].taxRate =
          newInvoiceItem.taxRate;
        supplier.products[existingProductIndex].exchangeRate =
          newInvoiceItem.currency;
      } else {
        // If the product doesn't exist, add it to the prodcuts array
        supplier.products.push({
          product: newInvoiceItem.product,
          qr: newInvoiceItem.qr,
          name: newInvoiceItem.name,
          buyingprice: newInvoiceItem.buyingpriceOringal,
          buyingpriceOriginal: newInvoiceItem.buyingpriceOringal,
          quantity: newInvoiceItem.quantity,
          exchangeRate: newInvoiceItem.currency,
          taxRate: newInvoiceItem.taxRate,
        });
      }
    });

    try {
      const invoiceProcessingPromises = invoiceItems.map(async (item) => {
        const product = await productModel.findOne({ qr: item.qr });

        if (product) {
          const updateOperations = stocks
            .filter((stock) => stock.product === item.product)
            .map((stock) => ({
              updateOne: {
                filter: { _id: product._id, "stocks.stockId": stock.stockId },
                update: {
                  $inc: {
                    "stocks.$.productQuantity": +item.quantity,
                  },
                },
              },
            }));

          // Execute the bulk write operation for each product
          if (updateOperations.length > 0) {
            await productModel.bulkWrite(updateOperations);
          }

          createProductMovement(
            product._id,
            product.quantity + item.quantity,
            item.quantity,
            "in",
            "purchase",
            dbName
          );
        }
      });

      await Promise.all(invoiceProcessingPromises);
      const supplier = await suppl.findById(suppliersId);
      const savedInvoice = await newPurchaseInvoice.save();

      const ActiveProductsValue = db.model(
        "ActiveProductsValue",
        ActiveProductsValueModel
      );
      const existingRecord = await ActiveProductsValue.findOne();
      let totalCount = 0;
      let totalValue = 0;

      newPurchaseInvoice.invoices.map((item) => {
        totalValue +=
          (Number(item.totalPrice) || item.totalTax) * item.currency;
        totalCount += item.quantity;
      });

      if (existingRecord) {
        existingRecord.activeProductsCount += totalCount;
        existingRecord.activeProductsValue += totalValue;
        await existingRecord.save();
      } else {
        await createActiveProductsValue(totalCount, totalValue, dbName);
      }

      const history = createInvoiceHistory(
        dbName,
        savedInvoice._id,
        "create",
        req.user._id
      );

      await createPaymentHistory(
        "invoice",
        formattedDate,
        finalPriceMainCurrency,
        supplier.TotalUnpaid,
        "supplier",
        suppliersId,
        nextCounter,
        dbName
      );
      res.status(201).json({
        status: "success",
        data: savedInvoice,
        history,
      });
    } catch (error) {
      console.log(error.message);
      return new ApiError(
        `Error creating unpaid purchase invoice: ${error.message}`,
        500
      );
    }
  }
});

//Fixed Ourchse invoice
exports.createPurchaseInvoice = asyncHandler(async (req, res, next) => {
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
  const paymentModel = db.model("Payment", PaymentSchema);

  const nextCounterPayment = (await paymentModel.countDocuments()) + 1;
  const ActiveProductsValue = db.model(
    "ActiveProductsValue",
    ActiveProductsValueModel
  );
  db.model("Stock", stockSchema);
  const stocks = req.body.stocks;
  // Helper function to get the current formatted date
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
    suppliersId,
    invoicesItems,
    priceExchangeRate,
    onefinancialFunds,
    totalPurchasePrice,
    description,
    paid,
    currencyCode,
    exchangeRate,
    supplierName,
    supplierPhone,
    supplierEmail,
    supplierAddress,
    supplierCompany,
    pricePurchaseInvocie,
    fundPricePurchaseInvocie,
    totalPurchasePriceMainCurrency,
    currencyId,
    invoiceNumber,
    date,
  } = req.body;

  const invoiceItems = [];
  const supplier = await SupplierModel.findById(suppliersId);
  // Process each invoice item
  for (const item of invoicesItems) {
    const productDoc = await ProductModel.findOne({ qr: item.qr });
    if (!productDoc) {
      console.log(`Product not found for QR code: ${item.qr}`);
      continue;
    }
    invoiceItems.push({
      ...item,
      name: productDoc.name,
      profitRatio: item.profitRatio,
    });
  }

  let newPurchaseInvoice;

  if (paid === "paid") {
    const financialFund = await FinancialFundsModel.findById(onefinancialFunds);
    financialFund.fundBalance -= fundPricePurchaseInvocie;

    const newInvoiceData = {
      employee: req.user._id,
      invoicesItems: invoiceItems,
      date: date || formattedDate,
      suppliersId,
      supplierName,
      supplierPhone,
      supplierEmail,
      supplierAddress,
      supplierCompany,
      addedValue: req.body.addedValue,
      currencyCode,
      exchangeRate,
      priceExchangeRate,
      onefinancialFunds,
      invoiceNumber: invoiceNumber,
      paid: "paid",
      totalPurchasePrice,
      description,
      totalPurchasePriceMainCurrency,
      currencyId,
    };
    newPurchaseInvoice = await PurchaseInvoicesModel.create(newInvoiceData);
    const reports = await ReportsFinancialFundsModel.create({
      date: date || formattedDate,
      invoice: newPurchaseInvoice._id,
      amount: fundPricePurchaseInvocie,
      type: "purchase",
      exchangeRate: exchangeRate,
      exchangeAmount: totalPurchasePriceMainCurrency,
      financialFundId: onefinancialFunds,
      financialFundRest: financialFund.fundBalance,
    });
    newPurchaseInvoice.payments.push({
      payment: fundPricePurchaseInvocie,
      paymentMainCurrency: totalPurchasePriceMainCurrency,
      financialFunds: financialFund.fundName,
      financialFundsCurrencyCode: req.body.invoiceFinancialFundCurrencyCode,
      date: date || formattedDate,
    });
    newPurchaseInvoice.reportsBalanceId = reports.id;
    await newPurchaseInvoice.save();
    await financialFund.save();
    paymentText = "payment-sup";
    await paymentModel.create({
      supplierId: suppliersId,
      supplierName: supplierName,
      total: fundPricePurchaseInvocie,
      totalMainCurrency: totalPurchasePriceMainCurrency,
      exchangeRate: financialFund.fundCurrency.exchangeRate,
      currencyCode: financialFund.fundCurrency.currencyCode,
      date: date || formattedDate,
      invoiceNumber: invoiceNumber,
      counter: nextCounterPayment,
    });

    supplier.total += totalPurchasePriceMainCurrency;
  } else {
    supplier.total += totalPurchasePriceMainCurrency;

    let total = totalPurchasePriceMainCurrency;
    if (supplier.TotalUnpaid <= -1) {
      const t = total + supplier.TotalUnpaid;
      if (t > 0) {
        total = t;
        supplier.TotalUnpaid = t;
        console.log(">");
      } else if (t < 0) {
        supplier.TotalUnpaid = t;
        req.body.paid = "paid";
        console.log("<");
      } else {
        total = 0;
        supplier.TotalUnpaid = 0;
        req.body.paid = "paid";
        console.log("=");
      }
    } else {
      supplier.TotalUnpaid += total;
    }
    const newInvoiceData = {
      employee: req.user._id,
      date: date || formattedDate,
      invoicesItems: invoiceItems,
      suppliersId,
      supplierName,
      supplierPhone,
      supplierEmail,
      supplierAddress,
      supplierCompany,
      addedValue: req.body.addedValue,
      currencyCode,
      exchangeRate,
      priceExchangeRate,
      onefinancialFunds,
      invoiceNumber: invoiceNumber,
      paid: "unpaid",
      totalPurchasePrice,
      totalPurchasePriceMainCurrency,
      description,
      totalRemainder: totalPurchasePrice,
      totalRemainderMainCurrency: totalPurchasePriceMainCurrency,
      currencyId,
    };
    newPurchaseInvoice = await PurchaseInvoicesModel.create(newInvoiceData);
  }

  // Prepare bulk operations for updating products and stocks
  const bulkProductUpdates = invoiceItems.map((item) => ({
    updateOne: {
      filter: { qr: item.qr },
      update: {
        $inc: { quantity: +item.quantity, activeCount: +item.quantity },
        $set: {
          buyingprice: item.buyingpriceOringal,
        },
      },
    },
  }));
  const bulkStockUpdates = [];
  // Iterate over each invoice item asynchronously
  await Promise.all(
    invoiceItems.map(async (item) => {
      // Find the product by QR code
      const product = await ProductModel.findOne({ qr: item.qr });

      if (product) {
        // Create arrays to store update and insert operations
        const updateOperations = [];
        const insertOperations = [];

        // Get the existing stocks for the product
        const existingStocks = product.stocks || [];

        // Map over stocks related to the invoice item
        stocks
          .filter((stock) => stock.product === item.product)
          .forEach((stock) => {
            // Check if the stock already exists in the product
            const existingStock = existingStocks.find(
              (s) => s.stockId === stock.stockId
            );

            if (existingStock) {
              // If stock exists, create an update operation
              updateOperations.push({
                updateOne: {
                  filter: { _id: product._id, "stocks.stockId": stock.stockId },
                  update: {
                    $inc: { "stocks.$.productQuantity": +item.quantity },
                  },
                },
              });
            } else {
              // If stock does not exist, prepare an insert operation
              insertOperations.push({
                updateOne: {
                  filter: { _id: product._id },
                  update: {
                    $push: {
                      stocks: {
                        stockId: stock.stockId,
                        stockName: stock.stockName,
                        productQuantity: +item.quantity,
                      },
                    },
                  },
                  upsert: true,
                },
              });
            }
          });

        // Execute update operations if any
        if (updateOperations.length > 0) {
          await ProductModel.bulkWrite(updateOperations);
        }

        // Execute insert operations if any
        if (insertOperations.length > 0) {
          await ProductModel.bulkWrite(insertOperations);
        }
      }
    })
  );

  invoiceItems.map(async (item) => {
    const product = await ProductModel.findOne({ qr: item.qr });
    if (product && product.type !== "Service") {
      const existingRecord = await ActiveProductsValue.findOne({
        currency: product.currency._id,
      });
      if (existingRecord) {
        existingRecord.activeProductsCount += item.quantity;
        existingRecord.activeProductsValue +=
          item.buyingpriceOringal * item.quantity;
        await existingRecord.save();
      } else {
        await createActiveProductsValue(0, 0, product.currency._id, dbName);
      }

      // Create product movement for each item
      createProductMovement(
        product._id,
        product.quantity,
        item.quantity,
        "in",
        "purchase",
        dbName
      );
    }
  });
  await createPaymentHistory(
    "invoice",
    date || formattedDate,
    totalPurchasePriceMainCurrency,
    supplier.TotalUnpaid,
    "supplier",
    suppliersId,
    invoiceNumber,
    dbName
  );
  if (paid === "paid") {
    await createPaymentHistory(
      "payment",
      date || formattedDate,
      totalPurchasePriceMainCurrency,
      supplier.TotalUnpaid,
      "supplier",
      suppliersId,
      invoiceNumber,
      dbName,
      description,
      nextCounterPayment
    );
  }
  await ProductModel.bulkWrite(bulkProductUpdates);
  if (bulkStockUpdates.length > 0) {
    await ProductModel.bulkWrite(bulkStockUpdates);
  }

  invoiceItems.forEach((item) => {
    const existingProduct = supplier.products.find(
      (prod) => prod.qr === item.qr
    );

    if (existingProduct) {
      Object.assign(existingProduct, {
        quantity: existingProduct.quantity + item.quantity,
        buyingprice: item.buyingpriceOringal,
        exchangeRate: item.currency,
        taxRate: item.taxRate,
      });
    } else {
      supplier.products.push({
        product: item.product,
        qr: item.qr,
        name: item.name,
        buyingprice: item.buyingpriceOringal,
        quantity: item.quantity,
        exchangeRate: item.currency,
        taxRate: item.taxRate,
      });
    }
  });

  await supplier.save();

  const history = createInvoiceHistory(
    dbName,
    newPurchaseInvoice._id,
    "create",
    req.user._id
  );
  res.status(201).json({
    status: "success",
    message: "create sucssess",
    data: newPurchaseInvoice,
    history,
  });
});

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
  const pageSize = req.query.limit || 25;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * pageSize;
  let query = { type: { $ne: "openingBalance" } };

  if (req.query.keyword) {
    query.$or = [
      { name: { $regex: req.query.keyword, $options: "i" } },
      { qr: { $regex: req.query.keyword, $options: "i" } },
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

  const { id } = req.params;
  const ProductInvoices = await PurchaseInvoicesModel.findById(id)
    .populate({
      path: "invoicesItems.taxId",
      select: "tax",
    })
    .populate({
      path: "employee",
      select: "name profileImg email phone",
    });

  if (!ProductInvoices) {
    return next(new ApiError(`No ProductInvoices for this id ${id}`, 404));
  }
  res.status(200).json({ status: "true", data: ProductInvoices });
});

exports.updateInvoices = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const productModel = db.model("Product", productSchema);
  db.model("Tax", TaxSchema);
  db.model("Currency", currencySchema);
  db.model("Employee", emoloyeeShcema);
  db.model("Category", categorySchema);
  db.model("brand", brandSchema);
  db.model("Labels", labelsSchema);
  db.model("Unit", UnitSchema);
  db.model("Variant", variantSchema);

  const supplier = db.model("Supplier", supplierSchema);
  const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
  const ReportsFinancialFundsModel = db.model(
    "ReportsFinancialFunds",
    reportsFinancialFundsSchema
  );
  const PurchaseInvoicesModel = db.model(
    "PurchaseInvoices",
    PurchaseInvoicesSchema
  );
  const { id } = req.params;
  if (req.body.paid == "paid") {
    const {
      financialFund,
      finalPrice,
      finalPriceExchangeRate,
      finalPriceMainCurrency,
    } = req.body;
    // Find the financial fund
    const existingFinancialFund = await FinancialFundsModel.findById(
      financialFund
    );
    if (!existingFinancialFund) {
      return next(new ApiError(`Financial fund not found`, 404));
    }

    // Find the purchase invoice
    const existingInvoice = await PurchaseInvoicesModel.findById(id);
    const oldInvoice = existingInvoice;
    if (!existingInvoice) {
      return next(new ApiError(`Purchase invoice not found`, 404));
    }

    const supplierId = await supplier.findById(req.body.suppliers);
    // Update the financial fund balance
    existingFinancialFund.fundBalance -= finalPriceExchangeRate;
    supplierId.TotalUnpaid += req.body.beforTotal;
    supplierId.total += req.body.beforTotal;
    await supplierId.save();
    console.log(req.body.beforTotal);
    await existingFinancialFund.save();

    // Update the purchase invoice
    const updatedInvoice = await PurchaseInvoicesModel.findByIdAndUpdate(
      id,
      {
        ...req.body,
        paid: req.body.paid,
      },
      { new: true }
    );

    bulkOption = req.body.invoices.map((item) => ({
      updateOne: {
        filter: { _id: item.product },
        update: {
          $inc: {
            quantity: item.beforQuantity
              ? +item.quantity - item.beforQuantity
              : +item.quantity,
            activeCount: item.beforQuantity
              ? +item.quantity - item.beforQuantity
              : +item.quantity,
          },
          $set: {
            serialNumber: item.serialNumber,
            buyingprice: item.buyingpriceOringal,
            tax: item.taxId,
            price: item.price,
            taxPrice: item.taxPrice,
          },
        },
      },
    }));
    try {
      await productModel.bulkWrite(bulkOption, {});
      // Create a financial record
      const data = new Date();
      const isaaaa = data.toISOString();
      await ReportsFinancialFundsModel.create({
        date: isaaaa,
        invoice: updatedInvoice._id,
        // amount: finalPrice,
        amount: finalPrice,
        exchangeRate: req.body.invoiceCurrencyExchangeRate,
        finalPriceMainCurrency: finalPriceMainCurrency,
        type: "purchase",
        financialFundId: existingFinancialFund._id,
        financialFundRest: existingFinancialFund.fundBalance,
      });

      try {
        const ActiveProductsValue = db.model(
          "ActiveProductsValue",
          ActiveProductsValueModel
        );

        const currencyDiffs = {};

        for (const updatedItem of updatedInvoice.invoices) {
          const existingItem = oldInvoice.invoices.find((item) =>
            item._id.equals(updatedItem._id)
          );

          if (existingItem) {
            const quantityDiff = updatedItem.quantity - existingItem.quantity;
            const valueDiff =
              Number(updatedItem.totalPrice) - Number(existingItem.totalPrice);

            // Fetch the product to get the currency ID
            const product = await productModel.findOne({ qr: updatedItem.qr });

            if (product) {
              const currencyId = product.currency._id;

              if (!currencyDiffs[currencyId]) {
                currencyDiffs[currencyId] = {
                  totalCountDiff: 0,
                  totalValueDiff: 0,
                };
              }

              currencyDiffs[currencyId].totalCountDiff += quantityDiff;
              currencyDiffs[currencyId].totalValueDiff += valueDiff;
            } else {
              console.warn(`Product with QR ${updatedItem.qr} not found.`);
            }
          }
        }

        for (const currencyId in currencyDiffs) {
          if (currencyDiffs.hasOwnProperty(currencyId)) {
            const { totalCountDiff, totalValueDiff } =
              currencyDiffs[currencyId];
            const existingRecord = await ActiveProductsValue.findOne({
              currency: currencyId,
            });

            if (existingRecord) {
              existingRecord.activeProductsCount += totalCountDiff;
              existingRecord.activeProductsValue += totalValueDiff;
              await existingRecord.save();
            } else {
              await createActiveProductsValue(
                totalCountDiff,
                totalValueDiff,
                currencyId,
                dbName
              );
            }
          }
        }
      } catch (err) {
        console.log("purchaseInvoicesServices 530");
        console.log(err.message);
      }

      req.body.invoices.map(async (item) => {
        const { quantity } = await productModel.findOne({ qr: item.qr });
        createProductMovement(
          item.product,
          quantity,
          item.quantity - item.beforQuantity,
          "edit",
          "updatepurchase",
          dbName
        );
      });

      const history = createInvoiceHistory(
        dbName,
        updatedInvoice._id,
        "edit",
        req.user._id
      );

      // Respond with the updated invoice
      res
        .status(200)
        .json({ status: "success", data: updatedInvoice, history });
    } catch (error) {
      return new ApiError(
        `Error updating purchase invoice: ${error.message}`,
        500
      );
    }
  } else {
    let bulkOption;
    // Find the purchase invoice
    const existingInvoice = await PurchaseInvoicesModel.findById(id);
    const oldInvoice = existingInvoice;

    if (!existingInvoice) {
      return next(new ApiError(`Purchase invoice not found`, 404));
    }
    const supplierId = await supplier.findById(req.body.suppliers);
    supplierId.TotalUnpaid -= req.body.finalPriceBefor;
    supplierId.TotalUnpaid += req.body.finalPriceAfter;
    supplierId.total -= req.body.finalPriceBefor;
    supplierId.total += req.body.finalPriceAfter;
    existingInvoice.totalRemainderMainCurrency -=
      req.body.finalPriceMainCurrency;
    existingInvoice.totalRemainder -= req.body.finalPrice;
    await supplierId.save();
    await existingInvoice.save();
    // Update the purchase invoice
    const updatedInvoice = await PurchaseInvoicesModel.findByIdAndUpdate(
      id,
      {
        ...req.body,
        paid: req.body.paid,
      },
      { new: true }
    );

    bulkOption = req.body.invoices.map((item) => ({
      updateOne: {
        filter: { _id: item.product },
        update: {
          $inc: {
            quantity: item.beforQuantity
              ? +item.quantity - item.beforQuantity
              : +item.quantity,
            activeCount: item.beforQuantity
              ? +item.quantity - item.beforQuantity
              : +item.quantity,
          },
          $set: {
            serialNumber: item.serialNumber,
            buyingprice: item.buyingpriceOringal,
            tax: item.taxId,
            price: item.price,
            taxPrice: item.taxPrice,
          },
        },
      },
    }));
    try {
      await productModel.bulkWrite(bulkOption, {});
      req.body.invoices.map(async (item) => {
        const { quantity } = await productModel.findOne({ qr: item.qr });
        createProductMovement(
          item.product,
          quantity,
          item.quantity,
          "in",
          "updatepurchase",
          dbName,
          next
        );
      });

      try {
        const ActiveProductsValue = db.model(
          "ActiveProductsValue",
          ActiveProductsValueModel
        );
        const existingRecord = await ActiveProductsValue.findOne();
        let totalCountDiff = 0;
        let totalValueDiff = 0;

        updatedInvoice.invoices.forEach((updatedItem) => {
          const existingItem = oldInvoice.invoices.find((item) =>
            item.product.equals(updatedItem.product)
          );

          if (existingItem) {
            const quantityDiff = updatedItem.quantity - existingItem.quantity;
            const valueDiff =
              Number(updatedItem.totalPrice) - Number(existingItem.totalPrice);

            totalCountDiff += quantityDiff;
            totalValueDiff += valueDiff;
          }
        });

        if (existingRecord) {
          existingRecord.activeProductsCount += totalCountDiff;
          existingRecord.activeProductsValue += totalValueDiff;
          await existingRecord.save();
        } else {
          await createActiveProductsValue(
            totalCountDiff,
            totalValueDiff,
            dbName
          );
        }
      } catch (err) {
        console.log("purchaseInvoicesServices 638");
        console.log(err.message);
      }
      const history = createInvoiceHistory(
        dbName,
        updatedInvoice._id,
        "edit",
        req.user._id
      );

      res
        .status(200)
        .json({ status: "success", data: updatedInvoice, history });
    } catch (error) {
      return new ApiError(
        `Error updating purchase invoice: ${error.message}`,
        500
      );
    }
  }
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
    suppliersId,
    invoicesItems,
    priceExchangeRate,
    onefinancialFunds,
    totalPurchasePrice,
    description,
    paid,
    currencyCode,
    exchangeRate,
    supplierName,
    supplierPhone,
    supplierEmail,
    supplierAddress,
    supplierCompany,
    pricePurchaseInvocie,
    fundPricePurchaseInvocie,
    totalPurchasePriceMainCurrency,
    currencyId,
    invoiceNumber,
    totalPurchasePriceMainCurrencyBefor,
    date,
  } = req.body;

  const originalItems = purchase.invoicesItems;
  const updatedItems = req.body.invoicesItems;
  const bulkStockUpdates = [];
  const bulkProductUpdatesOriginal = [];
  const bulkProductUpdatesNew = [];
  const ReportsFinancialFundsModel = db.model(
    "ReportsFinancialFunds",
    reportsFinancialFundsSchema
  );

  if (purchase.payments.length <= 0) {
    // Reverting the quantities of original items
    originalItems.forEach((item) => {
      bulkProductUpdatesOriginal.push({
        updateOne: {
          filter: { qr: item.qr },
          update: {
            $inc: { quantity: -item.quantity, activeCount: -item.quantity },
          },
        },
      });
      bulkStockUpdates.push({
        updateOne: {
          filter: { qr: item.qr, "stocks.stockId": item.stockId },
          update: {
            $inc: { "stocks.$.productQuantity": -item.quantity },
          },
        },
      });
    });

    // Applying the quantities of updated items
    updatedItems.forEach((item) => {
      bulkProductUpdatesNew.push({
        updateOne: {
          filter: { qr: item.qr },
          update: {
            $inc: { quantity: +item.quantity, activeCount: +item.quantity },
            $set: { buyingprice: item.buyingPrice },
          },
        },
      });
      bulkStockUpdates.push({
        updateOne: {
          filter: { qr: item.qr, "stocks.stockId": item.stockId },
          update: {
            $inc: { "stocks.$.productQuantity": +item.quantity },
          },
        },
      });
    });

    try {
      await productModel.bulkWrite(bulkProductUpdatesOriginal);
      await productModel.bulkWrite(bulkProductUpdatesNew);
      await productModel.bulkWrite(bulkStockUpdates);
    } catch (error) {
      console.error("Error during bulk updates:", error);
      return next(new ApiError("Bulk update failed" + error, 500));
    }

    const purchaseSupplier = await SupplierModel.findById(purchase.suppliersId);
    const supplier = await SupplierModel.findById(suppliersId);

    if (paid === "paid") {
      const financialFund = await FinancialFundsModel.findById(
        onefinancialFunds
      );
      financialFund.fundBalance -= fundPricePurchaseInvocie;

      const newInvoiceData = {
        employee: req.user._id,
        invoicesItems: invoicesItems,
        date: date || formattedDate,
        suppliersId,
        supplierName,
        supplierPhone,
        supplierEmail,
        supplierAddress,
        supplierCompany,
        addedValue: req.body.addedValue,
        currencyCode,
        exchangeRate,
        priceExchangeRate,
        onefinancialFunds,
        paid: "paid",
        totalPurchasePrice,
        description,
        totalPurchasePriceMainCurrency,
        currencyId,
      };
      newPurchaseInvoice = await PurchaseInvoicesModel.updateOne(
        { _id: id },
        newInvoiceData
      );
      const reports = await ReportsFinancialFundsModel.create({
        date: date || formattedDate,
        invoice: newPurchaseInvoice._id,
        amount: fundPricePurchaseInvocie,
        type: "purchase",
        exchangeRate: exchangeRate,
        exchangeAmount: totalPurchasePriceMainCurrency,
        financialFundId: onefinancialFunds,
        financialFundRest: financialFund.fundBalance,
      });
      purchase.payments.push({
        payment: totalPurchasePriceMainCurrency,
        paymentMainCurrency: fundPricePurchaseInvocie,
        financialFunds: financialFund.fundName,
        date: date || formattedDate,
      });
      purchase.reportsBalanceId = reports.id;
      await purchase.save();
      await financialFund.save();
      paymentText = "payment-sup";

      await paymentModel.create({
        supplierId: suppliersId,
        supplierName: supplier,
        total: totalPurchasePrice,
        totalMainCurrency: totalPurchasePriceMainCurrency,
        exchangeRate: financialFund.fundCurrency.exchangeRate,
        currencyCode: currencyCode,
        date: date,
        invoiceNumber: invoiceNumber,
        counter: nextCounterPayment,
      });

      if (suppliersId === purchase.suppliersId) {
        supplier.total +=
          totalPurchasePriceMainCurrency - totalPurchasePriceMainCurrencyBefor;
      } else {
        purchaseSupplier.total -= totalPurchasePriceMainCurrencyBefor;
        await purchaseSupplier.save();
        supplier.total += totalPurchasePriceMainCurrency;
      }
      await supplier.save();
    } 
    else {
      if (suppliersId === purchase.suppliersId) {
        supplier.TotalUnpaid +=
          totalPurchasePriceMainCurrency - totalPurchasePriceMainCurrencyBefor;
        supplier.total +=
          totalPurchasePriceMainCurrency - totalPurchasePriceMainCurrencyBefor;
      } else {
        purchaseSupplier.total -= totalPurchasePriceMainCurrencyBefor;
        purchaseSupplier.TotalUnpaid -= totalPurchasePriceMainCurrencyBefor;
        await purchaseSupplier.save();
        supplier.total += totalPurchasePriceMainCurrency;
        supplier.TotalUnpaid += totalPurchasePriceMainCurrency;
      }
      await supplier.save();

      const newInvoiceData = {
        employee: req.user._id,
        date: date || formattedDate,
        invoicesItems: invoicesItems,
        suppliersId,
        supplierName,
        supplierPhone,
        supplierEmail,
        supplierAddress,
        supplierCompany,
        addedValue: req.body.addedValue,
        currencyCode,
        exchangeRate,
        priceExchangeRate,
        onefinancialFunds,
        invoiceNumber: invoiceNumber,
        paid: "unpaid",
        totalPurchasePrice,
        totalRemainder: totalPurchasePrice,
        totalPurchasePriceMainCurrency,
        totalRemainderMainCurrency: totalPurchasePriceMainCurrency,
        description,
        currencyId,
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
      suppliersId,
      invoiceNumber,
      dbName
    );

    if (paid === "paid") {
      await createPaymentHistory(
        "payment",
        date || formattedDate,
        totalPurchasePriceMainCurrency,
        supplier.TotalUnpaid,
        "supplier",
        suppliersId,
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

exports.returnPurchaseInvoice = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const productModel = db.model("Product", productSchema);
  const returnModel = db.model(
    "ReturenPurchaseInvoice",
    returnPurchaseInvicesSchema
  );
  const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
  const ReportsFinancialFundsModel = db.model(
    "ReportsFinancialFunds",
    reportsFinancialFundsSchema
  );
  const suppl = db.model("Supplier", supplierSchema);
  db.model("Currency", currencySchema);
  db.model("Employee", emoloyeeShcema);
  db.model("Category", categorySchema);
  db.model("brand", brandSchema);
  db.model("Labels", labelsSchema);
  db.model("Tax", TaxSchema);
  db.model("Unit", UnitSchema);
  db.model("Variant", variantSchema);
  db.model("Currency", currencySchema);
  db.model("PurchaseInvoices", PurchaseInvoicesSchema);
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
  } = req.body;
  const invoiceFinancialFund = req.body.invoiceFinancialFund;

  const invoiceItems = [];

  const nextCounter = (await returnModel.countDocuments()) + 1;

  for (const item of invoices) {
    const { quantity, qr, buyingprice, taxRate, exchangeRate } = item;

    // Find the product based on the  QR code
    const productDoc = await productModel.findOne({ qr: item.qr });
    if (!productDoc) {
      console.log(`Product not found for QR code: ${qr}`);
      continue;
    }
    if (productDoc.quantity <= quantity) {
      console.log(`Insufficient quantity for product with QR test code: ${qr}`);
      return res.status(400).json({
        status: "error",
        message: `Insufficient quantity for product with QR code: ${qr}`,
      });
    }
    // Create an invoice item
    const invoiceItem = {
      product: productDoc._id,
      name: productDoc.name,
      quantity,
      qr,
      taxRate,
      buyingprice: buyingprice,
      exchangeRate,
    };
    invoiceItems.push(invoiceItem);
  }

  let bulkOption;
  const financialFund = await FinancialFundsModel.findById(
    invoiceFinancialFund
  );
  // Create a new purchase invoice with all the invoice items
  const newPurchaseInvoice = new returnModel({
    invoices: invoiceItems,
    paidAt: formattedDate,
    suppliers: suppliersId,
    supplier: sup,
    supplierPhone,
    supplierEmail,
    supplierAddress,
    supplierCompany,
    finalPriceMainCurrency: finalPriceMainCurrency,
    priceExchangeRate: priceExchangeRate,
    totalPriceWitheOutTax: totalPriceWitheOutTax,
    totalbuyingprice: totalbuyingprice,
    finalPrice: finalPrice,
    totalQuantity: totalQuantity,
    employee: req.user._id,
    invoiceCurrencyId,
    invoiceCurrency,
    totalPurchasePrice: req.body.totalPurchasePrice,
    invoiceNumber: nextCounter,
  });
  bulkOption = invoiceItems.map((item) => ({
    updateOne: {
      filter: { _id: item.product },
      update: {
        $inc: { quantity: -item.quantity, activeCount: -item.quantity },
      },
    },
  }));
  await productModel.bulkWrite(bulkOption, {});

  const supplier = await suppl.findById(suppliersId);

  invoiceItems.forEach((newInvoiceItem) => {
    const existingProductIndex = supplier.products.findIndex(
      (existingProduct) => existingProduct.qr === newInvoiceItem.qr
    );
    if (existingProductIndex !== -1) {
      // If the product already exists, increment its quantity
      supplier.products[existingProductIndex].quantity -=
        newInvoiceItem.quantity;
    }
  });
  await supplier.save();
  const data = new Date();
  const isaaaa = data.toISOString();
  const savedInvoice = await newPurchaseInvoice.save();

  if (paid !== "unpaid") {
    financialFund.fundBalance += priceExchangeRate;
    await ReportsFinancialFundsModel.create({
      date: isaaaa,
      invoice: savedInvoice._id,
      amount: priceExchangeRate,
      type: "refund-purchase",
      exchangeRate: priceExchangeRate * req.body.financailFundExchangeRate,
      finalPriceMainCurrency: finalPriceMainCurrency,
      financialFundId: invoiceFinancialFund,
      financialFundRest: financialFund.fundBalance,
    });
    // Respond with the created invoice
    await financialFund.save();
  }

  invoiceItems.map(async (item) => {
    const { quantity } = await productModel.findOne({ qr: item.qr });
    createProductMovement(
      item.product,
      quantity,
      item.quantity,
      "out",
      "pruchaseReturn",
      dbName
    );
  });

  try {
    const ActiveProductsValue = db.model(
      "ActiveProductsValue",
      ActiveProductsValueModel
    );
    const currencyTotals = {};
    for (const item of invoiceItems) {
      try {
        const product = await productModel.findOne({ qr: item.qr });
        if (product) {
          const currencyId = product.currency._id;
          if (!currencyTotals[currencyId]) {
            currencyTotals[currencyId] = { totalCount: 0, totalValue: 0 };
          }
          // Calculate the total value considering the exchange rate and quantity
          currencyTotals[currencyId].totalValue +=
            (item.buyingprice / item.exchangeRate) * item.quantity;
          currencyTotals[currencyId].totalCount += item.quantity;
        } else {
          console.warn(`Product with QR ${item.qr} not found.`);
        }
      } catch (err) {
        console.error(`Error finding product with QR ${item.qr}:`, err.message);
      }
    }

    for (const currencyId in currencyTotals) {
      if (currencyTotals.hasOwnProperty(currencyId)) {
        const { totalCount, totalValue } = currencyTotals[currencyId];
        const existingRecord = await ActiveProductsValue.findOne({
          currency: currencyId,
        });

        if (existingRecord) {
          existingRecord.activeProductsCount -= totalCount;
          existingRecord.activeProductsValue -= totalValue;
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
    }
  } catch (err) {
    console.log("purchaseInvoicesServices 844");
    console.log(err.message);
  }

  const history = createInvoiceHistory(
    dbName,
    savedInvoice._id,
    "return",
    req.user._id
  );

  res.status(201).json({ status: "success", data: savedInvoice, history });
});

exports.getReturnPurchase = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);

  db.model("Employee", emoloyeeShcema);
  db.model("Tax", TaxSchema);
  db.model("Supplier", supplierSchema);
  db.model("FinancialFunds", financialFundsSchema);
  db.model("Currency", currencySchema);
  const returnModel = db.model(
    "ReturenPurchaseInvoice",
    returnPurchaseInvicesSchema
  );

  const { totalPages, mongooseQuery } = Search(returnModel, req);

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
    "ReturenPurchaseInvoice",
    returnPurchaseInvicesSchema
  );

  const { id } = req.params;
  const order = await returnModel.findById(id);
  if (!order) {
    return next(new ApiError(`No order for this id ${id}`, 404));
  }
  res.status(200).json({ status: "true", data: order });
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
  db.model("Stock", stockSchema);

  const { id } = req.params;

  // 1) find prucseInvices
  const purchaseInvoices = await PurchaseInvoicesModel.findById(id);
  const supplier = await SupplierModel.findOne({
    _id: purchaseInvoices.suppliersId,
  });

  if (
    purchaseInvoices.payments.length <= 0 &&
    purchaseInvoices.type !== "cancel"
  ) {
    try {
      // 2) Take Out the Quantity
      const bulkProductUpdates = purchaseInvoices.invoicesItems.map((item) => ({
        updateOne: {
          filter: { qr: item.qr },
          update: {
            $inc: { quantity: -item.quantity, activeCount: -item.quantity },
          },
        },
      }));
      await ProductModel.bulkWrite(bulkProductUpdates);
      const bulkStockUpdates = [];
      purchaseInvoices.invoicesItems.forEach((item) => {
        bulkStockUpdates.push({
          updateOne: {
            filter: { qr: item.qr, "stocks.stockId": item.stockId },
            update: {
              $inc: { "stocks.$.productQuantity": -item.quantity },
            },
          },
        });
      });
      await ProductModel.bulkWrite(bulkStockUpdates);
      // 3) Take out in the Active Quantity
      purchaseInvoices.invoicesItems.map(async (item) => {
        const product = await ProductModel.findOne({ qr: item.qr });
        if (product && product.type !== "Service") {
          const existingRecord = await ActiveProductsValue.findOne({
            currency: product.currency._id,
          });
          if (existingRecord) {
            existingRecord.activeProductsCount -= item.quantity;
            existingRecord.activeProductsValue -=
              item.buyingpriceOringal * item.quantity;
            await existingRecord.save();
          } else {
            await createActiveProductsValue(0, 0, product.currency._id, dbName);
          }
        }
      });

      // 4) minus Qunaityt in Supplier
      purchaseInvoices.invoicesItems.forEach((item) => {
        const existingProduct = supplier.products.find(
          (prod) => prod.qr === item.qr
        );

        if (existingProduct) {
          Object.assign(existingProduct, {
            quantity: existingProduct.quantity - item.quantity,
            buyingprice: item.buyingpriceOringal,
            exchangeRate: item.currency,
            taxRate: item.taxRate,
          });
        } else {
          supplier.products.push({
            product: item.product,
            qr: item.qr,
            name: item.name,
            buyingprice: item.buyingpriceOringal,
            quantity: -item.quantity,
            exchangeRate: item.currency,
            taxRate: item.taxRate,
          });
        }
      });
      // 5) minus balance form Fund and delete archives Reports in Supplier
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
      purchaseInvoices.type = "cancel";
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
