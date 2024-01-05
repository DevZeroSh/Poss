const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const productModel = require("../models/productModel");
const PurchaseInvoicesModel = require("../models/purchaseinvoicesModel");
const Supplier = require("../models/suppliersModel");
const FinancialFunds = require("../models/financialFundsModel");
const ReportsFinancialFundsModel = require("../models/reportsFinancialFunds");

exports.createProductInvoices = asyncHandler(async (req, res, next) => {
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
    sup,
    supplierPhone,
    supplierEmail,
    supplierAddress,
    supplierCompany,
    totalProductTax,
    totalPriceWitheOutTax,
    finalPrice,
    totalQuantity,
    totalbuyingprice,
    invoiceCurrency,
  } = req.body;

  const invoiceFinancialFund = req.body.invoiceFinancialFund;
  // Find the supplier

  // Create an array to store the invoice items
  const invoiceItems = [];
  let bulkOption;
  const financialFund = await FinancialFunds.findById(invoiceFinancialFund);
  for (const item of invoices) {
    const {
      quantity,
      qr,
      serialNumber,
      buyingprice,
      totalPrice,
      taxRate,
      taxPrice,
      totalTax,
    } = item;
    // Find the product based on the  QR code
    const productDoc = await productModel.findOne({ qr });
    console.log(taxRate);
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
      serialNumber: serialNumber,
      buyingprice: buyingprice,
      taxPrice: taxPrice,
      taxRate: taxRate.tax,
      ta: taxRate,
      totalTax: totalTax,
      totalPrice: totalPrice,
    };
    invoiceItems.push(invoiceItem);
  }
  bulkOption = invoiceItems.map((item) => ({
    updateOne: {
      filter: { _id: item.product },
      update: {
        $inc: { quantity: +item.quantity },
        $set: {
          serialNumber: item.serialNumber,
          buyingprice: item.buyingprice,
          tax: item.ta,
        },
      },
    },
  }));
  await productModel.bulkWrite(bulkOption, {});

  // Get the next counter value
  const nextCounter = (await PurchaseInvoicesModel.countDocuments()) + 1;
  // Create a new purchase invoice with all the invoice items
  const newPurchaseInvoice = new PurchaseInvoicesModel({
    invoices: invoiceItems,
    paidAt: formattedDate,
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
    employee: req.user._id,
    invoiceCurrency,
    counter: nextCounter,
  });

  const data = new Date();
  const isaaaa = data.toISOString();
  financialFund.fundBalance -= finalPrice;

  // Save the new purchase invoice to the database
  const savedInvoice = await newPurchaseInvoice.save();
  await ReportsFinancialFundsModel.create({
    date: isaaaa,
    invoice: savedInvoice._id,
    amount: finalPrice,
    type: "purchase",
    financialFundId: invoiceFinancialFund,
    financialFundRest: financialFund.fundBalance,
  });
  // Respond with the created invoice
  await financialFund.save();
  res.status(201).json({ status: "success", data: savedInvoice });
});

exports.findAllProductInvoices = asyncHandler(async (req, res, next) => {
  const ProductInvoices = await PurchaseInvoicesModel.find();
  res.status(200).json({
    status: "true",
    results: ProductInvoices.length,
    data: ProductInvoices,
  });
});

exports.findOneProductInvoices = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const ProductInvoices = await PurchaseInvoicesModel.findById(id);
  console.log(ProductInvoices);
  if (!ProductInvoices) {
    return next(new ApiError(`No ProductInvoices for this id ${id}`, 404));
  }
  res.status(200).json({ status: "true", data: ProductInvoices });
});

exports.updateInvoicesQuantity = asyncHandler(async (req, res, next) => {
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
