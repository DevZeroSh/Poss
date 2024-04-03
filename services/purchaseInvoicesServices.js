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

exports.createProductInvoices = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const productModel = db.model("Product", productSchema);
  const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
  const ReportsFinancialFundsModel = db.model("ReportsFinancialFunds", reportsFinancialFundsSchema);
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
  const PurchaseInvoicesModel = db.model("PurchaseInvoices", PurchaseInvoicesSchema);

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
    year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds;

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
    const financialFund = await FinancialFundsModel.findById(invoiceFinancialFund);

    // Get the next counter value

    // Create a new purchase invoice with all the invoice items
    const newPurchaseInvoice = new PurchaseInvoicesModel({
      invoices: invoiceItems,
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
      counter: nextCounter,
      paid: paid,
    });

    bulkOption = invoiceItems.map((item) => ({
      updateOne: {
        filter: { _id: item.product },
        update: {
          $inc: { quantity: +item.quantity, activeCount: +item.quantity },
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
    await productModel.bulkWrite(bulkOption, {});

    const supplier = await suppl.findById(suppliersId);

    // Loop through each item in the invoiceItems array
    invoiceItems.forEach((newInvoiceItem) => {
      const existingProductIndex = supplier.products.findIndex(
        (existingProduct) => existingProduct.qr === newInvoiceItem.qr
      );

      if (existingProductIndex !== -1) {
        supplier.products[existingProductIndex].quantity += newInvoiceItem.quantity;
        supplier.products[existingProductIndex].buyingprice = newInvoiceItem.buyingpriceOringal;
        supplier.products[existingProductIndex].exchangeRate = newInvoiceItem.buyingprice;
        supplier.products[existingProductIndex].taxRate = newInvoiceItem.taxRate;
        supplier.products[existingProductIndex].exchangeRate = newInvoiceItem.currency;
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
    await ReportsFinancialFundsModel.create({
      date: isaaaa,
      invoice: savedInvoice._id,
      amount: finalPrice,
      type: "purchase",
      exchangeRate: finalPriceExchangeRate,
      finalPriceMainCurrency: finalPriceMainCurrency,
      financialFundId: invoiceFinancialFund,
      financialFundRest: financialFund.fundBalance,
    });
    // Respond with the created invoice
    await financialFund.save();

    invoiceItems.map(async (item) => {
      const { quantity } = await productModel.findOne({ qr: item.qr });
      createProductMovement(item.product, quantity, item.quantity, "in", "purchase", dbName);
    });

    try {
      const ActiveProductsValue = db.model("ActiveProductsValue", ActiveProductsValueModel);
      const existingRecord = await ActiveProductsValue.findOne();
      let totalCount = 0;
      let totalValue = 0;
      newPurchaseInvoice.invoices.map((item) => {
        totalValue += Number(item.totalPrice) * item.currency;
        totalCount += item.quantity;
      });

      if (existingRecord) {
        existingRecord.activeProductsCount += totalCount;
        existingRecord.activeProductsValue += totalValue;
        await existingRecord.save();
      } else {
        await createActiveProductsValue(totalCount, totalValue, dbName);
      }
    } catch (err) {
      console.log("purchaseInvoicesServices 248");
      console.log(err.message);
    }

    const history = createInvoiceHistory(dbName, savedInvoice._id, "create", req.user._id);

    res.status(201).json({ status: "success", data: savedInvoice, history });
  } else {
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
      counter: nextCounter,
    });
    bulkOption = invoiceItems.map((item) => ({
      updateOne: {
        filter: { _id: item.product },
        update: {
          $inc: { quantity: item.quantity, activeCount: +item.quantity },
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
    const supplier = await suppl.findById(suppliersId);
    supplier.total += req.body.finalPricetest;
    supplier.TotalUnpaid += req.body.finalPricetest;
    // Loop through each item in the invoiceItems array
    invoiceItems.forEach((newInvoiceItem) => {
      const existingProductIndex = supplier.products.findIndex(
        (existingProduct) => existingProduct.product === newInvoiceItem.product
      );

      if (existingProductIndex !== -1) {
        // If the product already exists, increment its quantity
        supplier.products[existingProductIndex].quantity += newInvoiceItem.quantity;
      } else {
        // If the product doesn't exist, add it to the prodcuts array
        supplier.products.push({
          product: newInvoiceItem.product,
          quantity: newInvoiceItem.quantity,
        });
      }
    });

    try {
      // Save the updated supplier
      await supplier.save();
      await productModel.bulkWrite(bulkOption, {});
      const savedInvoice = await newPurchaseInvoice.save();

      invoiceItems.map(async (item) => {
        const { quantity } = await productModel.findOne({ qr: item.qr });
        createProductMovement(item.product, quantity, item.quantity, "in", "purchase", dbName);
      });
      try {
        const ActiveProductsValue = db.model("ActiveProductsValue", ActiveProductsValueModel);
        const existingRecord = await ActiveProductsValue.findOne();
        let totalCount = 0;
        let totalValue = 0;
        newPurchaseInvoice.invoices.map((item) => {
          totalValue += Number(item.totalPrice) * item.currency;
          totalCount += item.quantity;
        });

        if (existingRecord) {
          existingRecord.activeProductsCount += totalCount;
          existingRecord.activeProductsValue += totalValue;
          await existingRecord.save();
        } else {
          await createActiveProductsValue(totalCount, totalValue, dbName);
        }
      } catch (err) {
        console.log("purchaseInvoicesServices 343");
        console.log(err.message);
      }

      const history = createInvoiceHistory(dbName, savedInvoice._id, "create", req.user._id);

      res.status(201).json({
        status: "success",
        data: savedInvoice,
        history,
      });
    } catch (error) {
      console.log(error.message);
      return new ApiError(`Error creating unpaid purchase invoice: ${error.message}`, 500);
    }
  }
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

  const PurchaseInvoicesModel = db.model("PurchaseInvoices", PurchaseInvoicesSchema);
  const { totalPages, mongooseQuery } = await Search(PurchaseInvoicesModel, req);

  const purchaseInvoices = await mongooseQuery;

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
  db.model("Category", categorySchema);
  db.model("brand", brandSchema);
  db.model("Labels", labelsSchema);
  db.model("Unit", UnitSchema);
  db.model("Variant", variantSchema);
  db.model("Tax", TaxSchema);
  db.model("Product", productSchema);
  db.model("FinancialFunds", financialFundsSchema);
  const PurchaseInvoicesModel = db.model("PurchaseInvoices", PurchaseInvoicesSchema);

  const { id } = req.params;
  const ProductInvoices = await PurchaseInvoicesModel.findById(id);

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
  const ReportsFinancialFundsModel = db.model("ReportsFinancialFunds", reportsFinancialFundsSchema);
  const PurchaseInvoicesModel = db.model("PurchaseInvoices", PurchaseInvoicesSchema);
  const { id } = req.params;
  if (req.body.paid == "paid") {
    const { financialFund, finalPrice, finalPriceExchangeRate, finalPriceMainCurrency } = req.body;

    // Find the financial fund
    const existingFinancialFund = await FinancialFundsModel.findById(financialFund);
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
    supplierId.TotalUnpaid -= finalPriceMainCurrency;
    await supplierId.save();

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
            quantity: item.quantity - item.beforQuantity,
            activeCount: item.quantity - item.beforQuantity,
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
        amount: finalPriceExchangeRate,
        exchangeRate: finalPrice,
        finalPriceMainCurrency: finalPriceMainCurrency,
        type: "purchase",
        financialFundId: existingFinancialFund._id,
        financialFundRest: existingFinancialFund.fundBalance,
      });

      try {
        const ActiveProductsValue = db.model("ActiveProductsValue", ActiveProductsValueModel);
        const existingRecord = await ActiveProductsValue.findOne();
        let totalCountDiff = 0;
        let totalValueDiff = 0;

        updatedInvoice.invoices.forEach((updatedItem) => {
          const existingItem = oldInvoice.invoices.find((item) => item._id.equals(updatedItem._id));

          if (existingItem) {
            const quantityDiff = updatedItem.quantity - existingItem.quantity;
            const valueDiff = Number(updatedItem.totalPrice) - Number(existingItem.totalPrice);

            totalCountDiff += quantityDiff;
            totalValueDiff += valueDiff;
          }
        });

        if (existingRecord) {
          existingRecord.activeProductsCount += totalCountDiff;
          existingRecord.activeProductsValue += totalValueDiff;
          await existingRecord.save();
        } else {
          await createActiveProductsValue(totalCountDiff, totalValueDiff, dbName);
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

      const history = createInvoiceHistory(dbName, updatedInvoice._id, "edit", req.user._id);

      // Respond with the updated invoice
      res.status(200).json({ status: "success", data: updatedInvoice, history });
    } catch (error) {
      return new ApiError(`Error updating purchase invoice: ${error.message}`, 500);
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

    await supplierId.save();
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
            quantity: +item.quantity - item.beforQuantity,
            activeCount: +item.quantity - item.beforQuantity,
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
          dbName
        );
      });

      try {
        const ActiveProductsValue = db.model("ActiveProductsValue", ActiveProductsValueModel);
        const existingRecord = await ActiveProductsValue.findOne();
        let totalCountDiff = 0;
        let totalValueDiff = 0;

        updatedInvoice.invoices.forEach((updatedItem) => {
          const existingItem = oldInvoice.invoices.find((item) =>
            item.product.equals(updatedItem.product)
          );

          if (existingItem) {
            const quantityDiff = updatedItem.quantity - existingItem.quantity;
            const valueDiff = Number(updatedItem.totalPrice) - Number(existingItem.totalPrice);

            totalCountDiff += quantityDiff;
            totalValueDiff += valueDiff;
          }
        });

        if (existingRecord) {
          existingRecord.activeProductsCount += totalCountDiff;
          existingRecord.activeProductsValue += totalValueDiff;
          await existingRecord.save();
        } else {
          await createActiveProductsValue(totalCountDiff, totalValueDiff, dbName);
        }
      } catch (err) {
        console.log("purchaseInvoicesServices 638");
        console.log(err.message);
      }

      const history = createInvoiceHistory(dbName, updatedInvoice._id, "edit", req.user._id);

      res.status(200).json({ status: "success", data: updatedInvoice, history });
    } catch (error) {
      return new ApiError(`Error updating purchase invoice: ${error.message}`, 500);
    }
  }
});

exports.returnPurchaseInvoice = asyncHandler(async (req, res, next) => {
  const dbName = req.query.databaseName;
  const db = mongoose.connection.useDb(dbName);
  const productModel = db.model("Product", productSchema);
  const returnModel = db.model("ReturenPurchaseInvoice", returnPurchaseInvicesSchema);
  const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
  const ReportsFinancialFundsModel = db.model("ReportsFinancialFunds", reportsFinancialFundsSchema);
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
    year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds;

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
      exchangeRate,
    } = item;

    // Find the product based on the  QR code
    const productDoc = await productModel.findOne({ qr: item.qr });
    if (!productDoc) {
      console.log(`Product not found for QR code: ${qr}`);
      continue;
    }
    if (productDoc.quantity < quantity) {
      console.log(`Insufficient quantity for product with QR code: ${qr}`);
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
  const financialFund = await FinancialFundsModel.findById(invoiceFinancialFund);
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
    counter: nextCounter,
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
      supplier.products[existingProductIndex].quantity -= newInvoiceItem.quantity;
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
      type: "return",
      exchangeRate: priceExchangeRate,
      finalPriceMainCurrency: finalPriceMainCurrency,
      financialFundId: invoiceFinancialFund,
      financialFundRest: financialFund.fundBalance,
    });
    // Respond with the created invoice
    await financialFund.save();
  }

  invoiceItems.map(async (item) => {
    const { quantity } = await productModel.findOne({ qr: item.qr });
    createProductMovement(item.product, quantity, item.quantity, "out", "pruchaseReturn", dbName);
  });

  try {
    const ActiveProductsValue = db.model("ActiveProductsValue", ActiveProductsValueModel);
    const existingRecord = await ActiveProductsValue.findOne();
    let totalCount = 0;
    let totalValue = 0;
    invoiceItems.map((item) => {
      totalValue += item.buyingprice * item.exchangeRate * item.quantity;
      totalCount += item.quantity;
    });

    if (existingRecord) {
      existingRecord.activeProductsCount -= totalCount;
      existingRecord.activeProductsValue -= totalValue;
      await existingRecord.save();
    } else {
      await createActiveProductsValue(totalCount, totalValue, dbName);
    }
  } catch (err) {
    console.log("purchaseInvoicesServices 844");
    console.log(err.message);
  }

  const history = createInvoiceHistory(dbName, savedInvoice._id, "return", req.user._id);

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
  const returnModel = db.model("ReturenPurchaseInvoice", returnPurchaseInvicesSchema);

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
  const returnModel = db.model("ReturenPurchaseInvoice", returnPurchaseInvicesSchema);

  const { id } = req.params;
  const order = await returnModel.findById(id);
  if (!order) {
    return next(new ApiError(`No order for this id ${id}`, 404));
  }
  res.status(200).json({ status: "true", data: order });
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
