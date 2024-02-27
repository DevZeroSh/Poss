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
const { createProductMovement } = require("../utils/productMovement");

exports.createProductInvoices = asyncHandler(async (req, res, next) => {
    const dbName = req.query.databaseName;
    const db = mongoose.connection.useDb(dbName);
    const productModel = db.model("Product", productSchema);
    const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
    const ReportsFinancialFundsModel = db.model(
        "ReportsFinancialFunds",
        reportsFinancialFundsSchema
    );
    db.model("Supplier", supplierSchema);
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
        finalPriceExchangeRate,
        totalQuantity,
        totalbuyingprice,
        invoiceCurrencyId,
        invoiceCurrency,
        paid,
        finalPriceMainCurrency,
    } = req.body;

    const invoiceFinancialFund = req.body.invoiceFinancialFund;
    // Find the supplier

    // Create an array to store the invoice items
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
        } = item;
        // Find the product based on the  QR code
        const productDoc = await productModel.findOne({ qr });
        if (!productDoc) {
            console.log(`Product not found for QR code: ${qr}`);
            continue;
        }
        // Create an invoice item
        const invoiceItem = {
            product: productDoc._id,
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
        try {
            await productModel.bulkWrite(bulkOption, {});

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
                createProductMovement(
                    item.product,
                    quantity,
                    item.quantity,
                    "in",
                    "purchase",
                    dbName
                );
            });

            res.status(201).json({
                status: "success",
                data: savedInvoice,
                movement: savedMovement,
            });
        } catch (error) {
            return new ApiError(`Error creating paid purchase invoice: ${error.message}`, 500);
        }
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
            totalQuantity: totalQuantity,
            employee: req.user._id,
            invoiceCurrencyId,
            invoiceCurrency,
            counter: nextCounter,
        });
        bulkOption = invoiceItems.map((item) => ({
            updateOne: {
                filter: { _id: item.product },
                update: {
                    $inc: { quantity: item.quantity },
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
            const savedInvoice = await newPurchaseInvoice.save();

            invoiceItems.map(async (item) => {
                const { quantity } = await productModel.findOne({ qr: item.qr });
                createProductMovement(
                    item.product,
                    quantity,
                    item.quantity,
                    "in",
                    "purchase",
                    dbName
                );
            });

            res.status(201).json({
                status: "success",
                data: savedInvoice,
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

    const pageSize = 20;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * pageSize;

    // Define the match pipeline based on the search conditions
    const matchPipeline = [{ $match: { archives: { $ne: true } } }];

    if (req.query.keyword) {
        matchPipeline.push({
            $match: {
                $or: [
                    { name: { $regex: req.query.keyword, $options: "i" } },
                    { supplierName: { $regex: req.query.keyword, $options: "i" } },
                    { counter: { $regex: req.query.keyword, $options: "i" } },
                    { discountName: { $regex: req.query.keyword, $options: "i" } },
                ],
            },
        });
    }

    // Add the sort and pagination stages
    matchPipeline.push({ $sort: { createdAt: -1 } }, { $skip: skip }, { $limit: pageSize });

    // Execute the aggregation pipeline
    const aggregationResult = await PurchaseInvoicesModel.aggregate(matchPipeline);

    // Count total items without pagination
    const totalItems = await PurchaseInvoicesModel.countDocuments();

    // Calculate total pages
    const totalPages = Math.ceil(totalItems / pageSize);

    res.status(200).json({
        status: "true",
        Pages: totalPages,
        results: aggregationResult.length,
        data: aggregationResult,
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

    const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
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
    db.model("Tax", TaxSchema);
    const productModel = db.model("Product", productSchema);
    db.model("Supplier", supplierSchema);
    db.model("Currency", currencySchema);
    db.model("Employee", emoloyeeShcema);
    db.model("Category", categorySchema);
    db.model("brand", brandSchema);
    db.model("Labels", labelsSchema);
    db.model("Unit", UnitSchema);
    db.model("Variant", variantSchema);

    const FinancialFundsModel = db.model("FinancialFunds", financialFundsSchema);
    const ReportsFinancialFundsModel = db.model(
        "ReportsFinancialFunds",
        reportsFinancialFundsSchema
    );
    const PurchaseInvoicesModel = db.model("PurchaseInvoices", PurchaseInvoicesSchema);
    const { id } = req.params;
    if (req.body.paid == "paid") {
        const { financialFund, finalPrice, finalPriceExchangeRate, finalPriceMainCurrency } =
            req.body;

        // Find the financial fund
        const existingFinancialFund = await FinancialFundsModel.findById(financialFund);
        if (!existingFinancialFund) {
            return next(new ApiError(`Financial fund not found`, 404));
        }

        // Find the purchase invoice
        const existingInvoice = await PurchaseInvoicesModel.findById(id);
        if (!existingInvoice) {
            return next(new ApiError(`Purchase invoice not found`, 404));
        }

        // Update the financial fund balance
        existingFinancialFund.fundBalance -= finalPriceExchangeRate;
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
            // Respond with the updated invoice
            res.status(200).json({ status: "success", data: updatedInvoice });
        } catch (error) {
            return new ApiError(`Error updating purchase invoice: ${error.message}`, 500);
        }
    } else {
        let bulkOption;
        // Find the purchase invoice
        const existingInvoice = await PurchaseInvoicesModel.findById(id);
        if (!existingInvoice) {
            return next(new ApiError(`Purchase invoice not found`, 404));
        }

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
            // Respond with the updated invoice
            res.status(200).json({ status: "success", data: updatedInvoice });
        } catch (error) {
            return new ApiError(`Error updating purchase invoice: ${error.message}`, 500);
        }
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
